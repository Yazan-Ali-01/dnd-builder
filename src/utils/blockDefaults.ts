import type { BlockType, Frame, PropsOf } from '../types/block';

interface BlockDefinition<T extends BlockType> {
  label: string;
  description: string;
  size: Pick<Frame, 'w' | 'h'>;
  props: PropsOf<T>;
}

type Registry = { [T in BlockType]: BlockDefinition<T> };

export const BLOCK_DEFINITIONS: Registry = {
  text: {
    label: 'Text',
    description: 'Heading or paragraph',
    size: { w: 6, h: 2 },
    props: { text: 'Edit this text', fontSize: 18, color: '#1f2937', align: 'left', bold: false },
  },
  image: {
    label: 'Image',
    description: 'Picture from a URL',
    size: { w: 4, h: 5 },
    props: { src: '', alt: '', fit: 'cover', radius: 8 },
  },
  button: {
    label: 'Button',
    description: 'Call-to-action link',
    size: { w: 3, h: 1 },
    props: {
      label: 'Click me',
      href: '',
      background: '#4f46e5',
      color: '#ffffff',
      align: 'center',
      radius: 6,
    },
  },
  container: {
    label: 'Container',
    description: 'Background section',
    size: { w: 12, h: 6 },
    props: { background: '#f3f4f6', borderColor: '#d1d5db', radius: 12 },
  },
};
