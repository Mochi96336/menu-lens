# 24C Fixed-type Reading Scale review

## Parent

24 Vertical Landscape at `main`.

## Question

Does Parent 24's 46rem → 64rem paper enlargement provide a meaningful reading improvement by itself, or does the mechanism depend on simultaneously enlarging vertical Product typography?

## Single variable

Parent 24 reading typography:

```text
Product name   .72rem → .9rem
price          .58rem → .7rem
category index .56rem → .48rem
category name  .82rem → 1rem
price range    .52rem → .44rem
```

24C keeps every overview type token at both scales:

```text
Product name   .72rem
price          .58rem
category index .56rem
category name  .82rem
price range    .52rem
```

Only reading-scale type changes are removed. Geometry, spacing, and interaction remain Parent 24.

## Preserved from 24

- content-proportional outer columns `14:10:6`;
- internal row ratios `8:6 / 6:4 / 4:2`;
- 46rem overview and 64rem reading sheet widths;
- six categories and 30 canonical Products;
- canonical category and Product order;
- right-to-left `vertical-rl` Product lanes;
- upright price treatment and bottom placement;
- Parent 24 spacing and reading padding;
- sold-out treatment;
- category entry and Product detail;
- previous / next controls;
- shared pointer drag and nearest-column settle;
- Escape, focus return, resize handling, and reduced motion.

## Layout correction

Browser inspection found that the initial child fixed the Product name, Product price, and category name but still allowed the category index and price range to inherit another reading-size rule. That produced a mixed header hierarchy in reading mode. The child now restores all five overview font sizes, without changing any non-type property.

## Excluded

- equal columns from 24A;
- horizontal prices from 24B;
- font-size changes beyond restoring the five overview sizes;
- padding or line-height changes;
- sheet-width changes;
- horizontal Product names;
- row or column focus weighting;
- focus-driven camera tracking;
- semantic summaries;
- paired-category collapse;
- Candidate, comparison, cart, configuration, or order state.

## Review matrix

Review Parent 24 and 24C at 320px, 390px, and desktop:

- overview geometry and typography match;
- reading sheet reaches the same 64rem width;
- Product names, prices, category indices, category names, and price ranges retain their overview sizes;
- the busiest eight-Product category remains fully present;
- vertical names gain useful spacing from wider lanes even without larger glyphs;
- prices remain attached to their Product lanes;
- previous / next and pointer drag reach all three columns;
- detail opens and closes with focus return;
- Escape closes detail before returning to overview;
- resize retains the active column;
- reduced motion remains immediate where Parent 24 is immediate.

## Validation

The branch validator requires exactly the five overview sizes above and rejects geometry, padding, writing-mode, horizontal-price, focus, collapse, semantic-summary, and order changes.

## Decision boundary

KEEP only if the 64rem geometry creates a materially clearer reading state without typography growth, while reducing density change or wrapping pressure compared with Parent 24.

Mark UNSUCCESSFUL if the reading state mainly becomes more spacious but not more legible, demonstrating that Parent 24's larger glyphs are essential to the mechanism.

Do not add a compromise font size, padding adjustment, price change, or geometry rescue inside 24C. Any combination must be a separate branch from `main`.
