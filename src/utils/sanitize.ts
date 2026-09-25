import { MAX_URL_LENGTH } from './constants';

/*
 * Every user-controlled value passes through one of these before it reaches
 * state. Text is still rendered as React text nodes (never as HTML), so these
 * are a second layer: they bound size and strip characters with no place in
 * layout content.
 */

// C0 control characters except tab/newline, DEL, and bidi overrides that can
// visually disguise text (e.g. "Trojan Source" style spoofing).
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;

export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(UNSAFE_CHARS, '').slice(0, maxLength);
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Only 6-digit hex reaches a style attribute, so a colour field can't carry `url(...)`, `expression(...)` or extra declarations. */
export function sanitizeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const IMAGE_PROTOCOLS = new Set(['https:', 'http:']);
const LINK_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);

function sanitizeUrl(value: unknown, protocols: Set<string>): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return '';
  try {
    // Parsing without a base rejects relative URLs; the URL parser also
    // normalises tricks like "java\tscript:" or leading whitespace.
    const url = new URL(trimmed);
    return protocols.has(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

/** http(s) only; blocks javascript:, data:, blob:, file: and friends. */
export function sanitizeImageUrl(value: unknown): string {
  return sanitizeUrl(value, IMAGE_PROTOCOLS);
}

/** http(s) and mailto only. */
export function sanitizeLinkUrl(value: unknown): string {
  return sanitizeUrl(value, LINK_PROTOCOLS);
}
