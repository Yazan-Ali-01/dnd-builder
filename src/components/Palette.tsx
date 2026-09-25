import { memo, useCallback, type DragEvent } from 'react';
import { useCommands } from '../hooks/useBuilder';
import { BLOCK_TYPES, type BlockType } from '../types/block';
import { BLOCK_DEFINITIONS } from '../utils/blockDefaults';
import { PALETTE_MIME } from '../utils/constants';
import { BlockIcon } from './BlockIcon';

const PaletteItem = memo(function PaletteItem({ type }: { type: BlockType }) {
  const commands = useCommands();
  const def = BLOCK_DEFINITIONS[type];

  const onDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData(PALETTE_MIME, type);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [type],
  );
  const onClick = useCallback(() => commands.addBlock(type), [commands, type]);

  return (
    <li>
      <button
        type="button"
        className="palette-item"
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        aria-label={`Add ${def.label} block`}
      >
        <BlockIcon type={type} />
        <span className="palette-text">
          <span className="palette-label">{def.label}</span>
          <span className="palette-desc">{def.description}</span>
        </span>
      </button>
    </li>
  );
});

/** Static list of block types. It has no store subscriptions, so it renders once. */
export const Palette = memo(function Palette() {
  return (
    <aside className="panel palette" aria-label="Blocks">
      <h2 className="panel-title">Blocks</h2>
      <p className="panel-hint">Drag onto the canvas or click to add.</p>
      <ul className="palette-list">
        {BLOCK_TYPES.map((type) => (
          <PaletteItem key={type} type={type} />
        ))}
      </ul>
    </aside>
  );
});
