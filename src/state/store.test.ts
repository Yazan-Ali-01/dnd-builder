import { describe, expect, it, vi } from 'vitest';
import type { Layout } from '../types/block';
import { MAX_BLOCKS, STORAGE_KEY } from '../utils/constants';
import { createBlock, emptyLayout } from '../utils/helpers';
import { layoutToJson } from '../utils/serialize';
import { BACKUP_KEY, loadStoredLayout } from '../utils/storage';
import { parseLayout } from '../utils/validate';
import { createCommands } from './commands';
import { createBuilderStore } from './store';

function setup() {
  const a = createBlock('text', { x: 0, y: 0 });
  const b = createBlock('button', { x: 0, y: 4 });
  const layout: Layout = { blocks: { [a.id]: a, [b.id]: b }, order: [a.id, b.id] };
  return { store: createBuilderStore(layout), a, b };
}

describe('builder store', () => {
  it('replaces only the changed block and keeps sibling identity', () => {
    const { store, a, b } = setup();
    store.dispatch({ type: 'move', id: a.id, x: 3, y: 2 });
    const { layout } = store.getState();
    expect(layout.blocks[a.id]).toMatchObject({ x: 3, y: 2 });
    expect(layout.blocks[b.id]).toBe(b);
    expect(layout.order).toBe(store.getState().past[0].order);
  });

  it('does not notify or record history for no-op actions', () => {
    const { store, a } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'move', id: a.id, x: a.x, y: a.y });
    store.dispatch({ type: 'move', id: 'missing', x: 1, y: 1 });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState().past).toHaveLength(0);
  });

  it('clamps moves that would leave the grid', () => {
    const { store, a } = setup();
    store.dispatch({ type: 'move', id: a.id, x: 100, y: -5 });
    expect(store.getState().layout.blocks[a.id]).toMatchObject({ x: 12 - a.w, y: 0 });
  });

  it('undoes and redoes, and a new action clears redo', () => {
    const { store, a } = setup();
    store.dispatch({ type: 'move', id: a.id, x: 2, y: 2 });
    store.dispatch({ type: 'undo' });
    expect(store.getState().layout.blocks[a.id]).toBe(a);
    store.dispatch({ type: 'redo' });
    expect(store.getState().layout.blocks[a.id]).toMatchObject({ x: 2, y: 2 });
    store.dispatch({ type: 'undo' });
    store.dispatch({ type: 'delete', id: a.id });
    expect(store.getState().future).toHaveLength(0);
  });

  it('merges rapid edits of the same field into one undo step', () => {
    const { store, a } = setup();
    for (const text of ['H', 'He', 'Hel', 'Hello']) {
      store.dispatch({ type: 'updateProps', id: a.id, patch: { text } }, { coalesceKey: `props:${a.id}:text` });
    }
    expect(store.getState().past).toHaveLength(1);
    store.dispatch({ type: 'undo' });
    expect(store.getState().layout.blocks[a.id]).toBe(a);
  });

  it('sanitises property patches and drops unknown keys', () => {
    const { store, b } = setup();
    store.dispatch({
      type: 'updateProps',
      id: b.id,
      patch: { href: 'javascript:alert(1)', background: 'url(x)', style: 'position:fixed' },
    });
    const props = store.getState().layout.blocks[b.id].props;
    expect(props).toEqual(b.props);
    expect(props).not.toHaveProperty('style');
  });

  it('clears selection when the selected block is deleted or undone away', () => {
    const { store, a } = setup();
    store.dispatch({ type: 'select', id: a.id });
    store.dispatch({ type: 'delete', id: a.id });
    expect(store.getState().selectedId).toBeNull();

    const c = createBlock('image', { x: 0, y: 10 });
    store.dispatch({ type: 'add', blocks: [c] });
    expect(store.getState().selectedId).toBe(c.id);
    store.dispatch({ type: 'undo' });
    expect(store.getState().selectedId).toBeNull();
  });

  it('reorders z-order within bounds', () => {
    const { store, a, b } = setup();
    store.dispatch({ type: 'reorder', id: a.id, direction: 'forward' });
    expect(store.getState().layout.order).toEqual([b.id, a.id]);
    const before = store.getState().layout;
    store.dispatch({ type: 'reorder', id: a.id, direction: 'front' });
    expect(store.getState().layout).toBe(before);
  });
});

describe('layout limits', () => {
  it('any layout the store can produce loads back through parseLayout', () => {
    const store = createBuilderStore(emptyLayout());
    const commands = createCommands(store);
    for (let i = 0; i < 5; i++) commands.addStressBlocks(500);
    commands.addBlock('text');
    const { layout } = store.getState();
    expect(layout.order).toHaveLength(MAX_BLOCKS);

    const result = parseLayout(layoutToJson(layout));
    expect(result.ok).toBe(true);
    // Every block got its own cell instead of piling onto the last row.
    const cells = new Set(layout.order.map((id) => `${layout.blocks[id].x}:${layout.blocks[id].y}`));
    expect(cells.size).toBe(MAX_BLOCKS);
  });

  it('refuses duplicates at the limit and tells the user', () => {
    const store = createBuilderStore(emptyLayout());
    const commands = createCommands(store);
    commands.addStressBlocks(MAX_BLOCKS);
    commands.duplicate(store.getState().layout.order[0]);
    expect(store.getState().layout.order).toHaveLength(MAX_BLOCKS);
    expect(store.getState().notices.at(-1)?.text).toMatch(/limit reached/i);
  });

  it('keeps a backup of a saved layout it cannot restore', () => {
    const unreadable = JSON.stringify({ version: 99, blocks: [] });
    localStorage.setItem(STORAGE_KEY, unreadable);
    expect(loadStoredLayout()).toMatchObject({ ok: false });
    expect(localStorage.getItem(BACKUP_KEY)).toBe(unreadable);
  });
});
