# 16A Stable Weighted Drag review

## Status

Implementation review pending. Keep this branch and its pull request independent from 15A and every neighbouring Draft PR.

```text
Git base: main
Research parent: 16 Weighted Elastic Paper
Unique variable: pointer hit-coordinate stability
Preserved: 16 content weighting and 1.8× focus deformation
Not inherited: 15A pair-local width, camera movement, collapse, semantic density
```

## Research question

Can 16 retain its content-weighted visual deformation while making drag direction-independent by resolving pointer position against the undeformed base-weighted paper rather than the currently deformed DOM categories?

## Parent behaviour

Parent 16 uses content counts `8 / 6 / 6 / 4 / 4 / 2` to define both overview area and focus area. The selected category receives a `1.8×` weight before the full grid is redistributed.

Its drag mapping reads `document.elementFromPoint(...).closest(".paper-category")`. The active category therefore enlarges its own hit region. Moving from A to B and moving back from B to A can cross different boundaries because the boundary depends on the current focus.

## Child mechanism

16A leaves the visual weighting untouched and introduces a separate stable hit map:

```text
vertical base regions: 14 : 10 : 6
row 1 horizontal regions: 8 : 6
row 2 horizontal regions: 6 : 4
row 3 horizontal regions: 4 : 2
```

Pointer coordinates are normalized against the fixed sheet outer bounds, then resolved through these base ratios. `activeCategoryIndex`, focused weights, and deformed DOM bounds do not participate in the hit calculation.

## Preserved from 16

- all six categories and all 30 canonical Products;
- category and Product order;
- base content weighting;
- focused-category `1.8×` weight;
- resulting row-height and row-column deformation;
- focused typography;
- click-to-focus and second-click detail behaviour;
- previous and next category controls;
- Escape, detail close, and focus return;
- reduced-motion behaviour.

## Deliberately excluded

- changes to the area formula or focus factor;
- 15A pair-local `72:28` allocation;
- semantic information levels or density marks;
- camera translation, zoom, tracking, scrolling, or snapping;
- collapsed or hidden paired content;
- Candidate, comparison, cart, configuration, or order state.

## Evaluation points

Review at 320px, 390px, and desktop:

1. Does an identical pointer path produce the same category sequence regardless of starting focus?
2. Are reverse transitions located at the same stable boundaries as forward transitions?
3. Does the fixed hit map remove boundary sticking and focus oscillation?
4. Is the mismatch between the stable invisible boundary and the currently visible deformed boundary understandable?
5. Can users still intentionally reach small base regions such as the two-item final category?
6. Do click focus, detail, close, previous, next, Escape, and reduced motion remain coherent?

## Decision boundary

- **KEEP** when direction-independent dragging improves predictability without making the visible paper feel disconnected from its interaction surface.
- **REVISE NARROWLY** only for a directly observed coordinate-normalization defect that does not alter the base weighting or visual deformation.
- **UNSUCCESSFUL** when stable invisible hit regions conflict too strongly with the visible moving boundaries, even if hysteresis is removed.

16A does not authorize another mechanism. Any next item must start from its own research parent and an independent branch from `main`.
