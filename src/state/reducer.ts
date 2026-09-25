import type { Block, Layout } from '../types/block';
import { MAX_BLOCKS } from '../utils/constants';
import { clampFrame, emptyLayout } from '../utils/helpers';
import { sanitizeProps } from '../utils/validate';
import type { LayoutAction, ReorderDirection } from './actions';

/**
 * Pure layout reducer. Updates copy the `blocks` map shallowly and replace
 * only the changed block, so every untouched block keeps its identity. When an
 * action changes nothing, the same layout object is returned and the store
 * skips both notifying subscribers and recording history.
 */
export function layoutReducer(layout: Layout, action: LayoutAction): Layout {
  switch (action.type) {
    case 'add': {
      // The block limit is enforced here, not only on import, so the store can
      // never hold a layout that parseLayout would refuse to load back.
      const room = MAX_BLOCKS - layout.order.length;
      const incoming = action.blocks.filter((b) => !layout.blocks[b.id]).slice(0, Math.max(0, room));
      if (incoming.length === 0) return layout;
      const blocks = { ...layout.blocks };
      const order = [...layout.order];
      for (const block of incoming) {
        blocks[block.id] = block;
        order.push(block.id);
      }
      return { blocks, order };
    }

    case 'move':
    case 'resize':
    case 'setFrame': {
      const block = layout.blocks[action.id];
      if (!block) return layout;
      const patch =
        action.type === 'move'
          ? { x: action.x, y: action.y }
          : action.type === 'resize'
            ? { w: action.w, h: action.h }
            : action.frame;
      const frame = clampFrame({ x: block.x, y: block.y, w: block.w, h: block.h, ...patch });
      if (frame.x === block.x && frame.y === block.y && frame.w === block.w && frame.h === block.h) {
        return layout;
      }
      return replaceBlock(layout, { ...block, ...frame });
    }

    case 'updateProps': {
      const block = layout.blocks[action.id];
      if (!block) return layout;
      const props = sanitizeProps(block.type, { ...block.props, ...action.patch });
      if (shallowEqual(props, block.props)) return layout;
      return replaceBlock(layout, { ...block, props } as Block);
    }

    case 'delete': {
      if (!layout.blocks[action.id]) return layout;
      const blocks = { ...layout.blocks };
      delete blocks[action.id];
      return { blocks, order: layout.order.filter((id) => id !== action.id) };
    }

    case 'duplicate': {
      const source = layout.blocks[action.id];
      if (!source || layout.blocks[action.newId]) return layout;
      // Offset by one row so the copy is visible rather than hidden underneath.
      const frame = clampFrame({ x: source.x, y: source.y + 1, w: source.w, h: source.h });
      const copy = { ...source, ...frame, id: action.newId, props: { ...source.props } } as Block;
      return layoutReducer(layout, { type: 'add', blocks: [copy] });
    }

    case 'reorder': {
      const order = reorder(layout.order, action.id, action.direction);
      return order === layout.order ? layout : { blocks: layout.blocks, order };
    }

    case 'load':
      return action.layout;

    case 'clear':
      return layout.order.length === 0 ? layout : emptyLayout();
  }
}

function replaceBlock(layout: Layout, block: Block): Layout {
  return { blocks: { ...layout.blocks, [block.id]: block }, order: layout.order };
}

function reorder(order: string[], id: string, direction: ReorderDirection): string[] {
  const from = order.indexOf(id);
  if (from === -1) return order;
  const last = order.length - 1;
  const to =
    direction === 'front'
      ? last
      : direction === 'back'
        ? 0
        : direction === 'forward'
          ? Math.min(last, from + 1)
          : Math.max(0, from - 1);
  if (to === from) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

function shallowEqual(a: object, b: object): boolean {
  const ka = Object.keys(a) as (keyof typeof a)[];
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}
