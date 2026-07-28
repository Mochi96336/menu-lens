# 18C Tap-to-Read — implementation review

## Scope

- Base: `main`
- Base SHA: `54bde49c6c1df800ba2e8d1b014c2a2b9eef9177`
- Parent: `18 Landscape Paper`
- Child: `18C Tap-to-Read`
- Branch: `agent/menu-lens-18c-tap-to-read`

## Unique variable

Only the activation grammar in the existing `overview` scale changes.

- the six category headers are the only overview reading controls;
- category headers support native tap, Enter and Space activation;
- all 30 Product rows remain visible in their original positions but leave the overview tab and pointer action path;
- Product detail remains available only after entering the existing `reading` scale;
- overview ArrowLeft／ArrowRight advances one column from the current position instead of jumping from the first to the final column.

## Parent behavior preserved

- fixed three-column × two-category topology;
- equal outer columns (`1:1:1`);
- row ratios (`8:6`, `6:4`, `4:2`);
- 46rem overview sheet and 64rem reading sheet;
- existing drag, inertia, column snap and camera calculations;
- existing Product detail, close, focus return and reset;
- six categories and 30 unique ProductIds.

## Deliberately excluded

- 18B semantic summaries;
- row or column weighting;
- camera tracking;
- paired-category collapse;
- inline detail placement;
- vertical writing;
- external category tabs or a minimap;
- Candidate, comparison, cart, order or transaction behavior.

## Evidence

Browser evidence is generated at 320px, 390px and desktop in `research-history/review-assets/18c/`.
The machine-readable state and geometry report is `browser-report.json` in the same directory.

## Decision boundary

Keep 18C only if a first-time reader can identify the six category entry controls, enter the intended paper column by tap or keyboard, and still drag the overview without Product rows behaving like failed detail buttons. If that boundary fails, stop 18C instead of adding tabs, instructions or another location map.
