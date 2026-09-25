import { memo, useCallback, useMemo, useRef, type CSSProperties, type PointerEvent } from 'react';
import { useBlock, useCommands, useIsSelected } from '../hooks/useBuilder';
import { useGridDrag } from '../hooks/useGridDrag';
import type { Frame } from '../types/block';
import { BLOCK_DEFINITIONS } from '../utils/blockDefaults';
import { BlockContent } from './blocks/BlockContent';

const NO_FRAME: Frame = { x: 0, y: 0, w: 1, h: 1 };

interface Props {
  id: string;
}

/**
 * Takes only an id and reads its own data from the store, so the Canvas can
 * render the list without knowing about block contents. The block re-renders
 * when its own object changes or its selected flag flips, and never because
 * a sibling moved.
 */
export const Block = memo(function Block({ id }: Props) {
  const block = useBlock(id);
  const selected = useIsSelected(id);
  const commands = useCommands();
  const ref = useRef<HTMLDivElement>(null);

  const onMove = useCallback((x: number, y: number) => commands.move(id, x, y), [commands, id]);
  const onResize = useCallback((w: number, h: number) => commands.resize(id, w, h), [commands, id]);
  const startDrag = useGridDrag(ref, { frame: block ?? NO_FRAME, onMove, onResize });

  const x = block?.x ?? 0;
  const y = block?.y ?? 0;
  const w = block?.w ?? 1;
  const h = block?.h ?? 1;
  const style = useMemo<CSSProperties>(
    () => ({ gridColumn: `${x + 1} / span ${w}`, gridRow: `${y + 1} / span ${h}` }),
    [x, y, w, h],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      commands.select(id);
      startDrag(e, 'move');
    },
    [commands, id, startDrag],
  );
  const onResizePointerDown = useCallback((e: PointerEvent) => startDrag(e, 'resize'), [startDrag]);
  const onFocus = useCallback(() => commands.select(id), [commands, id]);

  // The store can briefly drop a block before the Canvas unmounts it.
  if (!block) return null;

  return (
    <div
      ref={ref}
      className="block"
      style={style}
      data-type={block.type}
      data-selected={selected || undefined}
      tabIndex={0}
      role="group"
      aria-roledescription="draggable block"
      aria-label={`${BLOCK_DEFINITIONS[block.type].label} block, column ${x + 1}, row ${y + 1}`}
      onPointerDown={onPointerDown}
      onFocus={onFocus}
    >
      <BlockContent block={block} />
      {selected && (
        <span
          className="resize-handle"
          aria-hidden="true"
          title="Drag to resize (Shift + arrows)"
          onPointerDown={onResizePointerDown}
        />
      )}
    </div>
  );
});
