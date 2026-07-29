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

## Narrow wording fit

The full focused truth wording was 8px wider than its available label box at 320px even though the topbar and document themselves did not overflow. A-M4 therefore applies one typographic fit rule below 341px:

```text
scale label font size: .88rem → .84rem
```

The wording, button, topbar height, interaction, and category geometry remain unchanged. At 320px the focused label now measures about 188px with a 188px scroll width, so no text is clipped.

## Preserved 06 identity

- one category expanded at a time;
- five categories remain collapsed in canonical positions;
- six categories and 30 unique Products remain in the DOM;
- category name, count, summary, and price range remain unchanged;
- Product rows and inline detail remain unchanged;
- collapse amount and category geometry remain unchanged;
- renderer and shared fixture remain unchanged;
- no Candidate, comparison, cart, order, or transaction behavior.

## Final browser result

The Chromium matrix covers 320px, 390px, and 1280px across initial, focused, deep, and returned states.

At every width:

- overview label is exactly `完整菜單 · 6 分類 30 道`;
- focused and deep label is exactly `閱讀 分享料理 · 其餘料理未篩除`;
- one category is expanded and five remain collapsed;
- all 30 Product nodes remain present, including 24 Products under collapsed siblings;
- focused and deep topbar viewport top is `0px`;
- focused and deep topbar height is about `46.95px`;
- reset action is physically visible;
- source-position error after reset is `0px`;
- focus returns and open detail clears;
- no document, frame, screen, topbar, label, or reset horizontal overflow;
- no page errors.

Initial and returned topbar height is about `42.77px`. The final report contains no failures.

Machine-readable evidence is in `browser-checks.json`; viewport screenshots are uploaded by the dedicated workflow.

## Actual judgment

```text
Implementation result: PASS after inherited sticky repair and narrow label fit
Mechanism result: KEEP as a prerequisite correction
Participant result: not collected
```

A-M4 makes the existing state truthful without adding another explanation surface or changing the collapse model. It is technically suitable for direct trust evaluation together with repaired A-M3.

This does not establish that unfamiliar readers believe the collapsed categories still contain the complete menu. That remains the external evidence gate.

## Decision boundary

If unfamiliar readers still interpret focus as filtering after this exact wording is visible, stop the 06 line before 06A Product-bearing Landmarks rather than adding more reassurance copy.

## Boundaries

A-M4 does not add Product names to collapsed landmarks, change category summaries, change collapse amount, add filtering, introduce another view, or collect participant evidence. The branch remains Open + Draft and must not be merged or marked ready as part of this workstream.
