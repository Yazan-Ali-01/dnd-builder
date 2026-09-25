import { memo, useCallback } from 'react';
import { useCommands, useSelectedBlock } from '../hooks/useBuilder';
import { ALIGNMENTS, IMAGE_FITS, type Block } from '../types/block';
import { BLOCK_DEFINITIONS } from '../utils/blockDefaults';
import { FONT_SIZE, GRID_COLUMNS, MAX_LABEL_LENGTH, MAX_ROWS, MAX_TEXT_LENGTH, RADIUS } from '../utils/constants';
import { sanitizeImageUrl, sanitizeLinkUrl } from '../utils/sanitize';
import { BlockIcon } from './BlockIcon';
import { CheckboxField, ColorField, NumberField, SelectField, TextField, UrlField, type FieldChange } from './fields/Fields';

interface EditorProps<B extends Block> {
  block: B;
  onProp: FieldChange<unknown>;
}

function TextEditor({ block, onProp }: EditorProps<Extract<Block, { type: 'text' }>>) {
  const p = block.props;
  return (
    <>
      <TextField name="text" label="Text" value={p.text} maxLength={MAX_TEXT_LENGTH} multiline onChange={onProp} />
      <div className="field-row">
        <NumberField name="fontSize" label="Font size" value={p.fontSize} min={FONT_SIZE.min} max={FONT_SIZE.max} onChange={onProp} />
        <SelectField name="align" label="Align" value={p.align} options={ALIGNMENTS} onChange={onProp} />
      </div>
      <ColorField name="color" label="Colour" value={p.color} onChange={onProp} />
      <CheckboxField name="bold" label="Bold" checked={p.bold} onChange={onProp} />
    </>
  );
}

function ImageEditor({ block, onProp }: EditorProps<Extract<Block, { type: 'image' }>>) {
  const p = block.props;
  return (
    <>
      <UrlField
        name="src"
        label="Image URL"
        value={p.src}
        placeholder="https://…"
        sanitize={sanitizeImageUrl}
        hint="Only http:// or https:// image URLs are allowed."
        onCommit={onProp}
      />
      <TextField name="alt" label="Alt text" value={p.alt} maxLength={MAX_LABEL_LENGTH * 2} onChange={onProp} />
      <div className="field-row">
        <SelectField name="fit" label="Fit" value={p.fit} options={IMAGE_FITS} onChange={onProp} />
        <NumberField name="radius" label="Radius" value={p.radius} min={RADIUS.min} max={RADIUS.max} onChange={onProp} />
      </div>
    </>
  );
}

function ButtonEditor({ block, onProp }: EditorProps<Extract<Block, { type: 'button' }>>) {
  const p = block.props;
  return (
    <>
      <TextField name="label" label="Label" value={p.label} maxLength={MAX_LABEL_LENGTH} onChange={onProp} />
      <UrlField
        name="href"
        label="Link"
        value={p.href}
        placeholder="https://… or mailto:…"
        sanitize={sanitizeLinkUrl}
        hint="Only http://, https:// or mailto: links are allowed."
        onCommit={onProp}
      />
      <div className="field-row">
        <ColorField name="background" label="Background" value={p.background} onChange={onProp} />
        <ColorField name="color" label="Text" value={p.color} onChange={onProp} />
      </div>
      <div className="field-row">
        <SelectField name="align" label="Align" value={p.align} options={ALIGNMENTS} onChange={onProp} />
        <NumberField name="radius" label="Radius" value={p.radius} min={RADIUS.min} max={RADIUS.max} onChange={onProp} />
      </div>
    </>
  );
}

function ContainerEditor({ block, onProp }: EditorProps<Extract<Block, { type: 'container' }>>) {
  const p = block.props;
  return (
    <>
      <div className="field-row">
        <ColorField name="background" label="Background" value={p.background} onChange={onProp} />
        <ColorField name="borderColor" label="Border" value={p.borderColor} onChange={onProp} />
      </div>
      <NumberField name="radius" label="Radius" value={p.radius} min={RADIUS.min} max={RADIUS.max} onChange={onProp} />
    </>
  );
}

function TypeEditor({ block, onProp }: EditorProps<Block>) {
  switch (block.type) {
    case 'text':
      return <TextEditor block={block} onProp={onProp} />;
    case 'image':
      return <ImageEditor block={block} onProp={onProp} />;
    case 'button':
      return <ButtonEditor block={block} onProp={onProp} />;
    case 'container':
      return <ContainerEditor block={block} onProp={onProp} />;
  }
}

/** A view of the selected block in the store; it holds no copy of block data. */
export const PropertiesPanel = memo(function PropertiesPanel() {
  const block = useSelectedBlock();
  const commands = useCommands();
  const id = block?.id;

  // Any key other than the block type's own props is dropped by the reducer's sanitiser.
  const onProp = useCallback<FieldChange<unknown>>(
    (name, value) => {
      if (id) commands.updateProps(id, { [name]: value });
    },
    [commands, id],
  );
  const onFrame = useCallback<FieldChange<number>>(
    (name, value) => {
      // The panel shows 1-based columns/rows; the model is 0-based.
      if (id) commands.setFrame(id, { [name]: name === 'x' || name === 'y' ? value - 1 : value });
    },
    [commands, id],
  );

  if (!block) {
    return (
      <aside className="panel properties" aria-label="Properties">
        <h2 className="panel-title">Properties</h2>
        <div className="panel-empty">
          <p>Select a block to edit its properties.</p>
          <p className="panel-hint">
            Tip: arrows move the selected block, Shift + arrows resize it, Delete removes it.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel properties" aria-label="Properties">
      <h2 className="panel-title panel-title-block">
        <BlockIcon type={block.type} />
        {BLOCK_DEFINITIONS[block.type].label}
      </h2>

      {/* Keyed by id so per-field drafts (e.g. URL) reset when the selection changes. */}
      <div className="panel-section" key={block.id}>
        <TypeEditor block={block} onProp={onProp} />
      </div>

      <div className="panel-section">
        <h3 className="panel-subtitle">Position &amp; size</h3>
        <div className="field-row field-row-4">
          <NumberField name="x" label="Col" value={block.x + 1} min={1} max={GRID_COLUMNS} onChange={onFrame} />
          <NumberField name="y" label="Row" value={block.y + 1} min={1} max={MAX_ROWS} onChange={onFrame} />
          <NumberField name="w" label="Width" value={block.w} min={1} max={GRID_COLUMNS} onChange={onFrame} />
          <NumberField name="h" label="Height" value={block.h} min={1} max={MAX_ROWS} onChange={onFrame} />
        </div>
      </div>

      <div className="panel-section panel-actions">
        <button type="button" className="btn" onClick={() => commands.reorder(block.id, 'forward')}>
          Bring forward
        </button>
        <button type="button" className="btn" onClick={() => commands.reorder(block.id, 'backward')}>
          Send backward
        </button>
        <button type="button" className="btn" onClick={() => commands.duplicate(block.id)}>
          Duplicate
        </button>
        <button type="button" className="btn btn-danger" onClick={() => commands.remove(block.id)}>
          Delete
        </button>
      </div>
    </aside>
  );
});
