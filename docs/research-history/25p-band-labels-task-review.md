# 25P readable band labels and task prerequisite review

## Result

**KEEP as a parent-viability prerequisite.**

25P now names all semantic regions used by its three projections and has one fixed, fixture-backed task with a falsifiable answer key. This does not establish participant success and does not authorize 25PA.

## Preserved parent identity

Unchanged:

- six categories and 30 unique Products;
- continuous price coordinate;
- serving and preparation bands;
- three semantic matrix planes;
- Product coordinates and persistent nodes;
- projection buttons, quaternion interpolation, and 620ms duration;
- anchor retention across projection changes;
- Escape clear behavior;
- parent `menu-projections.js`, `menu-projections.css`, and shared fixture.

## Band-label layer

The add-on projects active X and Y band labels into the existing plane and lists X, Y, and omitted depth bands in a compact summary. Labels remain non-interactive and do not add another destination, filter, ranking, recommendation, or task flow.

## Layout repair after separate review

A separate viewport review found that the existing focus card could be clipped by the projection field because placement only chose left or right from the anchor X coordinate. Large result sets also exposed a scroll container with `pointer-events: none`.

The narrow repair stays inside the same add-on:

- measure the actual field and focus-card rectangles;
- choose the side with enough available room when possible;
- clamp the final X and Y position inside the field;
- keep the pointer line aligned with the anchor after vertical clamping;
- re-evaluate during projection animation and resize;
- make open result cards pointer-scrollable and keyboard-focusable;
- retain the base controller and semantic-cell result contents unchanged.

A bounded Chromium matrix checked 168 card cases per viewport at 320px, 390px, and 1280px. It varied anchor positions and result sizes from one to eleven rows.

Recorded at every viewport:

- 168 cases;
- zero cards outside the projection field;
- minimum observed field gap about 5.09px;
- eleven-row results remain vertically scrollable;
- open cards use pointer events and expose a keyboard focus target.

Machine-readable evidence:

- `research-history/review-assets/25p-band-labels/browser-report.json`

This is bounded layout evidence, not a deployed-page screenshot or participant result.

## Fixed evaluation task

> 你和兩位朋友要點一道分享料理。每道料理預算不超過 NT$500，而且不想選「較慢」的料理。請使用 25P 找出所有符合條件的料理。接著回答：若優先最快，會選哪一道；若優先最低價，會選哪一道？

Fixture-backed qualifying set:

| Product | Price | Serving | Preparation |
| --- | ---: | --- | --- |
| 紹興奶油蝦 | NT$480 | 分享 | 一般 |
| 蒜酥椒鹽軟殼蟹 | NT$460 | 分享 | 較快 |
| 宮保杏鮑菇 | NT$340 | 分享 | 一般 |

Expected trade-off:

- fastest: 蒜酥椒鹽軟殼蟹;
- lowest price: 宮保杏鮑菇.

`季節時蔬豆腐煲` remains excluded because preparation is `未標註`.

## Boundary

The repair removes layout interference from the evidence gate. It does not prove the projection grammar is understandable. 25PA remains blocked until unfamiliar readers complete the documented task without projection-order instruction.
