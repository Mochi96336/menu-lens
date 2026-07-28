# A-M4 Retained-menu Truth Wording — implementation review

```text
Repository: a20030824/menu-lens
Stacked base: agent/menu-lens-06-return-continuity
Parent prerequisite: A-M3 Multi-scale Return Continuity
Prototype: 06 Multi-scale Menu Map
Change type: M
```

## Research question

When one category is expanded, can the existing scale status state clearly that the interface is still showing one complete menu rather than a filtered result?

Prototype 06 keeps all six categories and all 30 Products in the same canonical document. Its previous labels named a scale but did not state what happened to the other Products.

## Unique variable

Only the existing live scale label changes.

```text
overview → 完整菜單 · 6 分類 30 道
focused  → 閱讀 {category name} · 其餘料理未篩除
```

The overview counts are derived from the rendered category and Product nodes. The focused label uses the existing category name and explicitly states that the other Products were not filtered.

No banner, tutorial, legend, Product landmark, second locator, filter state, hidden result count, or new action is introduced.

## Inherited repaired prerequisite

This branch is stacked on the repaired A-M3 and preserves:

- `overflow: clip` on the 06 phone frame so sticky positioning uses the viewport;
- a compact visible reset label `回全店` with accessible name `回到全店概覽`;
- source-category viewport-position capture;
- sticky reset access during focused and deep reading;
- detail clearing on reset;
- layout-settled return;
- keyboard focus restoration;
- reduced-motion immediate return.

A-M4 does not claim those mechanisms as its own change.

## Preserved 06 identity

- one category expanded at a time;
- five categories remain collapsed in canonical positions;
- six categories and 30 unique Products remain in the DOM;
- category name, count, summary, and price range remain unchanged;
- Product rows and inline detail remain unchanged;
- collapse amount and category geometry remain unchanged;
- renderer and shared fixture remain unchanged;
- no Candidate, comparison, cart, order, or transaction behavior.

## Browser gate

The dedicated Chromium matrix covers 320px, 390px, and 1280px across initial, focused, deep, and returned states.

Required at every width:

- exact complete-menu and focused truth wording;
- one expanded category and five collapsed categories;
- all 30 Product nodes retained, including collapsed siblings;
- focused and deep topbar at viewport `top=0`;
- reset action physically visible;
- topbar height at most 48px;
- source-position error at most 1px;
- focus return and detail clearing;
- no document, frame, screen, topbar, label, or reset horizontal overflow;
- no page errors.

Machine-readable evidence is written to `browser-checks.json`; screenshots are uploaded by the dedicated workflow.

## Decision boundary

KEEP only if the truth wording remains compact and physically reachable at every viewport without becoming a second explanation surface.

If unfamiliar readers still interpret focus as filtering after this exact wording is visible, stop the 06 line before 06A Product-bearing Landmarks rather than adding more reassurance copy.

## Boundaries

A-M4 does not add Product names to collapsed landmarks, change category summaries, change collapse amount, add filtering, introduce another view, or collect participant evidence. The branch remains Open + Draft and must not be merged or marked ready as part of this workstream.
