# 22G Collapse-only Focus review

## Parent

18 Landscape Paper at `54bde49c6c1df800ba2e8d1b014c2a2b9eef9177`.

## Lineage note

22G is an exploratory sibling that isolates the paired-category collapse introduced by 23. Current 22 itself keeps the paired category fully rendered, so this mechanism must not be described as a component of current 22.

## Question

Does temporarily replacing the paired category's Product list with a 2.2rem header create enough focused reading area to justify losing simultaneous overview and comparison?

## Single mechanism

```text
focused category: remaining column height
paired category:  2.2rem clickable header
```

The collapse is reversible. Clicking the collapsed header switches focus to that category; reset restores both Product lists.

## Fixed contracts

- 46rem sheet;
- equal 1:1:1 outer columns;
- parent Product typography `.64rem / .58rem`;
- Product line-height `1.2`;
- horizontal Product padding `.5rem`;
- category-header typography and padding;
- no focus-driven horizontal camera movement;
- toolbar, keyboard and pointer-drag navigation remain explicit;
- all six categories and 30 canonical Products remain in the DOM;
- shared fixture, renderer, landscape core, detail and drag controller.

## Excluded

- 1.8 row weighting;
- 1.65 column weighting;
- focused typography or padding increase;
- camera placement or tracking;
- sheet growth;
- shared runtime changes;
- Candidate, comparison, cart or order behavior.

## Decision gate

KEEP only if the reclaimed vertical area materially improves focused scanning while the persistent paired header preserves enough orientation and reversibility.

Record `paired-category collapse alone is too destructive` if hiding the paired Product list damages overview, comparison, or confidence more than the extra focus area helps.
