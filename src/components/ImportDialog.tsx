import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Returns an error message, or null on success. */
  onImport: (text: string) => string | null;
}

export function ImportDialog({ open, onClose, onImport }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    setText('');
    setError('');
    onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const message = onImport(text);
    if (message) setError(message);
    else close();
  };

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={close}>
      <form onSubmit={submit}>
        <h2 id={titleId}>Paste layout JSON</h2>
        <p className="panel-hint">
          The layout is validated before it is applied. Invalid input leaves your current canvas unchanged.
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          rows={12}
          spellCheck={false}
          placeholder='{ "version": 1, "blocks": [ … ] }'
          aria-invalid={!!error}
          autoFocus
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!text.trim()}>
            Import
          </button>
        </div>
      </form>
    </dialog>
  );
}
