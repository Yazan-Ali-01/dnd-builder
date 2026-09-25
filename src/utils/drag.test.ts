import { describe, expect, it } from 'vitest';
import { GRID_COLUMNS, MAX_ROWS } from './constants';
import { dragTarget, pixelsToCells } from './drag';

const origin = { x: 2, y: 3, w: 4, h: 2 };

describe('dragTarget', () => {
  it('moves by whole cells', () => {
    expect(dragTarget(origin, 3, 2, 'move')).toEqual({ x: 5, y: 5, w: 4, h: 2 });
  });

  it('pins a block dragged out of bounds to the board edge', () => {
    expect(dragTarget(origin, 100, 100_000, 'move')).toEqual({ x: GRID_COLUMNS - 4, y: MAX_ROWS - 2, w: 4, h: 2 });
    expect(dragTarget(origin, -100, -100, 'move')).toEqual({ x: 0, y: 0, w: 4, h: 2 });
  });

  it('resizes without moving and keeps at least one cell', () => {
    expect(dragTarget(origin, 2, 1, 'resize')).toEqual({ x: 2, y: 3, w: 6, h: 3 });
    expect(dragTarget(origin, -50, -50, 'resize')).toEqual({ x: 2, y: 3, w: 1, h: 1 });
    expect(dragTarget(origin, 50, 0, 'resize').w).toBe(GRID_COLUMNS - origin.x);
  });
});

describe('pixelsToCells', () => {
  it('snaps to the nearest cell', () => {
    expect(pixelsToCells(49, 19, 100, 40)).toEqual({ dc: 0, dr: 0 });
    expect(pixelsToCells(51, 21, 100, 40)).toEqual({ dc: 1, dr: 1 });
    expect(pixelsToCells(-151, -61, 100, 40)).toEqual({ dc: -2, dr: -2 });
  });
});
