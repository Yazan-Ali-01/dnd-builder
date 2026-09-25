import type { Frame } from '../types/block';
import { GRID_COLUMNS, MAX_ROWS } from './constants';

export type DragMode = 'move' | 'resize';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Frame a drag would produce after moving `dc` columns and `dr` rows.
 * Clamped so dragging out of bounds pins the block to the board edge.
 */
export function dragTarget(origin: Frame, dc: number, dr: number, mode: DragMode): Frame {
  return mode === 'move'
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
}

/** Converts a pointer offset in pixels to whole grid cells. */
export function pixelsToCells(dx: number, dy: number, colWidth: number, rowHeight: number) {
  return { dc: Math.round(dx / colWidth), dr: Math.round(dy / rowHeight) };
}
