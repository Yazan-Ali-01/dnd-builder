import type { Layout } from '../types/block';
import { STORAGE_KEY } from './constants';
import { layoutToJson } from './serialize';
import { parseLayout, type ParseResult } from './validate';

// localStorage can throw (Safari private mode, quota, disabled storage) and
// its contents can be edited by anyone, so reads go through the same
// validator as imported files.

export function loadStoredLayout(): ParseResult | null {
  let text: string | null;
  try {
    text = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  return text === null ? null : parseLayout(text);
}

export function saveStoredLayout(layout: Layout): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, layoutToJson(layout));
    return true;
  } catch {
    return false;
  }
}
