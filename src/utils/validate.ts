import {
  ALIGNMENTS,
  BLOCK_TYPES,
  IMAGE_FITS,
  LAYOUT_VERSION,
  type Block,
  type BlockType,
  type Layout,
  type PropsOf,
} from '../types/block';
import { BLOCK_DEFINITIONS } from './blockDefaults';
import {
  FONT_SIZE,
  MAX_BLOCKS,
  MAX_IMPORT_BYTES,
  MAX_LABEL_LENGTH,
  MAX_TEXT_LENGTH,
  RADIUS,
} from './constants';
import { clampFrame, createId } from './helpers';
import {
  clampNumber,
  pickEnum,
  sanitizeColor,
  sanitizeImageUrl,
  sanitizeLinkUrl,
  sanitizeText,
} from './sanitize';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isBlockType = (value: unknown): value is BlockType =>
  BLOCK_TYPES.includes(value as BlockType);

/**
 * Builds a fresh props object for `type` from untrusted input. Only known keys
 * are read and every value is sanitised, falling back to the default when it
 * is missing or invalid. Because the result is a new object literal, extra
 * keys (including `__proto__` / `constructor`) never make it into state.
 */
export function sanitizeProps<T extends BlockType>(type: T, raw: unknown): PropsOf<T> {
  const input = isRecord(raw) ? raw : {};
  const d = BLOCK_DEFINITIONS[type].props;
  const radius = (fallback: number) => clampNumber(input.radius, RADIUS.min, RADIUS.max, fallback);

  switch (type) {
    case 'text': {
      const t = d as PropsOf<'text'>;
      const props: PropsOf<'text'> = {
        text: typeof input.text === 'string' ? sanitizeText(input.text, MAX_TEXT_LENGTH) : t.text,
        fontSize: clampNumber(input.fontSize, FONT_SIZE.min, FONT_SIZE.max, t.fontSize),
        color: sanitizeColor(input.color, t.color),
        align: pickEnum(input.align, ALIGNMENTS, t.align),
        bold: typeof input.bold === 'boolean' ? input.bold : t.bold,
      };
      return props as PropsOf<T>;
    }
    case 'image': {
      const i = d as PropsOf<'image'>;
      const props: PropsOf<'image'> = {
        src: sanitizeImageUrl(input.src),
        alt: sanitizeText(input.alt, MAX_LABEL_LENGTH * 2),
        fit: pickEnum(input.fit, IMAGE_FITS, i.fit),
        radius: radius(i.radius),
      };
      return props as PropsOf<T>;
    }
    case 'button': {
      const b = d as PropsOf<'button'>;
      const props: PropsOf<'button'> = {
        label:
          typeof input.label === 'string' ? sanitizeText(input.label, MAX_LABEL_LENGTH) : b.label,
        href: sanitizeLinkUrl(input.href),
        background: sanitizeColor(input.background, b.background),
        color: sanitizeColor(input.color, b.color),
        align: pickEnum(input.align, ALIGNMENTS, b.align),
        radius: radius(b.radius),
      };
      return props as PropsOf<T>;
    }
    case 'container': {
      const c = d as PropsOf<'container'>;
      const props: PropsOf<'container'> = {
        background: sanitizeColor(input.background, c.background),
        borderColor: sanitizeColor(input.borderColor, c.borderColor),
        radius: radius(c.radius),
      };
      return props as PropsOf<T>;
    }
    default:
      throw new Error('Unknown block type');
  }
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Returns a clean block, or null when the entry is not recognisable as one. */
export function validateBlock(raw: unknown, usedIds: Set<string>): Block | null {
  if (!isRecord(raw) || !isBlockType(raw.type)) return null;
  const { x, y, w, h } = raw;
  if (![x, y, w, h].every(isFiniteNumber)) return null;

  let id = typeof raw.id === 'string' && SAFE_ID.test(raw.id) ? raw.id : '';
  if (!id || usedIds.has(id)) id = createId();
  usedIds.add(id);

  const frame = clampFrame({ x: x as number, y: y as number, w: w as number, h: h as number });
  return { id, type: raw.type, ...frame, props: sanitizeProps(raw.type, raw.props) } as Block;
}

export type ParseResult =
  | { ok: true; layout: Layout; skipped: number }
  | { ok: false; error: string };

/** Parses and validates an untrusted layout document (file, paste or localStorage). */
export function parseLayout(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'File is too large (limit is 2 MB).' };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This is not valid JSON.' };
  }

  if (!isRecord(data) || !Array.isArray(data.blocks)) {
    return { ok: false, error: 'Not a layout file: expected an object with a "blocks" array.' };
  }
  if (data.version !== LAYOUT_VERSION) {
    return { ok: false, error: `Unsupported layout version (expected ${LAYOUT_VERSION}).` };
  }
  if (data.blocks.length > MAX_BLOCKS) {
    return { ok: false, error: `Too many blocks (limit is ${MAX_BLOCKS}).` };
  }

  const layout: Layout = { blocks: {}, order: [] };
  const usedIds = new Set<string>();
  let skipped = 0;

  for (const raw of data.blocks) {
    const block = validateBlock(raw, usedIds);
    if (!block) {
      skipped++;
      continue;
    }
    layout.blocks[block.id] = block;
    layout.order.push(block.id);
  }

  return { ok: true, layout, skipped };
}
