# 22E Typography-only Focus review

## Parent

18 Landscape Paper at `54bde49c6c1df800ba2e8d1b014c2a2b9eef9177`.

## Question

Does a small focused Product-type increase materially improve reading when the paper geometry and camera remain exactly unchanged?

## Single mechanism

```text
Product row: .64rem → .68rem
Price:       .58rem → .62rem
```

The increase applies only inside the focused category.

## Fixed contracts

- 46rem sheet;
- equal 1:1:1 outer columns;
- parent 8:6 / 6:4 / 4:2 row ratios;
- line-height 1.2;
- horizontal Product padding .5rem;
- category-header typography and padding;
- all six categories and 30 canonical Products;
- complete paired-category content;
- focus and reset preserve `scrollLeft`;
- toolbar, keyboard and pointer-drag navigation remain explicit;
- shared fixture, renderer, landscape core, detail and drag controller.

## Excluded

- row or column weighting;
- focus-driven camera placement or tracking;
- padding increase;
- line-height change;
- sheet growth;
- paired-category collapse;
- shared runtime changes;
- Candidate, comparison, cart or order behavior.

## Decision gate

KEEP only if the modest type increase improves name/price parsing without creating enough wrapping, clipping or density pressure to make the unchanged category area worse.

Record `focused typography alone is insufficient` if the gain is too small, or if the unchanged geometry cannot absorb it cleanly.
