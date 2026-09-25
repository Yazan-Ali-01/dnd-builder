import { memo, useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}

function FieldShell({ label, htmlFor, error, children }: FieldShellProps) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Fields report changes as (name, value) so a parent can pass one stable
 * handler to all of them instead of a fresh arrow function per field.
 */
export type FieldChange<V> = (name: string, value: V) => void;

interface TextFieldProps {
  name: string;
  label: string;
  value: string;
  maxLength: number;
  multiline?: boolean;
  onChange: FieldChange<string>;
}

export const TextField = memo(function TextField({ name, label, value, maxLength, multiline, onChange }: TextFieldProps) {
  const id = useId();
  const handle = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, e.target.value);
  return (
    <FieldShell label={label} htmlFor={id}>
      {multiline ? (
        <textarea id={id} value={value} maxLength={maxLength} rows={3} onChange={handle} />
      ) : (
        <input id={id} type="text" value={value} maxLength={maxLength} onChange={handle} />
      )}
    </FieldShell>
  );
});

interface UrlFieldProps {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  /** Returns the normalised URL, or '' if it isn't allowed. */
  sanitize: (value: string) => string;
  onCommit: FieldChange<string>;
  hint: string;
}

/**
 * URLs are edited as a local draft and committed on blur, Enter, or when the
 * field unmounts, and only once they pass the protocol allowlist. A rejected
 * value never reaches state.
 */
export const UrlField = memo(function UrlField({ name, label, value, placeholder, sanitize, onCommit, hint }: UrlFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  // Resync when the stored value changes from elsewhere (undo, import).
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
    setError('');
  }

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('');
      onCommit(name, '');
      return;
    }
    const safe = sanitize(trimmed);
    if (!safe) {
      setError(hint);
      return;
    }
    setError('');
    setDraft(safe);
    onCommit(name, safe);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commit();
  };

  const latest = useRef({ draft, value, name, sanitize, onCommit });
  useEffect(() => {
    latest.current = { draft, value, name, sanitize, onCommit };
  });

  // Selecting another block (or the canvas) happens on pointerdown, which
  // unmounts this field before its input fires blur. Commit a valid pending
  // draft here so it isn't silently dropped. onCommit is still the handler
  // from the last render, so it targets the block being deselected.
  useEffect(
    () => () => {
      const { draft, value, name, sanitize, onCommit } = latest.current;
      const safe = sanitize(draft.trim());
      if (safe && safe !== value) onCommit(name, safe);
    },
    [],
  );

  return (
    <FieldShell label={label} htmlFor={id} error={error}>
      <input
        id={id}
        type="url"
        inputMode="url"
        value={draft}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    </FieldShell>
  );
});

interface NumberFieldProps {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: FieldChange<number>;
}

export const NumberField = memo(function NumberField({ name, label, value, min, max, onChange }: NumberFieldProps) {
  const id = useId();
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.valueAsNumber;
    // Empty or partial input is ignored; the reducer clamps the rest.
    if (Number.isFinite(next)) onChange(name, next);
  };
  return (
    <FieldShell label={label} htmlFor={id}>
      <input id={id} type="number" value={value} min={min} max={max} step={1} onChange={handle} />
    </FieldShell>
  );
});

interface ColorFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: FieldChange<string>;
}

export const ColorField = memo(function ColorField({ name, label, value, onChange }: ColorFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id}>
      <div className="color-field">
        <input id={id} type="color" value={value} onChange={(e) => onChange(name, e.target.value)} />
        <code>{value}</code>
      </div>
    </FieldShell>
  );
});

interface SelectFieldProps<T extends string> {
  name: string;
  label: string;
  value: T;
  options: readonly T[];
  onChange: FieldChange<T>;
}

export const SelectField = memo(SelectFieldInner) as typeof SelectFieldInner;

function SelectFieldInner<T extends string>({ name, label, value, options, onChange }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id}>
      <select id={id} value={value} onChange={(e) => onChange(name, e.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option[0].toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface CheckboxFieldProps {
  name: string;
  label: string;
  checked: boolean;
  onChange: FieldChange<boolean>;
}

export const CheckboxField = memo(function CheckboxField({ name, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="field-checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(name, e.target.checked)} />
      {label}
    </label>
  );
});
