# 18D Inline Detail — implementation review

## Scope

- Base: `main`
- Base SHA: `54bde49c6c1df800ba2e8d1b014c2a2b9eef9177`
- Parent: `18 Landscape Paper`
- Child: `18D Inline Detail`
- Branch: `agent/menu-lens-18d-inline-detail`

## Unique variable

Only Product detail placement changes.

- parent overview and reading activation remain unchanged;
- opening a Product moves the existing detail disclosure directly after the source Product row;
- the disclosure stays inside the selected category region;
- close, Escape, column changes and reset return the disclosure to its parking position;
- focus returns to the originating Product on explicit close.

## Parent behavior preserved

- fixed three-column × two-category topology;
- equal outer columns (`1:1:1`);
- row ratios (`8:6`, `6:4`, `4:2`);
- 46rem overview sheet and 64rem reading sheet;
- existing overview and Product activation grammar;
- existing drag, inertia, column snap and camera calculations;
- six categories and 30 unique ProductIds.

## Deliberately excluded

- 18B semantic summaries;
- 18C category-entry activation;
- row or column weighting;
- camera tracking;
- paired-category collapse;
- vertical writing;
- external category tabs or a minimap;
- Candidate, comparison, cart, order or transaction behavior.

## Evidence

Browser evidence is generated at 320px, 390px and desktop in `research-history/review-assets/18d/`.
The machine-readable state, geometry and occlusion report is `browser-report.json` in the same directory.

## Decision boundary

Keep 18D only if the detail remains visibly attached to its source, stops overlapping sibling category regions and preserves close／focus／reset without creating a second detail mode. If local reflow or category-internal scrolling costs more than the removed overlay occlusion, stop 18D instead of adding accordion behavior.
