# 15A Pair-local Elastic review

## Status

Implementation review pending. Keep the branch and pull request independent from every neighbouring Draft PR.

```text
Git base: main
Research parent: 15 Elastic Paper
Unique variable: deformation support scope
Not inherited: 12A semantic density, 16 content weighting, camera movement, collapse
```

## Research question

Can Elastic Paper retain a useful local reading gain when deformation stops at the selected category's paired boundary instead of moving the entire 2 × 3 grid?

## Parent behaviour

Parent 15 uses one global two-column track and one global three-row track. Focusing any category assigns 72% width to its column and 62% height to its row. Four unrelated categories therefore change geometry even though they are outside the focus neighbourhood.

## Child mechanism

15A rebuilds the same six categories as three independent rows:

```text
row 1: category 1 | category 2
row 2: category 3 | category 4
row 3: category 5 | category 6
```

Every row remains the same height. On focus:

- the active row changes from `1:1` to `72:28` or `28:72`;
- the previous active row returns to `1:1`;
- the other two rows remain `1:1`;
- no whole-sheet column or row variable is written.

## Preserved from 15

- fixed paper outer frame;
- all six categories and all 30 canonical Products;
- category and Product order;
- click-to-focus and second-click detail behaviour;
- continuous pointer drag across categories;
- previous and next category controls;
- Escape closes detail first, then restores overview;
- detail close returns focus to the originating Product;
- focused typography and reduced-motion behaviour.

## Deliberately excluded

- 12A overview density marks or semantic information levels;
- content-count weighting from 16;
- row-height expansion;
- camera translation, zoom, tracking, scrolling, or snapping;
- pair collapse or hidden neighbour content;
- Candidate, comparison, cart, configuration, or order state.

## Evaluation points

Review at 320px, 390px, and desktop:

1. Does 72% width materially improve Product-name and price reading?
2. Does the paired 28% category remain recognisable and recoverable?
3. Do the four remote categories remain visually and spatially stable?
4. Does crossing a row boundary feel predictable when the previous row relaxes?
5. Does drag focus oscillate at the moving pair boundary?
6. Do detail, close, previous, next, Escape, and reduced motion remain coherent?

## Decision boundary

- **KEEP** when local width gain is useful and remote geometry remains stable without severe pair-boundary oscillation.
- **REVISE NARROWLY** only for a directly observed pair-boundary or focus-return defect that can be fixed without adding weighting or camera behaviour.
- **UNSUCCESSFUL** when width-only local elasticity does not improve reading enough to justify compressing the paired category.

15A does not authorize 16A. A later 16A proposal would require direct evidence of a weighted or draggable boundary problem, not merely a preference for more space.
