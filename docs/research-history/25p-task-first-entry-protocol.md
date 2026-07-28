# 25P Task-first Entry — prerequisite task definition

## Status

This document defines the concrete evaluation task required before a 25PA Task-first Entry child may be proposed. It does not implement 25PA and does not change 25P's projection or interaction model.

## Participant scenario

> 你和兩位朋友要點一道分享料理。每道料理預算不超過 NT$500，而且不想選「較慢」的料理。請使用 25P 找出所有符合條件的料理。接著回答：若優先最快，會選哪一道；若優先最低價，會選哪一道？

The participant may use any projection order. The facilitator must not tell them which of the three projection buttons to use.

## Fixture-backed answer key

All qualifying Products are:

| Product | Price | Serving band | Preparation band |
| --- | ---: | --- | --- |
| 紹興奶油蝦 | NT$480 | 分享 | 一般 |
| 蒜酥椒鹽軟殼蟹 | NT$460 | 分享 | 較快 |
| 宮保杏鮑菇 | NT$340 | 分享 | 一般 |

Expected trade-off answers:

- priority = fastest → 蒜酥椒鹽軟殼蟹;
- priority = lowest price → 宮保杏鮑菇.

The sold-out 季節時蔬豆腐煲 is excluded because its preparation band is 未標註, not because it is sold out. The task deliberately keeps missing-data interpretation visible.

## Observation sequence

1. Start from the default `價格 × 份量` projection with no focused Product.
2. Read the visible axis and band labels without facilitator explanation.
3. Find all Products satisfying the scenario.
4. Open any nodes needed to identify names and prices.
5. State the fastest choice and the lowest-price choice.
6. Press Escape to clear the focused semantic cell.

Record:

- time to first correct qualifying Product;
- time to complete set of three;
- omitted or incorrectly included Products;
- number and order of projection changes;
- whether the participant used the band labels or guessed from node location;
- whether 未標註 was mistaken for 一般 or 較慢;
- whether the final trade-off explanation references both price and preparation.

Do not collect names, contact details, account identifiers, or free-form personal data in the repository.

## Pass gate for a future 25PA proposal

25PA becomes eligible for a separate plan only when repeated sessions show that unfamiliar readers can:

- correctly identify the three qualifying Products;
- distinguish 分享 from 單份 and 小份;
- distinguish 一般／較快 from 較慢／未標註;
- explain the fastest-versus-lowest-price trade-off;
- complete the task without facilitator instruction about projection order.

If readers cannot perform the task after the band labels are visible, do not add task-first entry UI to rescue the axis model. Record that 25P's projection grammar is insufficient and stop the 25PA line.

## Boundaries

This prerequisite does not authorize:

- a task wizard or questionnaire;
- filtering, ranking, recommendation, or automatic projection selection;
- Candidate, comparison workspace, cart, order, or transaction state;
- hidden answer scoring inside the prototype;
- any 25PA implementation on this branch.
