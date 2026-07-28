# 17A Minimum-target Weighted Strip review

## Status

Implementation review pending. Keep this branch and pull request independent from every neighbouring Draft PR.

```text
Git base: main
Research parent: 17 Weighted Horizontal Strip
Unique variable: minimum category width
Not inherited: 16A stable pointer mapping, 15A pair-local allocation, camera movement
```

## Research question

Can 17 preserve content-weighted differences while giving every category enough width to remain recognisable and directly operable?

## Parent behaviour

Parent 17 keeps all six categories in one non-scrolling strip. Overview width follows `8:6:6:4:4:2`; focusing multiplies the selected category's original weight by `4`. The smallest category can therefore occupy only `2/30` of the strip before focus, leaving a very narrow label and target.

## Child mechanism

17A preserves the complete weighting formula and adds one lower bound:

```text
minimum category width: 2.5rem (about 40px)
base flex grow: 8:6:6:4:4:2
focused flex grow: selected count × 4
```

Flexbox first honours the minimum width for all six categories. Remaining width is distributed through the inherited content weights. The strip remains clipped to one viewport and never scrolls.

## Preserved from 17

- all six categories and 30 canonical Products;
- canonical category and Product order;
- one horizontal, non-scrolling strip;
- content-count weighting;
- focused-category `4×` multiplier;
- vertical overview labels and focused horizontal detail rows;
- click focus and second-click Product detail;
- pointer drag using the currently visible category DOM;
- previous and next category controls;
- Escape, detail close, focus return, and reduced motion.

## Deliberately excluded

- 16A fixed base-coordinate pointer mapping;
- any change to counts or the `4×` focus formula;
- horizontal scrolling, long track, camera translation, snapping, or zoom;
- pair-local allocation or row geometry;
- semantic density or scale-specific information;
- collapse or hidden categories;
- Candidate, comparison, cart, Configuration, or order state.

## Evaluation points

Review at 320px, 390px, and desktop:

1. Are all six overview labels identifiable without first focusing them?
2. Does the two-item category become a credible direct target?
3. Does the 2.5rem floor preserve enough difference between 8, 6, 4, and 2 item categories?
4. Can the focused category still gain enough width to reveal Product names and prices?
5. Do five simultaneous target floors cap focus so strongly that the `4×` multiplier becomes mostly nominal?
6. Does the visible moving boundary retain Parent 17's direction-dependent drag behaviour?
7. Do detail, close, previous, next, Escape, and reduced motion remain coherent?

## Decision boundary

- **KEEP** when small categories become operable while content scale and focused reading remain materially visible.
- **REVISE NARROWLY** only when a directly observed target floor near 2.5rem improves the balance without changing any other mechanism.
- **UNSUCCESSFUL** when guaranteeing six targets consumes so much width that the weighted strip loses either meaningful overview proportion or useful focus expansion.

17A does not authorize a camera, scrolling strip, stable pointer mapping, or later variant. Any next item must again start independently from `main` and name its own parent and single variable.
