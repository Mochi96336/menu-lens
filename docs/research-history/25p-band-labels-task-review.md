# 25P Band Labels + Task Definition — implementation review

## Scope

```text
Repository: a20030824/menu-lens
Base: main
Parent: 25P Menu Projections
Branch: agent/menu-lens-25p-band-labels-task
Purpose: prerequisite before any 25PA proposal
```

## Finding

25P already defined eleven semantic bands in source:

- four price bands;
- three serving bands;
- four preparation bands.

Those labels were used in the focused-cell card, but the projection plane itself exposed only unlabeled grid divisions and three axis names. A reader could see regions without knowing which region meant NT$230–339, 分享, 較快, or 未標註.

## Change

The parent projection model and controller remain unchanged. A non-interactive label add-on now:

- projects the active X- and Y-axis band labels onto the same rotating plane;
- lists all active X, Y, and omitted depth-axis bands in a persistent summary;
- updates all three sets when the existing projection buttons rotate the volume;
- uses the same view matrices, quaternion interpolation duration, and reduced-motion endpoint as 25P;
- adds no Product destination, filter, ranking, or navigation control.

A separate protocol fixes one concrete three-axis task before 25PA can be discussed.

## Concrete task

```text
three diners
→ one sharing dish
→ price no more than NT$500
→ exclude slower preparation
→ identify all matches
→ compare fastest versus lowest price
```

Fixture answer set:

- 紹興奶油蝦 — NT$480 — 分享 — 一般;
- 蒜酥椒鹽軟殼蟹 — NT$460 — 分享 — 較快;
- 宮保杏鮑菇 — NT$340 — 分享 — 一般.

## Browser harness evidence

A bounded Chromium harness ran the exact label add-on and label DOM against 30 persistent nodes at 320px, 390px, and desktop. It verified:

- no script errors;
- no horizontal document overflow;
- 30 persistent nodes;
- 7 visible labels for 價格 × 份量;
- 8 visible labels for 價格 × 時間;
- 7 visible labels for 份量 × 時間;
- complete visual and accessible summaries for X, Y, and depth bands;
- reduced-motion projection changes resolve directly to the endpoint labels.

This harness isolates the label layer. It is not represented as a deployed-page screenshot or as participant evidence.

## Parent identity preserved

Unchanged:

- 30 Product coordinates;
- continuous price coordinate;
- serving and preparation band boundaries;
- three semantic matrix planes;
- quaternion rotation and 620ms duration;
- node identity and semantic-cell focus;
- projection buttons and Escape reset;
- category colors and Product detail content;
- 6 categories and 30 unique Products.

## Decision

**KEEP as a parent-viability prerequisite.**

25P now names the regions it asks readers to use, and the research line has one fixture-backed task with a falsifiable answer key. This does not establish that 25P succeeds; it only makes a 25PA proposal evaluable.

## Next step — not started

Run the task protocol. A separate 25PA Task-first Entry plan may be proposed only after direct reader evidence passes the documented gate. No 25PA code, branch, or Draft PR is included here.
