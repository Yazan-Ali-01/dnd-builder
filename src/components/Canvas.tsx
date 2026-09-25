import { useCallback, useMemo, useRef, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { useBlockIds, useBottomRow, useCommands } from '../hooks/useBuilder';
import { GRID_COLUMNS, PALETTE_MIME, ROW_HEIGHT } from '../utils/constants';
import { canvasRows } from '../utils/helpers';
import { isBlockType } from '../utils/validate';
import { Block } from './Block';

/**
 * Renders from state only: the id list and the board height. It re-renders
 * when blocks are added, removed or reordered, or the board grows; moving or
 * editing an existing block doesn't touch it.
 */
export function Canvas() {
  const ids = useBlockIds();
  const rows = canvasRows(useBottomRow());
  const commands = useCommands();
  const boardRef = useRef<HTMLDivElement>(null);

  const boardStyle = useMemo<CSSProperties>(
    () => ({ gridTemplateRows: `repeat(${rows}, ${ROW_HEIGHT}px)` }),
    [rows],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.target === e.currentTarget) commands.select(null);
    },
    [commands],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    // Always handled so a foreign drop (e.g. a file) is refused rather than
    // letting the browser navigate away to it.
    e.preventDefault();
    if (!e.dataTransfer.types.includes(PALETTE_MIME)) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'copy';
    // Toggled on the DOM node so dragover doesn't re-render the board.
    boardRef.current?.toggleAttribute('data-drop-target', true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      boardRef.current?.toggleAttribute('data-drop-target', false);
    }
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      boardRef.current?.toggleAttribute('data-drop-target', false);
      const type = e.dataTransfer.getData(PALETTE_MIME);
      // Anything dragged in from outside the palette (files, text, links) is ignored.
      if (!isBlockType(type) || !boardRef.current) return;
      e.preventDefault();
      const rect = boardRef.current.getBoundingClientRect();
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_COLUMNS);
      const y = Math.floor((e.clientY - rect.top) / ROW_HEIGHT);
      commands.addBlock(type, { x, y });
    },
    [commands],
  );

  return (
    <section className="canvas" aria-label="Canvas">
      <div
        ref={boardRef}
        className="board"
        style={boardStyle}
        onPointerDown={onPointerDown}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {ids.map((id) => (
          <Block key={id} id={id} />
        ))}
        {ids.length === 0 && (
          <div className="board-empty">
            <strong>Your canvas is empty</strong>
            <span>Drag a block from the palette, or click one to add it.</span>
          </div>
        )}
      </div>
    </section>
  );
}
