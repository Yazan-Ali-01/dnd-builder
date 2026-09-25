import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Frame } from '../types/block';
import { GRID_COLUMNS, MAX_ROWS, ROW_HEIGHT } from '../utils/constants';

export type DragMode = 'move' | 'resize';

interface Options {
  frame: Frame;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Pointer-driven move/resize on the 12-column grid.
 *
 * While the pointer is down nothing goes through React: the element is moved
 * by writing `transform` (move) or its grid span (resize) directly, at most
 * once per animation frame. The store receives a single action on release,
 * so a drag costs zero React renders until it commits, however many blocks
 * are on the board.
 */
export function useGridDrag(elementRef: RefObject<HTMLElement | null>, { frame, onMove, onResize }: Options) {
  // Latest values via refs so the returned handler is stable and a drag in
  // progress never sees a stale frame.
  const latest = useRef({ frame, onMove, onResize });
  useEffect(() => {
    latest.current = { frame, onMove, onResize };
  });

  const cancelActive = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelActive.current?.(), []);

  return useCallback(
    (event: ReactPointerEvent, mode: DragMode) => {
      const el = elementRef.current;
      const board = el?.parentElement;
      // One drag at a time; ignore secondary buttons and extra touch points.
      if (!el || !board || event.button !== 0 || !event.isPrimary || cancelActive.current) return;
      event.stopPropagation();

      const origin = latest.current.frame;
      const colWidth = board.getBoundingClientRect().width / GRID_COLUMNS;
      const startX = event.clientX;
      const startY = event.clientY;
      const pointerId = event.pointerId;
      const initialGridColumn = el.style.gridColumn;
      const initialGridRow = el.style.gridRow;

      let target = { ...origin };
      let pending: { x: number; y: number } | null = null;
      let raf = 0;

      const compute = (clientX: number, clientY: number) => {
        const dc = Math.round((clientX - startX) / colWidth);
        const dr = Math.round((clientY - startY) / ROW_HEIGHT);
        // Clamping here keeps the preview inside the board, so dragging
        // out of bounds pins the block to the edge instead of losing it.
        target =
          mode === 'move'
            ? {
                ...origin,
                x: clamp(origin.x + dc, 0, GRID_COLUMNS - origin.w),
                y: clamp(origin.y + dr, 0, MAX_ROWS - origin.h),
              }
            : {
                ...origin,
                w: clamp(origin.w + dc, 1, GRID_COLUMNS - origin.x),
                h: clamp(origin.h + dr, 1, MAX_ROWS - origin.y),
              };
      };

      const paint = () => {
        raf = 0;
        if (!pending) return;
        compute(pending.x, pending.y);
        pending = null;
        if (mode === 'move') {
          const dx = (target.x - origin.x) * colWidth;
          const dy = (target.y - origin.y) * ROW_HEIGHT;
          el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        } else {
          el.style.gridColumn = `${target.x + 1} / span ${target.w}`;
          el.style.gridRow = `${target.y + 1} / span ${target.h}`;
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        pending = { x: e.clientX, y: e.clientY };
        if (!raf) raf = requestAnimationFrame(paint);
      };

      const cleanup = () => {
        cancelAnimationFrame(raf);
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerup', onPointerUp);
        el.removeEventListener('pointercancel', cancel);
        el.removeEventListener('lostpointercapture', cancel);
        window.removeEventListener('keydown', onKeyDown);
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
        // Hand the element back to React in its original state; if the drop
        // changed the frame, the store update re-renders it in the new cell.
        el.style.transform = '';
        el.style.gridColumn = initialGridColumn;
        el.style.gridRow = initialGridRow;
        el.removeAttribute('data-dragging');
        cancelActive.current = null;
      };

      function cancel() {
        cleanup();
      }

      function onPointerUp(e: PointerEvent) {
        if (e.pointerId !== pointerId) return;
        compute(e.clientX, e.clientY);
        cleanup();
        const { onMove, onResize } = latest.current;
        if (mode === 'move' && (target.x !== origin.x || target.y !== origin.y)) {
          onMove(target.x, target.y);
        } else if (mode === 'resize' && (target.w !== origin.w || target.h !== origin.h)) {
          onResize(target.w, target.h);
        }
      }

      function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') cancel();
      }

      el.setPointerCapture(pointerId);
      // A data attribute rather than a class: React owns className and would
      // overwrite it if the block re-renders (e.g. becomes selected) mid-drag.
      el.setAttribute('data-dragging', '');
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', cancel);
      el.addEventListener('lostpointercapture', cancel);
      window.addEventListener('keydown', onKeyDown);
      cancelActive.current = cancel;
    },
    [elementRef],
  );
}
