# Product direction review log

This file records direct product-owner reactions gathered during prototype review conversations. These are design judgments from the project owner, not moderated participant-study results. They should guide which branches deserve another prototype, but must not be cited as user-research evidence.

## 2026-07-27 — Spatial prototypes 09 and 13–21

| Prototype | Direct review | Working consequence |
|---|---|---|
| 09 Horizontal Ribbon | Hard to use, although playful enough to remain interesting. | Preserve as an extreme-horizontal experiment; do not use it as the primary screen. |
| 13 Static Loupe | The hardest to use; native two-finger zoom would be more direct than a separate loupe. | Stop extending the loupe mechanism. Treat pinch as a first-class mobile capability in later paper variants. |
| 14 Folded Menu | Feels like a harder-to-use 08 and loses the matrix. | Do not extend category strips or paper-fold decoration. |
| 15 Elastic Paper | The most reasonable member of its branch, but giving two-item desserts the same focus magnification as larger categories feels wrong. | Preserve content weighting as a requirement for any automatic focus. |
| 17 Weighted Horizontal Strip | Too similar to 14; the matrix disappears. “Horizontal” should not mean that the complete page becomes one horizontal strip. | Keep horizontal movement local to a paper region or reading action. Do not replace the 3 × 2 topology with a full-page strip. |
| 18 Landscape Paper | The most comfortable arrangement so far. | Use 18 as the common substrate for the next variants. |
| 19 Rigid Horizontal Sheet | Adds a horizontal title/minimap that repeats information already visible in the matrix. | Preserve as evidence; stop extending it. Do not add a second locator when the sheet already supplies location. |
| 20 Tri-fold Matrix | Folding space may have more possibilities, but the current paper-fold interpretation is not useful. | Preserve as evidence; do not continue 3D or paper-fold mechanics. |
| 21 Two-column Reading Window | Offers no meaningful improvement over 18. Native pinch zoom was under-considered. | Preserve as evidence; stop extending discrete A+B/B+C windows. |

## Current branch decision

The next prototypes all retain 18's weighted 3 × 2 landscape matrix:

- **22 Weighted Pinch Sheet:** native two-pointer continuous zoom, one-pointer pan after zoom, and product-count-aware category focus targets.
- **23 Collapsible Landscape:** “folding” means category content can collapse like 06. Each landscape column manages only its own upper/lower pair; there is no paper-fold simulation.
- **24 Vertical Landscape:** product names become right-to-left vertical columns, prices stay attached to the same vertical flow, and opened descriptions remain horizontal; 18's width behavior is unchanged.

The archive keeps 19–21 as explored branches, but they are no longer active sources for further iteration.
