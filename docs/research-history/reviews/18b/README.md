# 18B Semantic Zoom — implementation review

## Scope

- Base: `main`
- Base SHA: `54bde49c6c1df800ba2e8d1b014c2a2b9eef9177`
- Parent: `18 Landscape Paper`
- Child: `18B Semantic Zoom`
- Branch: `agent/menu-lens-18b-semantic-zoom`
- Result: **KEEP**

## Unique variable

Only the information representation in the existing `overview` scale changes.

- category name and fixture price range remain in the original header;
- category `summary` becomes the readable overview phrase;
- each region states its complete Product count and that reading scale restores the menu;
- all original Product rows remain in their exact positions as density traces;
- entering `reading` restores the real Product name, price and availability text.

The summary stays inside each existing category region. It does not introduce a second map, cards, axes, filters, tabs, weighting, collapse or another navigation surface.

## Parent behavior preserved

- fixed three-column × two-category topology;
- equal outer columns (`1:1:1`);
- row ratios (`8:6`, `6:4`, `4:2`);
- 46rem overview sheet and 64rem reading sheet;
- existing drag, inertia, column snap and camera calculations;
- category and Product activation grammar;
- detail overlay, close, focus return and reset;
- six categories and 30 unique ProductIds.

## Narrow continuation revision

The first browser comparison found that a longer child-specific hint wrapped at 390px and reduced the existing paper stage height from `602.359375px` to `586px`.

The only UI revision restored parent 18's exact hint copy. The evidence runner also stopped comparing absolute document `top` coordinates, which differ because the prototype's surrounding research explanation is longer; it continues comparing paper left positions, widths and heights.

After this revision, parent and child have `0px` maximum column and category geometry delta at 320px, 390px and desktop.

## Deliberately excluded

- tap-to-read changes;
- row or column weighting;
- camera tracking;
- paired-category collapse;
- detail placement changes;
- vertical writing;
- Candidate, comparison, cart, order or transaction behavior.

## Evidence

Browser evidence is committed in `research-history/review-assets/18b/`:

- `parent-320.png` / `child-320.png`;
- `parent-390.png` / `child-390.png`;
- `parent-desktop.png` / `child-desktop.png`;
- `browser-report.json`.

The final browser report records:

- six categories, 30 Products and 30 unique ProductIds;
- six fixture-backed overview summaries;
- `0px` maximum column and category geometry delta in all three viewports;
- Product text hidden visually at overview and restored at reading;
- detail open, close and focus return;
- reset to overview at `scrollLeft = 0`;
- keyboard entry to reading;
- reduced-motion scrolling with `behavior: auto`;
- pointer drag moving the paper from `0` to `364`.

Repository formal checks passed in the implementation workflow and the normal pull-request workflow:

```text
npm run typecheck
npm test
npm run build
```

## Final judgment

**KEEP.** The semantic overview improves category-level comprehension without changing the landscape substrate or becoming a separate dashboard. It communicates category character, count, price range and preserved Product density; reading scale restores the same Product identities in the same category regions.

The remaining major issue is not overview information. Parent 18's activation grammar still relies on users understanding that category or Product activation enters reading scale, while drag is also available. That is a separate hypothesis and must not be repaired inside 18B.

## Decision boundary

Keep 18B only as the controlled semantic-overview child. Do not add controls, camera changes, weighting, collapse or inline detail here. A future activation-grammar experiment, if approved, must start as a separate `18C` branch directly from parent 18 rather than stacking on 18B.
