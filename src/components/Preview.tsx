import { memo, useMemo, useState, type CSSProperties } from 'react';
import { useBuilderState } from '../hooks/useBuilder';
import type { Block } from '../types/block';
import { ROW_HEIGHT } from '../utils/constants';
import { readingOrder } from '../utils/helpers';
import { BlockContent } from './blocks/BlockContent';

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];

const PreviewBlock = memo(function PreviewBlock({ block, readingIndex }: { block: Block; readingIndex: number }) {
  // Grid placement comes through custom properties so the stacked mobile
  // layout (a container query in CSS) can override it.
  const style = useMemo(
    () =>
      ({
        '--col': `${block.x + 1} / span ${block.w}`,
        '--row': `${block.y + 1} / span ${block.h}`,
        '--rows': block.h,
        '--order': readingIndex,
      }) as CSSProperties,
    [block.x, block.y, block.w, block.h, readingIndex],
  );
  return (
    <div className="preview-block" data-type={block.type} style={style}>
      <BlockContent block={block} live />
    </div>
  );
});

/**
 * The rendered output: the same layout on a CSS grid. On desktop it matches
 * the canvas; in a narrow container blocks stack full-width in reading order
 * (top to bottom, then left to right).
 */
export function Preview() {
  const layout = useBuilderState((s) => s.layout);
  const [device, setDevice] = useState<Device>('desktop');
  const reading = useMemo(() => {
    const index = new Map<string, number>();
    readingOrder(layout).forEach((id, i) => index.set(id, i));
    return index;
  }, [layout]);
  const gridStyle = useMemo(() => ({ '--row-height': `${ROW_HEIGHT}px` }) as CSSProperties, []);

  return (
    <section className="preview" aria-label="Preview">
      <div className="segmented preview-devices" role="group" aria-label="Preview width">
        {DEVICES.map((d) => (
          <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>
            {d[0].toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
      <div className="preview-frame" data-device={device}>
        {layout.order.length === 0 ? (
          <div className="board-empty">
            <strong>Nothing to preview yet</strong>
            <span>Switch to Edit and add some blocks.</span>
          </div>
        ) : (
          <div className="preview-grid" style={gridStyle}>
            {layout.order.map((id) => (
              <PreviewBlock key={id} block={layout.blocks[id]} readingIndex={reading.get(id) ?? 0} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
