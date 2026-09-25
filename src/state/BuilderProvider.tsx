import { useState, type ReactNode } from 'react';
import type { Layout } from '../types/block';
import { emptyLayout } from '../utils/helpers';
import { loadStoredLayout } from '../utils/storage';
import type { Notice } from './actions';
import { createCommands } from './commands';
import { BuilderContext, type BuilderContextValue } from './context';
import { createBuilderStore } from './store';

function restoreFromStorage(): { layout: Layout; notices: Notice[] } {
  const stored = loadStoredLayout();
  if (!stored) return { layout: emptyLayout(), notices: [] };
  if (!stored.ok) {
    return {
      layout: emptyLayout(),
      notices: [{ id: 1, kind: 'error', text: `Saved layout couldn't be restored (a backup copy was kept): ${stored.error}` }],
    };
  }
  const notices: Notice[] = stored.skipped
    ? [{ id: 1, kind: 'info', text: `Restored layout; ignored ${stored.skipped} invalid block(s).` }]
    : [];
  return { layout: stored.layout, notices };
}

interface Props {
  children: ReactNode;
  /** Skips localStorage; used by tests. */
  initialLayout?: Layout;
}

export function BuilderProvider({ children, initialLayout }: Props) {
  // Created once. The context value never changes, so consumers only
  // re-render through their own store subscriptions.
  const [value] = useState<BuilderContextValue>(() => {
    const { layout, notices } = initialLayout
      ? { layout: initialLayout, notices: [] }
      : restoreFromStorage();
    const store = createBuilderStore(layout, notices);
    return { store, commands: createCommands(store) };
  });

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}
