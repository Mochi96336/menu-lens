# 24B Horizontal Price Labels review

## Parent

24 Vertical Landscape at `54bde49c6c1df800ba2e8d1b014c2a2b9eef9177`.

## Question

Does returning only price labels to familiar horizontal reading improve scan speed and price association while preserving the vertical Product-name hypothesis?

## Single mechanism

Parent 24:

```text
Product name: vertical-rl
price: upright inside the same vertical flow
```

24B:

```text
Product name: unchanged vertical-rl
price: horizontal-tb at the bottom of the same Product lane
```

The original `strong` price node is repositioned; no duplicate price or second price rail is created.

## Fixed contracts

- outer paper columns remain content weighted `14:10:6`;
- internal row ratios remain `8:6 / 6:4 / 4:2`;
- overview sheet remains `46rem`;
- reading sheet remains `64rem`;
- Product lanes remain right-to-left;
- Product names retain parent 24 typography, spacing, and `vertical-rl` flow;
- price value, Product membership, DOM identity, and font size remain unchanged;
- six categories and 30 canonical Products remain present;
- sold-out treatment remains unchanged;
- category entry, Product detail, close, focus return, previous/next, keyboard, drag, settle, resize, and reduced motion remain parent 24 behavior.

## Layout correction

Direct browser inspection found that the four overview drink lanes are about `35.6px` wide while a full `NT$xxx` label measured about `36.8px`, allowing adjacent labels to touch. The overview label now uses one bounded tracking correction:

```css
letter-spacing: -.04em;
```

The correction applies only at overview scale. It does not change price content, font size, Product lanes, column weights, sheet width, or reading-scale presentation.

## Excluded

- equal outer columns from 24A;
- changes to category or Product order;
- horizontal Product names;
- font-size changes;
- abbreviating or removing `NT$`;
- scaling price labels;
- another shared price row or rail;
- row or column focus weighting;
- focus-driven camera tracking;
- semantic summaries;
- collapse or hidden categories;
- Candidate, comparison, cart, Configuration, or order actions.

## Review matrix

Inspect at 320px, 390px, and desktop:

1. Initial overview retains the exact 24 column and row geometry.
2. Eight-, six-, four-, and two-Product categories keep their canonical lanes.
3. `NT$` labels remain readable without overflowing into adjacent lanes.
4. The price remains visually attached to the correct Product name.
5. Long vertical names do not collide with the reserved bottom price area.
6. Reading scale preserves the same Product and price relationship.
7. Sold-out styling remains understandable.
8. Category entry and horizontal drag do not change price placement.
9. Product detail opens and returns focus correctly.
10. Escape closes detail before returning to overview.
11. Reduced motion remains inherited and no child animation appears.

## Validation

The dedicated validator preserves Parent 24 geometry and price font size, requires the overview-only `-.04em` tracking correction, and rejects width, flex, grid, font-size, scaling, snap, hiding, focus, collapse, semantic-summary, and order changes.

## Decision boundary

KEEP only if horizontal prices are materially easier to identify and compare while remaining unambiguously attached to their vertical Product lanes.

Mark UNSUCCESSFUL if the horizontal labels form a visually disconnected bottom band, still collide in narrow lanes, or consume enough vertical name space to reduce reading more than they help.

Do not add a shared price rail, wider columns, smaller type, abbreviations, or another alignment mechanism to rescue 24B. Those would be separate variables.
