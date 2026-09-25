import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Frame } from '../types/block';
import { GRID_COLUMNS, ROW_HEIGHT } from '../utils/constants';
import { dragTarget, pixelsToCells, type DragMode } from '../utils/drag';

export type { DragMode };

interface Options {
  frame: Frame;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
}

/**
 * Pointer-driven move/resize on the 12-column grid.
 *
 * While the pointer is down nothing goes through React: the element is moved
 * by writing `transform` (move) or `width`/`height` (resize) directly, at most
 * once per animation frame. The store receives a single action on release,
 * so a drag costs zero React renders until it commits, however many blocks
 * are on the board.
 *
 * The hook only writes style properties React never sets (its grid placement
 * comes from state), so cleanup can simply clear them without ever putting a
 * stale value back over what React rendered.
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

  // If the block changes from elsewhere mid-drag (keyboard nudge, undo), that
  // change wins: drop the drag instead of overwriting it from a stale origin.
  // A normal drop clears cancelActive before dispatching, so this is a no-op then.
  useEffect(() => {
    cancelActive.current?.();
  }, [frame.x, frame.y, frame.w, frame.h]);

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

      let target = { ...origin };
      let pending: { x: number; y: number } | null = null;
      let raf = 0;

      const compute = (clientX: number, clientY: number) => {
        const { dc, dr } = pixelsToCells(clientX - startX, clientY - startY, colWidth, ROW_HEIGHT);
        target = dragTarget(origin, dc, dr, mode);
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
          el.style.width = `${target.w * colWidth}px`;
          el.style.height = `${target.h * ROW_HEIGHT}px`;
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
        // Clear only what this hook set; if the drop changed the frame, the
        // store update re-renders the block in its new cell.
        el.style.transform = '';
        el.style.width = '';
        el.style.height = '';
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
