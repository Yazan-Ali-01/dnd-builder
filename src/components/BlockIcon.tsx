import type { BlockType } from '../types/block';

const PATHS: Record<BlockType, string> = {
  text: 'M4 6h16M4 12h16M4 18h10',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  button: 'M3 8h18v8H3zM8 12h8',
  container: 'M3 4h18v16H3zM3 9h18',
};

export function BlockIcon({ type }: { type: BlockType }) {
  return (
    <svg
      className="block-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[type]} />
    </svg>
  );
}
