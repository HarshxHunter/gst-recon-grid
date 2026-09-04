# GST Reconciliation Grid — prototype

A small React + TypeScript prototype of a Sheets-like grid for reconciling
purchase records against GSTR-2B: 1,000 mock invoice rows, smooth virtualized
scrolling, inline editing, status color-coding, row selection, a bulk action,
a mismatch filter, and sortable amount/status columns.

## Running it

```bash
npm install
npm run dev
```

## What's implemented

- **1,000 rows** of mock invoice data, generated programmatically from a
 small set of real-looking vendors (`src/data/generateInvoices.ts`), with a
 seeded PRNG so the dataset is stable across reloads instead of reshuffling
 every render.
- **Virtualized scrolling** — only the rows in (and just outside) the
 viewport are mounted, so scroll performance doesn't degrade with row count.
- **Inline editing** on the taxable amount column. Editing a row recomputes
 its IGST/CGST/SGST/total at the existing tax rate and resets its status to
 `unreconciled`, per the brief — an edit should re-enter the review queue,
 not silently stay "matched."
- **Status color-coding** — a left border strip and a status badge per row,
 using distinct colors for matched / mismatch / missing states.
- **Row selection** — per-row checkboxes, a header checkbox for select/deselect
 all *currently visible* rows (respects the active filter), with an
 indeterminate state when some but not all visible rows are selected.
- **Bulk action** — "Mark selected as reconciled" sets the selected rows'
 status to `matched` and clears the selection.
- **Nice-to-have: mismatch filter** — a toggle that hides `matched` rows so
 an accountant can focus on what actually needs review.
- **Nice-to-have: column sorting** — click "Taxable amt," "Our total,"
 "GSTR-2B total," or "Status" to sort (a muted ⇅ marks sortable columns;
 it turns into a solid ▲/▼ on the active one). Status sorts by triage
 priority (missing → GSTIN mismatch → amount mismatch → unreconciled →
 matched) rather than alphabetically, and GSTR-2B total sorts missing
 (`null`) invoices to the front instead of crashing or dropping them to
 the bottom. The brief said to pick one nice-to-have; I built the filter
 first to stay in scope, then added sorting afterward since TanStack
 Table's sorted-row-model plugs into the same table instance for free and
 it's the one addition that most directly helps triage on a real dataset.

## Library choice, and why

**TanStack Table (v8, headless) + TanStack Virtual** for the grid itself.

I picked this over an all-in-one grid like AG Grid deliberately: TanStack
Table only handles column definitions, row selection state, and rendering
logic — it doesn't dictate any markup or styling, so the grid renders as a
plain CSS Grid I fully control (which also made it straightforward to add
the colored status strip and the "click cell to edit" affordance without
fighting a component library's opinions). TanStack Virtual is a small,
focused windowing library that plugs into any scroll container. Together
they're a few KB, well-typed, and each piece is doing exactly one job —
which felt like the right trade-off for a grid whose row count is the whole
point of the exercise, versus reaching for a heavier batteries-included grid
whose defaults I'd then need to override.

I explicitly avoided TanStack Table v9 (currently in a beta-ish state with a
noticeably different, less-established API surface) in favor of the
well-documented, widely-used v8 API.

State is plain `useState`/`useMemo` in `App.tsx` — at 1,000 rows there's no
real need for a state library, and introducing one would be adding
abstraction the problem doesn't call for.

## If I had more time, I'd improve

1. **Keyboard navigation** — arrow keys between cells, Tab to move through
 the editable column, Enter to start/commit an edit without a mouse.
2. **Undo for the bulk action** — right now "mark as reconciled" is
 immediate and only reversible by re-editing each row; a toast with an
 undo affordance would be safer for a real accountant workflow.
3. **Inline GSTIN format validation** — flagging invalid GSTIN patterns as
 you type would catch typos during the edit itself rather than after
 the fact.

## AI tool usage

I used Claude to scaffold the project (Vite + TS + TanStack Table/Virtual),
draft the column definitions and virtualized row rendering, write the mock
data generator, and later add the column-sorting nice-to-have. I reviewed
and adjusted the generated code myself — in particular, swapping TanStack
Table to the stable v8 API after checking what actually got installed, and
reworking the toolbar copy to avoid generic "AI-generated UI" tells. Sorting
initially shipped broken (a table-level `enableSorting: false` silently
disabled every column instead of just setting a default), which Claude
caught and fixed by tracing it to TanStack Table's actual `getCanSort()`
source rather than guessing, then confirmed the fix with a headless-browser
click-through instead of asserting it worked from reading the code alone.
All logic was read through and reasoned about line by line rather than
taken as-is.
