# 22F Padding-only Focus review

## Parent

18 Landscape Paper at `54bde49c6c1df800ba2e8d1b014c2a2b9eef9177`.

## Question

Does a small focused Product-padding increase improve name/price separation when typography, paper geometry, and camera remain exactly unchanged?

## Single mechanism

```text
Product horizontal padding: .5rem → .55rem
```

The increase applies only inside the focused category.

## Fixed contracts

- 46rem sheet;
- equal 1:1:1 outer columns;
- parent 8:6 / 6:4 / 4:2 row ratios;
- Product font sizes .64rem / .58rem;
- Product line-height 1.2;
- category-header typography and padding;
- all six categories and 30 canonical Products;
- complete paired-category content;
- focus and reset preserve `scrollLeft`;
- toolbar, keyboard and pointer-drag navigation remain explicit;
- parent proximity snap remains enabled;
- shared fixture, renderer, landscape core, detail and drag controller.

## Excluded

- row or column weighting;
- focused Product typography;
- focus-driven camera placement or tracking;
- line-height change;
- sheet growth;
- paired-category collapse;
- shared runtime changes;
- Candidate, comparison, cart or order behavior.

## Decision gate

KEEP only if the extra inset improves name/price separation or tap-row clarity without enough truncation pressure to make the unchanged category width worse.

Record `focused padding alone is insufficient` if the gain is too small, or if the narrower text measure creates more cost than benefit.
