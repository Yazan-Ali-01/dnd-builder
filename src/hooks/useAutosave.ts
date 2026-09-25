import { useEffect, useState } from 'react';
import { saveStoredLayout } from '../utils/storage';
import { useBuilderStore } from './useBuilder';

export type SaveStatus = 'saved' | 'saving' | 'error';

const DEBOUNCE_MS = 400;

/**
 * Persists the layout to localStorage whenever it changes, debounced so a
 * burst of edits (typing, keyboard nudges) is one write. Pending changes are
 * flushed when the tab is hidden or closed.
 */
export function useAutosave(): SaveStatus {
  const store = useBuilderStore();
  const [status, setStatus] = useState<SaveStatus>('saved');

  useEffect(() => {
    let lastLayout = store.getState().layout;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      clearTimeout(timer);
      if (!dirty) return;
      dirty = false;
      setStatus(saveStoredLayout(lastLayout) ? 'saved' : 'error');
    };

    const unsubscribe = store.subscribe(() => {
      const { layout } = store.getState();
      if (layout === lastLayout) return;
      lastLayout = layout;
      dirty = true;
      setStatus('saving');
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });

    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);

    return () => {
      flush();
      unsubscribe();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [store]);

  return status;
}
