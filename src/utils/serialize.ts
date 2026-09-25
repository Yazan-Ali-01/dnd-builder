import { LAYOUT_VERSION, type Block, type Layout, type SerializedLayout } from '../types/block';
import { GRID_COLUMNS, ROW_HEIGHT } from './constants';
import { sanitizeProps } from './validate';

/**
 * Copies fields explicitly instead of spreading the block, so anything that
 * isn't layout data can never leak into an exported file.
 */
function serializeBlock(block: Block): Block {
  const { id, type, x, y, w, h } = block;
  return { id, type, x, y, w, h, props: sanitizeProps(type, block.props) } as Block;
}

export function serializeLayout(layout: Layout): SerializedLayout {
  return {
    version: LAYOUT_VERSION,
    grid: { columns: GRID_COLUMNS, rowHeight: ROW_HEIGHT },
    blocks: layout.order.map((id) => serializeBlock(layout.blocks[id])),
  };
}

export const layoutToJson = (layout: Layout): string =>
  JSON.stringify(serializeLayout(layout), null, 2);

export function downloadLayout(layout: Layout, filename = 'layout.json'): void {
  const blob = new Blob([layoutToJson(layout)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoke on the next tick so the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
