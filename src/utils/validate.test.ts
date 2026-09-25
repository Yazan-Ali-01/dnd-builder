import { describe, expect, it } from 'vitest';
import type { Layout } from '../types/block';
import { createBlock } from './helpers';
import { sanitizeColor, sanitizeImageUrl, sanitizeLinkUrl, sanitizeText } from './sanitize';
import { layoutToJson, serializeLayout } from './serialize';
import { parseLayout } from './validate';

const doc = (blocks: unknown[]) => JSON.stringify({ version: 1, blocks });

describe('sanitizers', () => {
  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '/relative/path',
    '',
  ])('rejects unsafe or relative URL %j', (url) => {
    expect(sanitizeImageUrl(url)).toBe('');
    expect(sanitizeLinkUrl(url)).toBe('');
  });

  it('accepts http(s) URLs and mailto links only where allowed', () => {
    expect(sanitizeImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(sanitizeLinkUrl('mailto:hi@example.com')).toBe('mailto:hi@example.com');
    expect(sanitizeImageUrl('mailto:hi@example.com')).toBe('');
  });

  it('only allows 6-digit hex colours', () => {
    expect(sanitizeColor('#A1B2C3', '#000000')).toBe('#a1b2c3');
    expect(sanitizeColor('red;background:url(//evil)', '#000000')).toBe('#000000');
    expect(sanitizeColor('expression(alert(1))', '#000000')).toBe('#000000');
  });

  it('strips control and bidi-override characters and caps length', () => {
    expect(sanitizeText('a\u0000b‮c', 100)).toBe('abc');
    expect(sanitizeText('x'.repeat(50), 10)).toHaveLength(10);
  });
});

describe('parseLayout', () => {
  it('rejects malformed input without throwing', () => {
    expect(parseLayout('{nope')).toMatchObject({ ok: false });
    expect(parseLayout('null')).toMatchObject({ ok: false });
    expect(parseLayout('[]')).toMatchObject({ ok: false });
    expect(parseLayout('{"blocks": {}}')).toMatchObject({ ok: false });
    expect(parseLayout(JSON.stringify({ version: 99, blocks: [] }))).toMatchObject({ ok: false });
  });

  it('rejects oversized documents and block counts', () => {
    expect(parseLayout(' '.repeat(3 * 1024 * 1024))).toMatchObject({ ok: false });
    const many = Array.from({ length: 2001 }, () => ({ type: 'text', x: 0, y: 0, w: 1, h: 1 }));
    expect(parseLayout(doc(many))).toMatchObject({ ok: false });
  });

  it('skips unrecognisable blocks and keeps valid ones', () => {
    const result = parseLayout(
      doc([{ type: 'text', x: 0, y: 0, w: 2, h: 1 }, { type: 'script' }, 'junk', { type: 'image', x: 'a' }]),
    );
    expect(result.ok && result.layout.order).toHaveLength(1);
    expect(result.ok && result.skipped).toBe(3);
  });

  it('neutralises injection through configurable fields', () => {
    const result = parseLayout(
      doc([
        {
          type: 'button',
          x: 0,
          y: 0,
          w: 3,
          h: 1,
          props: { label: '<b>x</b>', href: 'javascript:alert(1)', background: 'red;x:url(y)', onClick: 'alert(1)' },
        },
      ]),
    );
    if (!result.ok) throw new Error('expected ok');
    const block = result.layout.blocks[result.layout.order[0]];
    expect(block.props).toEqual({
      label: '<b>x</b>', // kept as text; React renders it escaped
      href: '',
      background: '#4f46e5',
      color: '#ffffff',
      align: 'center',
      radius: 6,
    });
  });

  it('ignores __proto__ keys instead of polluting prototypes', () => {
    const text = '{"version":1,"blocks":[{"type":"text","x":0,"y":0,"w":1,"h":1,"__proto__":{"polluted":true},"props":{"__proto__":{"polluted":true}}}]}';
    const result = parseLayout(text);
    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    if (result.ok) {
      const block = result.layout.blocks[result.layout.order[0]];
      expect(Object.keys(block).sort()).toEqual(['h', 'id', 'props', 'type', 'w', 'x', 'y']);
    }
  });

  it('clamps out-of-bounds frames into the grid', () => {
    const result = parseLayout(doc([{ type: 'text', x: 50, y: -4, w: 40, h: 0 }]));
    if (!result.ok) throw new Error('expected ok');
    const { x, y, w, h } = result.layout.blocks[result.layout.order[0]];
    expect({ x, y, w, h }).toEqual({ x: 0, y: 0, w: 12, h: 1 });
  });

  it('replaces duplicate or unsafe ids', () => {
    const result = parseLayout(
      doc([
        { id: 'same', type: 'text', x: 0, y: 0, w: 1, h: 1 },
        { id: 'same', type: 'text', x: 0, y: 1, w: 1, h: 1 },
        { id: '"><script>', type: 'text', x: 0, y: 2, w: 1, h: 1 },
      ]),
    );
    if (!result.ok) throw new Error('expected ok');
    expect(new Set(result.layout.order).size).toBe(3);
    expect(result.layout.order[0]).toBe('same');
    expect(result.layout.order.every((id) => /^[A-Za-z0-9_-]+$/.test(id))).toBe(true);
  });
});

describe('serialization', () => {
  it('round-trips a layout exactly', () => {
    const a = createBlock('text', { x: 1, y: 2 });
    const b = createBlock('image', { x: 4, y: 0 });
    const layout: Layout = { blocks: { [a.id]: a, [b.id]: b }, order: [a.id, b.id] };
    const result = parseLayout(layoutToJson(layout));
    expect(result).toEqual({ ok: true, layout, skipped: 0 });
  });

  it('exports only layout fields', () => {
    const block = { ...createBlock('text', { x: 0, y: 0 }), secret: 'token' };
    const out = serializeLayout({ blocks: { [block.id]: block }, order: [block.id] });
    expect(Object.keys(out)).toEqual(['version', 'grid', 'blocks']);
    expect(JSON.stringify(out)).not.toContain('token');
  });
});
