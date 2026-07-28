# A-M3 Multi-scale Return Continuity — implementation review

```text
Repository: a20030824/menu-lens
Base branch: main
Base commit: 54bde49c6c1df800ba2e8d1b014c2a2b9eef9177
Prototype: 06 Multi-scale Menu Map
Change type: M
```

## Unique variable

A-M3 changes only **focus-to-overview return continuity**.

Before expanding a category, the controller records the source category button and its viewport position. Reset then:

1. closes any open Product detail;
2. collapses the focused category;
3. waits for the collapsed layout to settle;
4. restores the same category button to its previous viewport position;
5. returns keyboard focus to that button.

While a category is expanded, the existing topbar becomes one compact sticky row so the original `回到全店概覽` action remains reachable during deep reading.

## View evidence

![Parent 06 / A-M3 return-continuity record](parent-child-contact-sheet.svg)

Machine-readable Chromium measurements are in `browser-checks.json`.

## Preserved behavior

- one category expanded at a time;
- five neighboring categories remain collapsed in canonical positions;
- six categories and 30 unique Products;
- category count, range and summary payload unchanged;
- Product rows and inline detail unchanged;
- existing scale labels unchanged;
- no retained-menu truth copy from A-M4;
- no Product landmarks from 06A;
- no Candidate, comparison, cart, order or transaction flow.

## Browser result

Across 320px, 390px and desktop:

- parent source-position drift after reset: about 522px;
- A-M3 source-position error after reset: 0–1px;
- parent reset action unavailable during deep reading;
- A-M3 reset action remains visible as a compact sticky row;
- open Product detail is cleared;
- exactly zero categories remain expanded after reset;
- focus returns to the original category button;
- no horizontal overflow;
- reduced motion uses immediate scrolling.

Keyboard Enter/Space follows the same return contract.

## Archive coordination

This is a mechanism correction to prototype 06, not a registry child. `prototype-registry.js`, the archive index, `menu-fixture.js`, `multiscale-menu-renderer.js`, `history.css` and `evidence.css` remain untouched.

A-M4 retained-menu truth wording and 06A Product-bearing Landmarks remain separate later changes.

## Actual judgment

```text
Implementation result: PASS
Product-direction result: PASS as prerequisite correction
```

A-M3 makes the existing scale transition reversible without changing collapse amount, summary content or Product membership. It resolves the continuity prerequisite only; it does not yet address filter trust or landmark quality.
