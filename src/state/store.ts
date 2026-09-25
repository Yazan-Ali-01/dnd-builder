import type { Layout } from '../types/block';
import { HISTORY_LIMIT } from '../utils/constants';
import type { LayoutAction, Notice, StoreAction } from './actions';
import { layoutReducer } from './reducer';

export interface BuilderState {
  layout: Layout;
  selectedId: string | null;
  past: Layout[];
  future: Layout[];
  notices: Notice[];
}

export interface DispatchOptions {
  /**
   * Consecutive actions with the same key inside COALESCE_MS collapse into one
   * history entry, so typing a sentence is one undo step, not one per letter.
   */
  coalesceKey?: string;
}

export interface BuilderStore {
  getState: () => BuilderState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: StoreAction, options?: DispatchOptions) => void;
}

const COALESCE_MS = 800;

/**
 * A minimal external store read through useSyncExternalStore. Components
 * subscribe with a selector and only re-render when their selected slice
 * changes, which a single React context holding the whole layout can't offer.
 */
export function createBuilderStore(initial: Layout, initialNotices: Notice[] = []): BuilderStore {
  let state: BuilderState = {
    layout: initial,
    selectedId: null,
    past: [],
    future: [],
    notices: initialNotices,
  };
  const listeners = new Set<() => void>();
  let lastCoalesce: { key: string; at: number } | null = null;
  let noticeId = initialNotices.length;

  const set = (next: BuilderState) => {
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  const withValidSelection = (next: BuilderState): BuilderState =>
    next.selectedId && !next.layout.blocks[next.selectedId] ? { ...next, selectedId: null } : next;

  function applyLayoutAction(action: LayoutAction, options?: DispatchOptions) {
    const layout = layoutReducer(state.layout, action);
    if (layout === state.layout) return;

    const now = Date.now();
    const key = options?.coalesceKey;
    const merge = key !== undefined && lastCoalesce?.key === key && now - lastCoalesce.at < COALESCE_MS;
    lastCoalesce = key ? { key, at: now } : null;

    const past = merge ? state.past : [...state.past, state.layout].slice(-HISTORY_LIMIT);
    let selectedId = state.selectedId;
    if (action.type === 'add' && action.blocks.length === 1) selectedId = action.blocks[0].id;
    if (action.type === 'duplicate') selectedId = action.newId;

    set(withValidSelection({ ...state, layout, past, future: [], selectedId }));
  }

  function dispatch(action: StoreAction, options?: DispatchOptions) {
    switch (action.type) {
      case 'select':
        if (action.id === state.selectedId) return;
        if (action.id !== null && !state.layout.blocks[action.id]) return;
        set({ ...state, selectedId: action.id });
        return;

      case 'undo': {
        const previous = state.past.at(-1);
        if (!previous) return;
        lastCoalesce = null;
        set(
          withValidSelection({
            ...state,
            layout: previous,
            past: state.past.slice(0, -1),
            future: [state.layout, ...state.future],
          }),
        );
        return;
      }

      case 'redo': {
        const [next, ...future] = state.future;
        if (!next) return;
        lastCoalesce = null;
        set(
          withValidSelection({
            ...state,
            layout: next,
            past: [...state.past, state.layout],
            future,
          }),
        );
        return;
      }

      case 'notify':
        set({
          ...state,
          notices: [...state.notices, { id: ++noticeId, kind: action.kind, text: action.text }].slice(-3),
        });
        return;

      case 'dismissNotice':
        set({ ...state, notices: state.notices.filter((n) => n.id !== action.id) });
        return;

      default:
        applyLayoutAction(action, options);
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch,
  };
}
