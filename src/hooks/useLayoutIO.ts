import { useCallback, useState } from 'react';
import { MAX_IMPORT_BYTES } from '../utils/constants';
import { downloadLayout } from '../utils/serialize';
import { parseLayout } from '../utils/validate';
import { useBuilderStore, useCommands } from './useBuilder';

/** Import/export flows. Every import path goes through parseLayout before touching state. */
export function useLayoutIO() {
  const store = useBuilderStore();
  const commands = useCommands();
  const [importing, setImporting] = useState(false);

  const importFile = useCallback(
    async (file: File) => {
      // Checked before reading so a huge file is never loaded into memory.
      if (file.size > MAX_IMPORT_BYTES) {
        commands.applyImport({ ok: false, error: 'File is too large (limit is 2 MB).' });
        return;
      }
      setImporting(true);
      try {
        commands.applyImport(parseLayout(await file.text()));
      } catch {
        commands.applyImport({ ok: false, error: "The file couldn't be read." });
      } finally {
        setImporting(false);
      }
    },
    [commands],
  );

  /** Returns an error message, or null when the layout was applied. */
  const importText = useCallback(
    (text: string): string | null => {
      // Errors are shown inline in the dialog, so only successes go to applyImport.
      const result = parseLayout(text);
      if (!result.ok) return result.error;
      commands.applyImport(result);
      return null;
    },
    [commands],
  );

  const exportFile = useCallback(() => {
    const { layout } = store.getState();
    if (layout.order.length === 0) {
      commands.notify('info', 'Nothing to export yet. Add a block first.');
      return;
    }
    downloadLayout(layout);
  }, [store, commands]);

  return { importing, importFile, importText, exportFile };
}
