import { useEffect } from 'react';
import { useBuilderStore, useCommands } from './useBuilder';

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Global shortcuts. State is read at key time through the store rather than
 * subscribed to, so this hook never causes a render. Only enabled while the
 * canvas is visible, so keys never change blocks the user can't see.
 */
export function useKeyboardShortcuts({ enabled }: { enabled: boolean }) {
  const store = useBuilderStore();
  const commands = useCommands();

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target) || document.querySelector('dialog[open]')) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) commands.redo();
        else commands.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        commands.redo();
        return;
      }

      const { selectedId, layout } = store.getState();
      const block = selectedId ? layout.blocks[selectedId] : undefined;
      if (!block) return;

      if (e.key === 'Escape') {
        commands.select(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        commands.remove(block.id);
      } else if (mod && key === 'd') {
        e.preventDefault();
        commands.duplicate(block.id);
      } else if (ARROWS[e.key]) {
        e.preventDefault();
        const [dx, dy] = ARROWS[e.key];
        if (e.shiftKey) commands.resize(block.id, block.w + dx, block.h + dy);
        else commands.move(block.id, block.x + dx, block.y + dy);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, store, commands]);
}
