import { memo, useCallback, useRef, useState, type ChangeEvent } from 'react';
import { useAutosave, type SaveStatus } from '../hooks/useAutosave';
import { useCanRedo, useCanUndo, useCommands } from '../hooks/useBuilder';
import { useLayoutIO } from '../hooks/useLayoutIO';
import { ImportDialog } from './ImportDialog';

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  error: 'Couldn’t save to this browser',
};

/** Isolated so save-status updates re-render only this label. */
const SaveIndicator = memo(function SaveIndicator() {
  const status = useAutosave();
  return (
    <span className="save-status" data-status={status} role="status">
      {STATUS_TEXT[status]}
    </span>
  );
});

interface Props {
  mode: 'edit' | 'preview';
  onModeChange: (mode: 'edit' | 'preview') => void;
}

export const Toolbar = memo(function Toolbar({ mode, onModeChange }: Props) {
  const commands = useCommands();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const { importing, importFile, importText, exportFile } = useLayoutIO();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset so choosing the same file again still fires change.
      e.target.value = '';
      if (file) void importFile(file);
    },
    [importFile],
  );
  const closePaste = useCallback(() => setPasteOpen(false), []);

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="logo" aria-hidden="true" />
        <h1>Page Builder</h1>
        <SaveIndicator />
      </div>

      <div className="toolbar-actions">
        <div className="btn-group" role="group" aria-label="History">
          <button type="button" className="btn" onClick={commands.undo} disabled={!canUndo} title="Undo (Ctrl/⌘+Z)">
            Undo
          </button>
          <button type="button" className="btn" onClick={commands.redo} disabled={!canRedo} title="Redo (Ctrl/⌘+Shift+Z)">
            Redo
          </button>
        </div>

        <div className="btn-group" role="group" aria-label="Layout file">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()} disabled={importing}>
            {importing ? <span className="spinner" aria-label="Importing" /> : null}
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button type="button" className="btn" onClick={() => setPasteOpen(true)}>
            Paste JSON
          </button>
          <button type="button" className="btn" onClick={exportFile}>
            Export
          </button>
        </div>

        <div className="btn-group" role="group" aria-label="Tools">
          <button type="button" className="btn" onClick={() => commands.addStressBlocks(500)} title="Adds 500 blocks for performance testing">
            +500 blocks
          </button>
          <button type="button" className="btn btn-danger-ghost" onClick={commands.clear}>
            Clear
          </button>
        </div>

        <div className="segmented" role="group" aria-label="Mode">
          <button type="button" aria-pressed={mode === 'edit'} onClick={() => onModeChange('edit')}>
            Edit
          </button>
          <button type="button" aria-pressed={mode === 'preview'} onClick={() => onModeChange('preview')}>
            Preview
          </button>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={onFileChange}
      />
      <ImportDialog open={pasteOpen} onClose={closePaste} onImport={importText} />
    </header>
  );
});
