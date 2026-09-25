import { useContext, useSyncExternalStore } from 'react';
import { BuilderContext, type BuilderContextValue } from '../state/context';
import type { BuilderState } from '../state/store';
import { bottomRow } from '../utils/helpers';

function useBuilderContext(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('Builder hooks must be used inside <BuilderProvider>');
  return ctx;
}

/**
 * Subscribes to one slice of builder state. The component re-renders only
 * when the selected value changes by reference, so selectors must return
 * existing objects or primitives, never fresh ones.
 */
export function useBuilderState<T>(selector: (state: BuilderState) => T): T {
  const { store } = useBuilderContext();
  const get = () => selector(store.getState());
  return useSyncExternalStore(store.subscribe, get, get);
}

export const useCommands = () => useBuilderContext().commands;
export const useBuilderStore = () => useBuilderContext().store;

export const useBlockIds = () => useBuilderState((s) => s.layout.order);
export const useBlock = (id: string) => useBuilderState((s) => s.layout.blocks[id]);
export const useIsSelected = (id: string) => useBuilderState((s) => s.selectedId === id);
export const useSelectedId = () => useBuilderState((s) => s.selectedId);
export const useSelectedBlock = () =>
  useBuilderState((s) => (s.selectedId ? s.layout.blocks[s.selectedId] : undefined));
export const useBottomRow = () => useBuilderState((s) => bottomRow(s.layout));
export const useCanUndo = () => useBuilderState((s) => s.past.length > 0);
export const useCanRedo = () => useBuilderState((s) => s.future.length > 0);
export const useNotices = () => useBuilderState((s) => s.notices);
