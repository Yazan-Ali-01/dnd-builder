export const BLOCK_TYPES = ['text', 'image', 'button', 'container'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const ALIGNMENTS = ['left', 'center', 'right'] as const;
export type Align = (typeof ALIGNMENTS)[number];

export const IMAGE_FITS = ['cover', 'contain'] as const;
export type ImageFit = (typeof IMAGE_FITS)[number];

/** Position and size in grid units, not pixels, so layouts scale with the canvas. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BaseBlock extends Frame {
  id: string;
}

export interface TextProps {
  text: string;
  fontSize: number;
  color: string;
  align: Align;
  bold: boolean;
}

export interface ImageProps {
  src: string;
  alt: string;
  fit: ImageFit;
  radius: number;
}

export interface ButtonProps {
  label: string;
  href: string;
  background: string;
  color: string;
  align: Align;
  radius: number;
}

export interface ContainerProps {
  background: string;
  borderColor: string;
  radius: number;
}

export type TextBlock = BaseBlock & { type: 'text'; props: TextProps };
export type ImageBlock = BaseBlock & { type: 'image'; props: ImageProps };
export type ButtonBlock = BaseBlock & { type: 'button'; props: ButtonProps };
export type ContainerBlock = BaseBlock & { type: 'container'; props: ContainerProps };

export type Block = TextBlock | ImageBlock | ButtonBlock | ContainerBlock;

export type PropsOf<T extends BlockType> = Extract<Block, { type: T }>['props'];

/**
 * Normalised layout: blocks by id plus a separate order array (also the z-order).
 * Updating one block replaces only that entry, so every other block keeps its
 * object identity and memoised components can skip re-rendering.
 */
export interface Layout {
  blocks: Record<string, Block>;
  order: string[];
}

export const LAYOUT_VERSION = 1;

export interface SerializedLayout {
  version: typeof LAYOUT_VERSION;
  grid: { columns: number; rowHeight: number };
  blocks: Block[];
}
