# 24A Equal-column Vertical Type review

## Status

Implementation review pending. Keep this branch and pull request independent from every neighbouring Draft PR.

```text
Git base: main
Research parent: 24 Vertical Landscape
Comparison references: 18 Landscape Paper / 18A Proportional Landscape
Unique variable: outer paper-column allocation
```

## Research question

Does vertical Product type remain coherent when the three outer paper columns are equal, or does 24 depend on its 14:10:6 content-proportional columns to keep each vertical Product lane usable?

## Parent behaviour

24 couples two changes relative to 18:

- outer columns use paired Product totals `14:10:6`;
- Product names and upright prices flow vertically from right to left.

That coupling makes it unclear whether any gain comes from vertical type or simply from giving the busiest column more width.

## Child mechanism

24A keeps all 24 vertical presentation and interaction contracts but removes content-proportional outer columns:

```text
24 parent outer columns: 14:10:6
24A outer columns:       1:1:1

internal rows retained:  8:6 / 6:4 / 4:2
```

No other geometry, type, price, camera, detail, drag, fixture, or scale rule changes.

## Preserved from 24

- fixed 46rem overview sheet and 64rem reading sheet;
- six categories and 30 canonical Products;
- category and Product order;
- per-column internal row ratios from actual Product counts;
- right-to-left vertical Product lanes;
- overview Product type `.72rem` and reading type `.9rem`;
- upright prices at `.58rem` and `.7rem`;
- price placement at the bottom of each Product lane;
- sold-out treatment;
- category activation and Product detail;
- previous / next paper-column navigation;
- shared pointer drag and nearest-column settle;
- Escape, focus return, resize handling, and reduced motion.

## Deliberately excluded

- content-proportional outer-column allocation;
- row or column focus weighting;
- camera tracking tied to category focus;
- semantic overview summaries;
- collapse or hidden paired categories;
- horizontal Product type;
- price relocation or another price rail;
- Candidate, comparison, cart, Configuration, or order state.

## Evaluation points

Review at 320px, 390px, and desktop:

1. Does the eight-Product category retain sufficient lane width in overview and reading?
2. Does the two-Product category look wastefully wide?
3. Are vertical names and upright prices still scannable without the 14:10:6 compensation?
4. Do equal outer columns improve location predictability enough to offset uneven Product density?
5. Are all 30 Product lanes present and ordered right to left?
6. Do detail, close, reset, previous, next, drag, keyboard, and reduced motion remain coherent?

## Decision boundary

- **KEEP** only if equal columns preserve usable vertical reading while improving paper-column predictability.
- **UNSUCCESSFUL** if dense categories become materially narrower while sparse categories gain mostly empty width.
- **REVISE NARROWLY** only for a directly observed implementation defect that does not alter column allocation or vertical type.

Do not repair 24A by reintroducing proportional columns, changing font size, relocating prices, adding camera tracking, or collapsing content. Those would answer different questions.
