# Drag-and-Drop Page Builder

A small page builder built with React, TypeScript and Vite. You add blocks (text, image, button, container) from a palette, drag them around a 12-column grid, resize them, edit them in a properties panel, and save or load the layout as JSON.

## Getting started

Requires Node 20.19+ or 22.12+ (a Vite 8 requirement).

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit + component tests (Vitest, React Testing Library)
npm run build      # type-check and production build
npm run preview    # serve the production build (with the CSP applied)
npm run lint       # oxlint
```

No environment variables or API keys are needed.

## Features

- **Palette:** drag a block onto the canvas, or click it to add it at the bottom.
- **Canvas:** move blocks by dragging, resize with the corner handle, snap to a 12 × N grid. Blocks dragged past the edge are pinned to it.
- **Selection:** click a block to select it; click empty canvas or press `Esc` to deselect.
- **Properties panel:** content, colours, font size, alignment, image fit, link, corner radius, plus position/size, stacking order, duplicate and delete. Changes show up live.
- **Save / load:** autosaves to `localStorage` (debounced), exports to a `.json` file, imports from a file or pasted JSON.
- **Undo / redo:** toolbar buttons or `Ctrl/⌘+Z`, `Ctrl/⌘+Shift+Z`. Typing in a field counts as one undo step.
- **Keyboard:** arrows move the selected block, `Shift`+arrows resize it, `Delete` removes it, `Ctrl/⌘+D` duplicates it. Shortcuts only work in Edit mode, so they never change blocks you can't see.
- **Preview:** renders the output with desktop / tablet / mobile widths. Below 600px the layout stacks into one column in reading order.
- **+500 blocks:** fills the canvas for performance testing.

## Project structure

```
src/
├── components/
│   ├── Canvas.tsx            board, drop target, empty state
│   ├── Block.tsx             one memoised block (select, drag, resize)
│   ├── Palette.tsx           block types
│   ├── PropertiesPanel.tsx   editors per block type
│   ├── Toolbar.tsx           history, import/export, mode switch, save status
│   ├── Preview.tsx           responsive rendered output
│   ├── ImportDialog.tsx      paste-JSON import
│   ├── Notices.tsx           toasts
│   ├── blocks/BlockContent.tsx  how each block type renders
│   └── fields/Fields.tsx     reusable form fields
├── hooks/
│   ├── useBuilder.ts         selector hooks + commands
│   ├── useGridDrag.ts        pointer drag / resize engine
│   ├── useKeyboardShortcuts.ts
│   ├── useAutosave.ts
│   └── useLayoutIO.ts        import / export flows
├── state/
│   ├── store.ts              external store, history, notices
│   ├── reducer.ts            pure layout reducer
│   ├── actions.ts            action types
│   ├── commands.ts           stable command API used by components
│   └── BuilderProvider.tsx
├── types/block.ts
└── utils/
    ├── validate.ts           untrusted JSON → layout
    ├── serialize.ts          layout → JSON (allowlisted fields)
    ├── sanitize.ts           text, URL, colour, number sanitisers
    ├── storage.ts            safe localStorage access
    ├── blockDefaults.ts      block registry (labels, sizes, default props)
    ├── helpers.ts
    └── constants.ts
```

Components hold no business logic. They read state through selector hooks and change it through `commands`. The reducer, validation and serialization are plain TypeScript with no React, which is why they're easy to test.

## Architecture decisions

### State: a small external store with selectors

The layout lives in one store: `blocks` keyed by id, plus an `order` array that also sets stacking. Components subscribe with `useSyncExternalStore` and a selector, for example `useBlock(id)` or `useIsSelected(id)`, and re-render only when the value they selected changes.

I didn't use a single React Context because every consumer re-renders whenever the context value changes, and on a board that means every block. Zustand would have worked too. The store here is about 135 lines including undo/redo, and it avoids adding a dependency.

State is the only source of truth. The canvas, preview and properties panel all render from it. Nothing reads positions back from the DOM, except the one-off size measurement taken when a drag starts.

### Drag and drop: a custom Pointer Events hook

`useGridDrag` handles move and resize. I built it myself instead of using dnd-kit or react-dnd because of the performance requirement:

- While the pointer is down, the block is moved by writing `transform` directly to its DOM node, at most once per animation frame. React doesn't render at all during the drag.
- On release the store gets **one** `move` or `resize` action. Only that block's object is replaced, so only that block re-renders.
- Pointer capture keeps fast drags and drags outside the window attached to the block. `pointercancel`, a lost capture or `Esc` restores the original position.
- The hook only writes style properties React never sets (`transform` for move, `width`/`height` for resize), so ending a drag can't put a stale value back over what React rendered. If the block changes from elsewhere mid-drag (a keyboard nudge, undo), the drag is cancelled and that change wins.
- The grid maths (`utils/drag.ts`) is a pure function with its own unit tests.
- It works the same with mouse, touch and pen. Unselected blocks keep `touch-action: pan-y` so the canvas still scrolls on phones; a selected block takes over touch gestures.

Adding from the palette uses native HTML5 drag and drop with a custom MIME type, and there's a click-to-add fallback for touch and keyboard.

### Grid units instead of pixels

Blocks store `x, y, w, h` in grid cells: 12 columns and 40px rows. Because of that, the layout scales with the canvas width, snapping comes for free, and keeping blocks in bounds is a simple clamp. It also lets the same data render as CSS Grid in the preview.

## Performance

- Moving or editing a block re-renders that block only. Selecting a block re-renders only the old and new selection. The Canvas re-renders only when blocks are added, removed or reordered, or when the board height changes.
- `Block`, the content components, fields and panels are wrapped in `React.memo`. Handlers are stable: `commands` is created once per store, and components use `useCallback` or pass a single `(name, value)` field handler. Style objects are built with `useMemo`.
- The reducer returns the same object when an action changes nothing, so subscribers aren't notified and no undo step is recorded.
- Autosave is debounced and runs outside React. The save status label is its own component, so updating it doesn't re-render the toolbar.
- The drop-target highlight during a palette drag is a DOM attribute, not React state, so `dragover` events don't cause renders.

The palette isn't virtualised because it has only four items. The scaling pressure is on the canvas, and that's covered by per-block subscriptions and a drag that doesn't touch React.

### Measurements

`src/components/Canvas.test.tsx` checks re-render isolation automatically on a 200-block board: moving or editing one block renders exactly that block, and a selection change renders exactly two.

I also ran a drag test against the production build in headless Chrome, with 501 blocks on the board. A MutationObserver watched the board while a block was dragged over 120 pointer moves, and a rAF loop recorded frame times.

| Run | DOM changes outside the dragged block while moving | Median frame | p95 frame |
|---|---|---|---|
| 1 | 0* | 16.7 ms | 16.8 ms |
| 2 | 0* | 16.7 ms | 16.7 ms |
| 3 | 0* | 16.7 ms | 16.7 ms |

\*Two mutations were recorded in each run, both from the selection change on `pointerdown` (the previous block losing its outline and resize handle). None happened while the pointer was moving. The slowest frame in any run was 16.8 ms.

At the 2,000-block limit, a keystroke in the properties panel (store update plus render) took a median of 3.6 ms, a keyboard move 1.1 ms, and no long tasks were recorded while typing or autosaving.

To reproduce it by hand: click **+500 blocks**, open React DevTools → Profiler, turn on "Highlight updates", and drag a block. Nothing flashes until you release, and then only the moved block does.

## Security

- **No HTML rendering of user input.** Text, labels and alt text are rendered as React text nodes. The project never uses `dangerouslySetInnerHTML`. Typing `<img src=x onerror=alert(1)>` into a text block displays it as literal text, and a test checks this.
- **Every input goes through one sanitiser.** Property edits, file imports, pasted JSON and `localStorage` all pass through `sanitizeProps` (`utils/validate.ts`). It builds a new object from known keys only, so unknown keys and `__proto__`/`constructor` payloads never reach state.
- **URLs** are parsed with `new URL()` and checked against an allowlist. Images accept `http:` and `https:`; links also accept `mailto:`. `javascript:`, `data:`, `vbscript:`, `file:`, relative URLs and obfuscated variants such as `java\tscript:` are rejected. In the panel, a rejected URL shows an inline error and is never saved. URLs are checked again when rendering. Links open with `rel="noopener noreferrer nofollow"`, and images use `referrerPolicy="no-referrer"`.
- **Style values** are never taken as free text. Colours must match `#rrggbb`. Numbers are clamped to fixed ranges. Alignment and fit must be one of a fixed set of values. A colour field therefore can't carry `url(...)` or extra CSS declarations.
- **Import validation.** Files over 2 MB, invalid JSON, a wrong root shape, an unknown `version` or more than 2000 blocks are rejected outright, and the current layout is left unchanged. Blocks with unknown types or broken frames are skipped and counted ("Imported 12 blocks, skipped 2 invalid"). Frames are clamped into the grid. Duplicate or unsafe ids are regenerated. Control and bidi-override characters are stripped from text.
- **Export** copies fields one by one instead of spreading objects, so only layout data (`version`, `grid`, `blocks`) is written.
- **Foreign drops** (files, links, text from other apps) onto the canvas are refused.
- **Content Security Policy.** The production build adds a strict CSP: `default-src 'self'`, no inline scripts or styles, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`. It isn't applied to the dev server because Vite's hot reload needs inline scripts.
- **No secrets.** There are no keys, tokens or environment variables, and nothing user-entered is logged.

## Edge cases handled

| Case | Behaviour |
|---|---|
| Empty canvas | Empty state with instructions; Export tells you there's nothing to export |
| Deleting a block | Selection is cleared; undo brings the block back |
| Invalid or malformed import | Clear error message; current layout untouched |
| Partly valid import | Valid blocks load; skipped count shown |
| Block dragged out of bounds | Clamped to the board edge during the drag and on drop |
| Rapid drag operations | One drag at a time; extra pointers and secondary buttons ignored; drag state cleaned up on cancel, lost capture or unmount |
| Reloading | Layout restored from `localStorage` and validated like an import. If it can't be restored, the raw data is copied to a backup key before autosave can overwrite it |
| Block limit (2,000) | Enforced on every add, not only on import, so anything you can build or export loads back; a notice explains when a block is refused |
| Typing a URL and clicking away | A valid pending URL is saved even though clicking another block removes the field before it loses focus |
| Keys pressed in Preview | Ignored; shortcuts only act while the canvas is visible |
| Storage unavailable or full | "Couldn't save to this browser" status; the app keeps working |
| Broken image URL | Placeholder shown instead of a broken image |

## Testing

```bash
npm test
```

- `utils/validate.test.ts`: sanitisers, malicious and malformed imports, prototype pollution, clamping, id handling, serialization round trip, export allowlist.
- `state/store.test.ts`: object identity after updates, no-op handling, clamping, undo/redo, merging of rapid edits, sanitised patches, selection cleanup, reordering.
- `utils/drag.test.ts`: drag and resize maths, clamping, snapping.
- `components/Canvas.test.tsx`: render isolation, XSS rendering, empty state, foreign drops.
- `components/PropertiesPanel.test.tsx`: pending URLs survive a selection change; unsafe URLs are still never saved.
- `App.test.tsx`: keyboard shortcuts act in Edit mode and are ignored in Preview.
- `state/store.test.ts` also checks that a layout at the block limit round-trips through export and import, and that unreadable saves are backed up.

## Known limitations and next steps

- Containers are visual backgrounds. Blocks sit on top of them but aren't nested inside, so moving a container doesn't move its contents. Nesting would turn the layout into a tree and needs group drag.
- Blocks can overlap. That's intentional for layering, but there are no collision rules or alignment guides beyond grid snapping.
- There's no multi-select.
- The drag maths is unit-tested, but the pointer handling isn't, because jsdom doesn't implement pointer capture. A Playwright test would be the next step.
