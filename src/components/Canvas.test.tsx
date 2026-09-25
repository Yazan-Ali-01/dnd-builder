import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBuilderStore } from '../hooks/useBuilder';
import { BuilderProvider } from '../state/BuilderProvider';
import type { BuilderStore } from '../state/store';
import type { Block, Layout } from '../types/block';
import { createBlock } from '../utils/helpers';
import { Canvas } from './Canvas';

// BlockContent renders exactly once per Block render, so counting its calls
// per block id measures how many blocks re-render after each change.
const renders = new Map<string, number>();
vi.mock('./blocks/BlockContent', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./blocks/BlockContent')>();
  return {
    BlockContent: (props: { block: Block }) => {
      renders.set(props.block.id, (renders.get(props.block.id) ?? 0) + 1);
      return mod.BlockContent(props);
    },
  };
});

function renderCanvas(count: number) {
  const blocks = Array.from({ length: count }, (_, i) => createBlock('text', { x: 0, y: i * 2 }));
  const layout: Layout = {
    blocks: Object.fromEntries(blocks.map((b) => [b.id, b])),
    order: blocks.map((b) => b.id),
  };
  let store!: BuilderStore;
  function Grab({ onStore }: { onStore: (s: BuilderStore) => void }) {
    const s = useBuilderStore();
    useEffect(() => onStore(s), [s, onStore]);
    return null;
  }
  render(
    <BuilderProvider initialLayout={layout}>
      <Grab
        onStore={(s) => {
          store = s;
        }}
      />
      <Canvas />
    </BuilderProvider>,
  );
  renders.clear();
  return { store, ids: layout.order };
}

const rendered = () => [...renders.entries()].filter(([, n]) => n > 0).map(([id]) => id);

describe('Canvas render isolation', () => {
  beforeEach(() => renders.clear());

  it('re-renders only the moved block', () => {
    const { store, ids } = renderCanvas(200);
    act(() => store.dispatch({ type: 'move', id: ids[10], x: 4, y: 3 }));
    expect(rendered()).toEqual([ids[10]]);
  });

  it('re-renders only the edited block', () => {
    const { store, ids } = renderCanvas(200);
    act(() => store.dispatch({ type: 'updateProps', id: ids[5], patch: { text: 'changed' } }));
    expect(rendered()).toEqual([ids[5]]);
    expect(screen.getByText('changed')).toBeInTheDocument();
  });

  it('re-renders only the previous and next selection', () => {
    const { store, ids } = renderCanvas(50);
    act(() => store.dispatch({ type: 'select', id: ids[1] }));
    renders.clear();
    act(() => store.dispatch({ type: 'select', id: ids[2] }));
    expect(rendered().sort()).toEqual([ids[1], ids[2]].sort());
  });

  it('renders user text as text, never as markup', () => {
    const { store, ids } = renderCanvas(1);
    act(() => store.dispatch({ type: 'updateProps', id: ids[0], patch: { text: '<img src=x onerror=alert(1)>' } }));
    expect(document.querySelector('.board img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });

  it('shows an empty state and ignores foreign drops', () => {
    renderCanvas(0);
    expect(screen.getByText('Your canvas is empty')).toBeInTheDocument();
    const board = document.querySelector('.board')!;
    fireEvent.drop(board, { dataTransfer: { getData: () => 'script', types: ['text/plain'] } });
    expect(document.querySelectorAll('.block')).toHaveLength(0);
  });
});
