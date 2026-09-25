import type { Block, Frame, Layout } from '../types/block';

export type ReorderDirection = 'forward' | 'backward' | 'front' | 'back';

/** Actions that change the layout and are recorded in undo history. */
export type LayoutAction =
  | { type: 'add'; blocks: Block[] }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'resize'; id: string; w: number; h: number }
  | { type: 'setFrame'; id: string; frame: Partial<Frame> }
  | { type: 'updateProps'; id: string; patch: Record<string, unknown> }
  | { type: 'delete'; id: string }
  | { type: 'duplicate'; id: string; newId: string }
  | { type: 'reorder'; id: string; direction: ReorderDirection }
  | { type: 'load'; layout: Layout }
  | { type: 'clear' };

export interface Notice {
  id: number;
  kind: 'info' | 'error';
  text: string;
}

export type StoreAction =
  | LayoutAction
  | { type: 'select'; id: string | null }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'notify'; kind: Notice['kind']; text: string }
  | { type: 'dismissNotice'; id: number };
