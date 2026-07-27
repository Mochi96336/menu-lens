# Spatial interaction exploration

## Status

Active exploration map. It records hypotheses, boundaries, and reviewed branch decisions. Direct product-owner reactions are sourced separately in `product-direction-review.md` and are not participant-study evidence.

## Question

Can a phone menu retain some of the two-dimensional presence and stable location of a paper menu without making ordinary reading depend on learned controls?

## Existing evidence

- **01 Complete menu:** stable vertical document and inline detail
- **05 Ledger revisit:** denser rows and shared columns within the same vertical-document family
- **06 Multi-scale revisit:** one category expanded while the remaining category summaries stay visible

These remain evidence. Spatial exploration does not need to eliminate them before another mechanism can be tried.

## 07 — Horizontal Menu Atlas

Status: **market baseline / not implemented**.

The familiar pattern uses horizontal category navigation with a vertical list inside the current category. It is useful as a reference because it assigns horizontal movement to category changes, but rebuilding it would add limited exploratory value.

If a future comparison needs an executable baseline, 07 may be implemented then from the same fixture.

## 08 — Menu Spread

Status: **active spatial hypothesis**.

08 treats the menu as one continuous spread of fixed category columns:

```text
whole-menu spread
→ focused category expands in place
→ product detail expands inside that category
```

Non-focused categories remain visible as compressed landmarks. Focus changes width and reading detail, not canonical position or membership.

### First prototype boundary

- six fixed category columns in canonical order
- all 30 fixture products present in one spatial model
- explicit previous, next, and whole-menu controls
- horizontal movement remains available without relying on an undisclosed swipe gesture
- inline product detail
- keyboard and reduced-motion behavior
- no pinch zoom, freeform canvas, Candidate, comparison, cart, or order action

## Mechanism notes

The first pass records observations rather than dispositions:

- Does the whole-menu view read as a menu or as a dashboard?
- Are compressed categories meaningful landmarks or decoration?
- Does category focus preserve awareness of neighboring categories?
- Is horizontal movement understandable without instruction?
- Does width reallocation create more disruption than long-page scrolling?
- Does product detail preserve the focused category and spatial position?

Formal participant evaluation remains available through `docs/evaluation-plan.md` when the interaction is stable enough to support a specific decision.

## 09 — Horizontal Ribbon

Status: **active extreme-horizontal hypothesis**.

09 removes the remaining vertical category lists. All 30 products share one canonical horizontal coordinate:

```text
horizontal movement = position in the complete menu
vertical expansion = product information depth
```

The same ribbon supports two explicit scales. Whole-menu scale compresses all products into category chapters and product ticks. Reading scale expands those same products into readable cards without changing their canonical sequence.

The prototype keeps explicit scale, category, previous, and next controls in addition to direct pointer dragging. It does not use infinite wrapping or hide the beginning and end of the menu.

### Touch boundary shared by 08 and 09

- Pointer Events support mouse, touch, and pen
- horizontal intent locks only after a movement threshold
- vertical gestures remain available for category or detail reading
- drag release preserves bounded inertia
- a completed drag suppresses the accidental click beneath it
- controls remain available when dragging is undiscoverable or inaccessible

## 10 — Fisheye Ribbon

Status: **playable spatial hypothesis**.

10 keeps the complete 30-product ribbon inside one phone width. Instead of moving a long track, it moves a focus lens that redistributes the available width. The current variant adds a category scale before the product scale:

```text
focused category = readable group of product landmarks
→ select a product
focused product = readable card
near products = narrow named landmarks
far products = persistent ticks
```

The focus product receives roughly two-fifths of the stage, the first and second neighbours receive progressively less, and all remaining products share the residual width. A horizontal pointer gesture maps directly to menu position; it does not accumulate scroll distance or use inertia.

This version deliberately tests a stronger distortion than 08. Its open question is whether constant whole-menu presence compensates for the fact that neighbouring locations move whenever the lens moves.

## 11 — Menu Matrix

Status: **playable spatial hypothesis**.

11 replaces the continuous horizontal coordinate with a fixed two-dimensional address:

```text
Y = six categories in canonical order
X = first through eighth product within a category
```

The X axis has no semantic meaning beyond ordinal position, avoiding a return to 02's learned comparison axes. All 48 possible slots remain visible; the 18 empty slots expose category length. Focusing a category stretches its row while the other five rows remain compressed landmarks. Product detail opens in a separate lower panel so the matrix coordinates do not move.

### Current comparison questions

- Does 10 make 09's long travel easier, or does fisheye distortion destroy location memory?
- Does 11 feel like a menu or like an analytic dashboard?
- Are 11's empty slots useful evidence of category size or merely wasted space?
- Is category-level stretching in 11 more predictable than product-level stretching in 10?
- Which mechanism still works after the novelty of dragging or stretching wears off?

## 12 — Paper Menu Field

Status: **playable paper-space hypothesis**.

12 keeps category grouping but removes the implied data axes of 11. Six category blocks occupy a two-column paper layout; X and Y describe only editorial placement.

```text
overview = the complete sheet reduced to phone scale
category focus = the same sheet translated and enlarged around that block
product detail = a separate overlay that does not reflow the sheet
```

All 30 products remain printed inside their category blocks. Focusing never changes DOM order or grid placement. The main question is whether a miniature but mostly unreadable complete sheet still provides useful density, proportion, and spatial memory—or merely imitates paper at the wrong physical size.

## 13 — Static Loupe

Status: **playable fixed-sheet hypothesis**.

13 freezes the complete 2 × 3 sheet. A rectangular reading layer moves over the base map and magnifies the matching source coordinates. The base category blocks never translate, scale, or deform. Product details can be opened from the magnified layer.

Its main tradeoff is duplication: the user sees miniature and enlarged versions of the same content at once, while the loupe itself obscures part of the map.

## 14 — Folded Menu

Status: **playable fold-topology hypothesis**.

14 treats the six categories as consecutive panels of one accordion-folded sheet. The selected panel lies flat and receives readable width; the other panels remain as angled labelled strips. Category order, neighbours, and the sheet boundary remain visible.

This version succeeds only if the folds communicate physical continuity. Without that continuity it collapses back into the same interaction family as 06.

## 15 — Elastic Paper

Status: **playable two-dimensional fisheye hypothesis**.

15 fixes the outer sheet while deforming its internal grid. The focused column receives 72% of the width and the focused row 62% of the height. Dragging directly across the current category regions moves the focus and continuously reallocates the tracks.

It preserves quadrant identity but not stable internal boundaries. The open question is whether a stable outer frame is enough to support spatial memory while every category edge remains elastic.

## 16 — Weighted Elastic Paper

Status: **playable content-weighted hypothesis**.

16 keeps 15's two-column, three-row topology but removes equal allocation. The base columns contain 18 and 12 products; the base rows contain 14, 10, and 6. Focusing multiplies the active column and row's existing weight by 1.8 rather than assigning a fixed percentage.

This produces materially different focused areas: the eight-product personal-main category receives roughly 45% of the sheet, while the two-product dessert category receives roughly 17%.

## 17 — Weighted Horizontal Strip

Status: **playable non-scrolling horizontal hypothesis**.

17 places all six categories in a single phone-width strip with base weights 8:6:6:4:4:2. The focused category's original weight is multiplied by four and all widths are renormalized. No category leaves the viewport and no horizontal scroll distance accumulates.

Unlike 08, the focused width is not a fixed 79vw column. Unlike 10, width depends on category content rather than distance from the focus.

## 18 — Landscape Paper

Status: **playable three-column paper hypothesis**.

18 groups the six canonical categories into three consecutive, equal-width paper columns with two category regions per column. Internal row splits are 8:6, 6:4, and 4:2. Product count controls height only within each column; it does not turn the paper columns into data bars.

The complete scale fits the whole 3 × 2 paper into one viewport. Reading scale expands the sheet to 235% and enables bounded horizontal dragging and column snapping. Horizontal movement addresses paper columns, not individual products.

## 19 — Rigid Horizontal Sheet

Status: **reviewed branch; no longer extending**.

19 corrects 18's width-only expansion. The source sheet remains 840 × 560 at every scale; overview and reading use one uniform X/Y scale. Reading gestures modify only the camera's horizontal translation, then snap to the nearest source column.

A persistent 3 × 2 minimap shows the visible source interval. Category cells never recompute width or height in response to focus.

Direct review found that the minimap and horizontal location title repeat information already supplied by the matrix. The branch is preserved, but 22 tests native zoom without adding a second locator.

## 20 — Tri-fold Matrix

Status: **reviewed branch; no longer extending**.

20 folds the 3 × 2 sheet along its two vertical seams. Each folding panel contains two category cells and retains their horizontal divider. The active panel lies flat at roughly 78vw; panels to its left and right rotate by +58° and −58°.

Unlike 14, the category is not the folding or navigation unit. The matrix topology survives because every folded panel remains a two-cell paper region.

Direct review found potential in reclaiming space but not in the paper-fold interpretation. The word “folding” in 23 therefore means collapsing category content, not simulating folded paper.

## 21 — Two-column Reading Window

Status: **reviewed branch; no longer extending**.

21 uses one fixed 900 × 540, three-column sheet. Reading scale is chosen so exactly two equal paper columns fit the viewport. There are only two horizontal snap states: A+B and B+C.

The shared B column remains visible across both states, so a horizontal move changes only two of the four visible categories and preserves a strong location landmark.

Direct review found no material improvement over 18. The discrete A+B/B+C camera is preserved as evidence but is not a base for another branch.

## 22 — Weighted Focus Sheet

Status: **playable 18-derived hypothesis**.

22 combines 18's fixed 46rem sheet with 16's content-weighted focus rule. The overview begins at 1:1:1. Selecting a category multiplies its product-count row weight by 1.8, grows its paper column from weight 1 to 1.65, and recenters that column before and after the width transition.

The paired category remains fully rendered. This is the defining constraint of 22: focus changes row height, column width, and camera position without removing any neighboring menu content.

## 23 — Tracked Focus Landscape

Status: **playable 18-derived hypothesis**.

23 keeps 22's width change and camera tracking, then adds one explicit collapse rule. The sheet remains fixed at 46rem and keeps one global category focus:

```text
1:1:1 overview columns
→ select one category
selected column grows from weight 1 to 1.65
→ paired category collapses to a 2.2rem header
→ selected category fills the remaining column and uses larger product type
→ camera recenters before and after the width transition
→ select the focused category again
restore the complete 1:1:1, 3 × 2 overview
```

Only one category can be focused across the sheet. Compared with 22, the tested variable is whether collapsing the paired category—and spending the recovered height on larger type—makes the focused column meaningfully easier to read.

## 24 — Vertical Landscape

Status: **playable 18-derived hypothesis**.

24 reuses 18's 3 × 2 topology but not its equal column widths. The three paired columns use product totals 14:10:6, giving each vertical product lane a more consistent width. Category headers remain horizontal; product names use `vertical-rl` in canonical right-to-left order. Each upright price stays in its product's vertical flex flow and is pushed to that lane's bottom.

Overview uses a 46rem sheet and reading mode uses a 64rem sheet; neither is derived from phone width. Product names increase from .72rem to .9rem in reading mode. The 14:10:6 outer columns and minimum product-lane width prevent eight-item categories from collapsing into hairlines without wasting equal width on the two-item dessert category.

## 25 — Menu Depth family

Status: **active dimensional model reset**.

The first pass kept the six category coordinates inherited from 18 and mapped product order onto Z. Review found that the sketches merely extruded an existing plane and did not establish a meaningful third menu dimension. Only one executable falsification artifact remains:

- 25B Menu Volume exposes shared depth slices across the complete matrix.

25B is retained only to test whether explicit layer slices provide any value. Its current Z axis groups the Nth product from unrelated categories, so it has no defensible cross-category meaning and must not donate that model to the reset direction.

The reset keeps only the complete 30-product fixture as a control. It no longer assumes 18, a 3 × 2 matrix, product ordinal as Z, or a physical-object metaphor. It initially required a new child to name a relation that could not already be expressed on a plane; 26 deliberately reopens that requirement by treating depth as layout space rather than a data field.

The reset prototype, Menu Sections, uses one document and one scroll surface. Z−1 shows restaurant scope, Z0 is the default complete 30-product menu, and Z+1 adds semantic detail around the same product anchor. Browser measurement preserved the same product at 0 px displacement from Z0 to Z+1. The reverse move into the shorter overview surface displaced the first category by about 325 px because the overview had no remaining scroll range. Empty spacer space would damage the overview; persistent surrounding landmarks would recreate 06. This rejects the semantic-depth definition only.

### 25P — Menu Projections

Status: **active real-axis dimensional projection**.

25P gives every fixture product three coordinates that exist independently of layout: price, serving band, and preparation-time band. Price remains continuous. Portion metadata is normalized conservatively into small, single, and share bands because the source value `1` includes labels such as both 一杯 and 一人份; the original label remains visible in product detail. Preparation keeps quick, normal, slow, and explicit unknown bands, so the one missing value does not disappear.

The interface keeps price, serving, and preparation in one shallow axonometric volume. Price remains continuous; serving and preparation retain their explicit semantic bands. The price × serving, price × preparation, and serving × preparation controls rotate the same volume so the omitted axis becomes shallow depth rather than disappearing. Quaternion interpolation moves the 30 persistent product nodes, the bounding frame, and all three axes along one continuous rotation instead of cross-fading between independent plots. Tapping a node expands that node in place into a name-and-price card; no transaction or cart flow is introduced.

25P is a secondary decision lens rather than the default complete-menu surface. If its projections only behave like a generic data dashboard, or coordinate collisions prevent users from identifying dishes, this axis model stops; that result does not stop dimensional research as a whole.

## 26 — Parallax Menu Volume

Status: **playable spatial-grammar hypothesis**.

26 is a sibling rather than a replacement for 25P. It rejects the assumption that Z must correspond to price, flavor, product order, or any other data field. Depth is layout material: all 30 products remain at stable positions inside one typographic volume, while each category has a different oblique reading direction.

One-pointer movement rotates the same object in both axes. Approaching a category direction causes its distributed labels to form a readable projection while fragments of neighboring layouts remain present. Two-pointer distance continuously controls the depth amplitude: spreading fingers separates the interwoven labels; closing fingers compresses the current projection toward a flat reading surface.

The prototype is not successful merely because its six category directions can be reached. Its critical test is the transition between them. If intermediate angles communicate no category extent or upcoming structure, the object is only six tabs with a 3D transition. If compression becomes an automatic open/close state, it has also collapsed back into an accordion or modal category list.
