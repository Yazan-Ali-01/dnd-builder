export const GRID_COLUMNS = 12;
export const ROW_HEIGHT = 40;
export const MAX_ROWS = 400;
/** Empty rows kept below the lowest block so there is always room to drop. */
export const CANVAS_PADDING_ROWS = 6;
export const MIN_CANVAS_ROWS = 16;

export const MAX_BLOCKS = 2000;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_LABEL_LENGTH = 80;
export const MAX_URL_LENGTH = 2048;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export const FONT_SIZE = { min: 10, max: 96 };
export const RADIUS = { min: 0, max: 48 };

export const STORAGE_KEY = 'dnd-builder:layout';
export const HISTORY_LIMIT = 100;

/** Custom drag type so the canvas only accepts drops that started in the palette. */
export const PALETTE_MIME = 'application/x-dnd-builder-block';
