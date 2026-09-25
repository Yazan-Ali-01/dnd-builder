import { BLOCK_TYPES, type Block, type BlockType, type Frame, type PropsOf } from '../types/block';
import { GRID_COLUMNS } from '../utils/constants';
import { bottomRow, createBlock, createId } from '../utils/helpers';
import type { ParseResult } from '../utils/validate';
import type { Notice, ReorderDirection } from './actions';
import type { BuilderStore } from './store';

/**
 * The imperative API components call. Created once per store, so every
 * function here has a stable identity and can be passed to memoised children
 * without useCallback at each call site.
 */
export function createCommands(store: BuilderStore) {
  const { dispatch, getState } = store;
  const notify = (kind: Notice['kind'], text: string) => dispatch({ type: 'notify', kind, text });

  return {
    addBlock(type: BlockType, position?: Pick<Frame, 'x' | 'y'>) {
      const at = position ?? { x: 0, y: bottomRow(getState().layout) };
      dispatch({ type: 'add', blocks: [createBlock(type, at)] });
    },

    /** Fills the canvas with many blocks in one history step, for profiling. */
    addStressBlocks(count: number) {
      const start = bottomRow(getState().layout);
      const blocks: Block[] = [];
      for (let i = 0; i < count; i++) {
        const type = BLOCK_TYPES[i % BLOCK_TYPES.length];
        const block = createBlock(type, { x: (i % 4) * 3, y: start + Math.floor(i / 4) * 2 });
        blocks.push({ ...block, w: GRID_COLUMNS / 4, h: 2 });
      }
      dispatch({ type: 'add', blocks });
      notify('info', `Added ${count} blocks.`);
    },

    move: (id: string, x: number, y: number) => dispatch({ type: 'move', id, x, y }),
    resize: (id: string, w: number, h: number) => dispatch({ type: 'resize', id, w, h }),

    setFrame(id: string, frame: Partial<Frame>) {
      dispatch({ type: 'setFrame', id, frame }, { coalesceKey: `frame:${id}:${Object.keys(frame)}` });
    },

    updateProps<T extends BlockType>(id: string, patch: Partial<PropsOf<T>>) {
      dispatch(
        { type: 'updateProps', id, patch },
        { coalesceKey: `props:${id}:${Object.keys(patch)}` },
      );
    },

    remove: (id: string) => dispatch({ type: 'delete', id }),
    duplicate: (id: string) => dispatch({ type: 'duplicate', id, newId: createId() }),
    reorder: (id: string, direction: ReorderDirection) => dispatch({ type: 'reorder', id, direction }),
    select: (id: string | null) => dispatch({ type: 'select', id }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),

    clear() {
      if (getState().layout.order.length === 0) return;
      dispatch({ type: 'clear' });
      notify('info', 'Canvas cleared. Press Ctrl/⌘+Z to undo.');
    },

    /** Applies an already-validated import result; the current layout is untouched on failure. */
    applyImport(result: ParseResult) {
      if (!result.ok) {
        notify('error', `Import failed: ${result.error}`);
        return false;
      }
      dispatch({ type: 'load', layout: result.layout });
      const count = result.layout.order.length;
      const skipped = result.skipped ? `, skipped ${result.skipped} invalid` : '';
      notify('info', `Imported ${count} block${count === 1 ? '' : 's'}${skipped}.`);
      return true;
    },

    notify,
    dismissNotice: (id: number) => dispatch({ type: 'dismissNotice', id }),
  };
}

export type Commands = ReturnType<typeof createCommands>;
