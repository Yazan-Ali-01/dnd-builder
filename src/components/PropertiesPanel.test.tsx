import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { useBuilderStore } from '../hooks/useBuilder';
import { BuilderProvider } from '../state/BuilderProvider';
import type { BuilderStore } from '../state/store';
import type { Layout } from '../types/block';
import { createBlock } from '../utils/helpers';
import { PropertiesPanel } from './PropertiesPanel';

function renderPanel() {
  const image = createBlock('image', { x: 0, y: 0 });
  const text = createBlock('text', { x: 0, y: 6 });
  const layout: Layout = { blocks: { [image.id]: image, [text.id]: text }, order: [image.id, text.id] };
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
      <PropertiesPanel />
    </BuilderProvider>,
  );
  act(() => store.dispatch({ type: 'select', id: image.id }));
  return { store, image, text };
}

describe('PropertiesPanel URL field', () => {
  it('keeps a typed URL when the selection changes before blur', () => {
    const { store, image, text } = renderPanel();
    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'https://example.com/cat.png' } });
    act(() => store.dispatch({ type: 'select', id: text.id }));
    expect(store.getState().layout.blocks[image.id].props).toMatchObject({ src: 'https://example.com/cat.png' });
  });

  it('keeps a typed URL when the block is deselected', () => {
    const { store, image } = renderPanel();
    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'https://example.com/a.png' } });
    act(() => store.dispatch({ type: 'select', id: null }));
    expect(store.getState().layout.blocks[image.id].props).toMatchObject({ src: 'https://example.com/a.png' });
  });

  it('still never commits an unsafe URL', () => {
    const { store, image } = renderPanel();
    const input = screen.getByLabelText('Image URL');
    fireEvent.change(input, { target: { value: 'javascript:alert(1)' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert')).toHaveTextContent(/only http/i);
    act(() => store.dispatch({ type: 'select', id: null }));
    expect(store.getState().layout.blocks[image.id].props).toMatchObject({ src: '' });
  });
});
