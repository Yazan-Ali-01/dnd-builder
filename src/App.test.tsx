import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { BuilderProvider } from './state/BuilderProvider';
import type { Layout } from './types/block';
import { createBlock } from './utils/helpers';

function renderApp() {
  const block = createBlock('text', { x: 0, y: 0 });
  const layout: Layout = { blocks: { [block.id]: block }, order: [block.id] };
  render(
    <BuilderProvider initialLayout={layout}>
      <App />
    </BuilderProvider>,
  );
}

describe('keyboard shortcuts', () => {
  it('delete the selected block in edit mode', () => {
    renderApp();
    fireEvent.focus(document.querySelector('.block')!);
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(screen.getByText('Your canvas is empty')).toBeInTheDocument();
  });

  it('do nothing in preview mode, where the canvas is hidden', () => {
    renderApp();
    fireEvent.focus(document.querySelector('.block')!);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    fireEvent.keyDown(window, { key: 'Delete' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const block = document.querySelector('.block');
    expect(block).not.toBeNull();
    expect(block).toHaveAttribute('aria-label', expect.stringContaining('column 1, row 1'));
  });
});
