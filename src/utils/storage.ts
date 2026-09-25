import type { Layout } from '../types/block';
import { STORAGE_KEY } from './constants';
import { layoutToJson } from './serialize';
import { parseLayout, type ParseResult } from './validate';

// localStorage can throw (Safari private mode, quota, disabled storage) and
// its contents can be edited by anyone, so reads go through the same
// validator as imported files.

/** Where an unreadable saved layout is kept so autosave can't overwrite the only copy. */
export const BACKUP_KEY = `${STORAGE_KEY}:unrestorable`;

export function loadStoredLayout(): ParseResult | null {
  let text: string | null;
  try {
    text = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (text === null) return null;
  const result = parseLayout(text);
  if (!result.ok) {
    try {
      localStorage.setItem(BACKUP_KEY, text);
    } catch {
      // Storage full or blocked; the restore notice still tells the user.
    }
  }
  return result;
}

export function saveStoredLayout(layout: Layout): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, layoutToJson(layout));
    return true;
  } catch {
    return false;
  }
}
