import type { Block, BlockType, Frame, Layout } from '../types/block';
import { BLOCK_DEFINITIONS } from './blockDefaults';
import { CANVAS_PADDING_ROWS, GRID_COLUMNS, MAX_ROWS, MIN_CANVAS_ROWS } from './constants';

export function createId(): string {
  // randomUUID is only exposed in secure contexts; the dev server opened over
  // a LAN IP is plain http, so fall back to getRandomValues.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Snaps a frame to whole cells and keeps it fully inside the grid. */
export function clampFrame(frame: Frame): Frame {
  const w = clamp(Math.round(frame.w), 1, GRID_COLUMNS);
  const h = clamp(Math.round(frame.h), 1, MAX_ROWS);
  return {
    w,
    h,
    x: clamp(Math.round(frame.x), 0, GRID_COLUMNS - w),
    y: clamp(Math.round(frame.y), 0, MAX_ROWS - h),
  };
}

export function createBlock(type: BlockType, position: Pick<Frame, 'x' | 'y'>): Block {
  const def = BLOCK_DEFINITIONS[type];
  const frame = clampFrame({ ...position, ...def.size });
  // The registry is keyed by type, so pairing its props with the same type is sound.
  return { id: createId(), type, ...frame, props: { ...def.props } } as Block;
}

export function bottomRow(layout: Layout): number {
  let bottom = 0;
  for (const id of layout.order) {
    const b = layout.blocks[id];
    if (b.y + b.h > bottom) bottom = b.y + b.h;
  }
  return bottom;
}

export function canvasRows(bottom: number): number {
  return Math.min(MAX_ROWS, Math.max(MIN_CANVAS_ROWS, bottom + CANVAS_PADDING_ROWS));
}

export const emptyLayout = (): Layout => ({ blocks: {}, order: [] });

/** Reading order used by the stacked mobile output: top to bottom, then left to right. */
export function readingOrder(layout: Layout): string[] {
  return [...layout.order].sort((a, b) => {
    const A = layout.blocks[a];
    const B = layout.blocks[b];
    return A.y - B.y || A.x - B.x;
  });
}
