# Bounded Candidate comparison

## Document status

This document records the first bounded comparison slice after the accepted Candidate workspace.

```text
branch  agent/menu-map-atlas
PR      #4 — Build menu reading workspace
status  [implemented, awaiting review]
```

Current sequence:

```text
[passed for current scope] Prototype C — Anchor + explicit shared axis
→ [passed for current scope] CND1 — Attached Candidate marks
→ [passed for current scope] CND2 — Candidate review workspace
→ [implemented, awaiting review] CMP1 — Bounded Candidate comparison
→ [blocked] Decision / Configuration / Current order
```

CMP1 remains a separate review boundary. Implementation does not authorize Decision or transaction state.

## Research question

> Can a diner reduce repeated memory work across two or three serious Candidates using a bounded, truthful comparison without mistaking comparison selection for commitment or losing the Candidate workspace?

CMP1 implements only:

- explicit selection of two or three existing Candidates;
- simultaneous review of a small set of decision-relevant differences;
- truthful missing, source, and confidence states;
- exact return continuity to the Candidate workspace.

It does not implement:

- choosing a winner;
- explicit Decision;
- quantity or modifiers;
- Configuration;
- Current order;
- totals, checkout, or submission;
- recommendation, ranking, or scoring;
- table composition;
- a conventional comparison baseline.

## Product and state boundary

```text
canonical Products
+ Candidate ProductId membership
+ reversible comparison selection
→ bounded comparison projection
```

The state boundaries remain:

```text
Product
≠ Candidate
≠ comparison selection
≠ DraftOrderItem
≠ ConfiguredOrderItem
≠ SubmittedOrderRound
```

Implemented comparison state:

```ts
export type CandidateComparisonState = Readonly<{
  productIds: ReadonlyArray<ProductId>;
}>;
```

Implemented application wrapper:

```ts
type MenuSurface =
  | { kind: "menu" }
  | { kind: "candidates" }
  | { kind: "comparison" };

type MenuAppState = Readonly<{
  reading: MenuReadingState;
  candidates: CandidateState;
  comparison: CandidateComparisonState;
  surface: MenuSurface;
}>;
```

Comparison selection stores only Product identity. It contains no quantity, configuration, modifier selection, total, commitment, winner, rank, recommendation, note, or copied Product data.

## Selection invariants

1. Only a valid current Candidate may be selected.
2. Selection contains no duplicates.
3. Selection contains at most three ProductIds.
4. Selection order follows canonical Product order, not click order.
5. Zero or one selected Product is valid but produces no comparison evidence.
6. Two or three selected Products produce the bounded projection.
7. Comparison toggling never changes Candidate membership.
8. Candidate removal removes the same ProductId from comparison selection.
9. Re-adding a Candidate does not silently reselect it.
10. Unknown and non-Candidate toggle actions are referential no-ops.
11. Legal selection operations sanitize stale, duplicate, or over-limit state.
12. A fourth selection never replaces another Product.
13. A sold-out Product already retained as a Candidate may remain comparable.
14. Reload creates an empty comparison state.

## Surface transition grammar

The canonical path is:

```text
menu
→ Candidate workspace
→ comparison
→ Candidate workspace
→ exact previous menu context
```

Pure transitions enforce the same grammar as the UI:

- comparison opens only from `surface.kind = candidates`;
- Candidate workspace opens only from `surface.kind = menu`;
- comparison selection changes only while the comparison surface is active;
- the Candidate locator changes surface only from the Candidate workspace;
- comparison Back returns only to the Candidate workspace;
- Candidate-workspace Back returns only to the menu.

Opening comparison requires at least two canonical Candidates. It sanitizes prior selection but never automatically selects a Product. First open is explicitly empty, and an intentionally cleared selection remains empty after leaving and reopening.

Browser-only scroll and focus return references remain in the App controller rather than pure state.

## Candidate workspace entry

CND2 Product rows retain exactly two actions:

```text
在菜單中查看
移出考慮
```

CMP1 adds no third row action.

The Candidate workspace header adds one fixed-geometry native button:

```text
比較考慮項目
```

Behavior:

- fewer than two Candidates: disabled and visually hidden while the row geometry remains reserved;
- two or more Candidates: visible and interactive;
- accessible name includes the canonical Candidate count;
- entering captures Candidate-workspace scroll and focus;
- entering scrolls to the comparison heading with `behavior: "instant"`;
- entering focuses the comparison heading;
- CND2's menu return context remains intact.

## Comparison surface

CMP1 is a third mounted sibling `main` surface. The application mount root is a neutral `div`, preventing nested or duplicate visible main landmarks.

Exactly one of these is visible and interactive:

```text
menu
candidates
comparison
```

Every hidden surface remains mounted, `hidden`, and `inert`.

The comparison document contains:

```text
[ 回到考慮項目 ]

比較考慮項目
選擇 2–3 道；只是在比較，尚未點餐。

已選 2 / 3 道

Candidate selector list

價格
Product A                         NT$320
Product B                         NT$520

份量
Product A                         一人份
Product B                         多人分享
```

It is not a modal, sheet, rail, carousel, card deck, horizontal specification table, or fixed footer.

## Selector behavior

Every canonical Candidate appears in canonical Product order with one persistent native button:

```text
比較
```

Button contract:

- stable visible label `比較`;
- stable accessible name `比較「商品名」`;
- `aria-pressed="false"` or `aria-pressed="true"`;
- the same DOM node survives selection changes;
- pressed and unpressed states have identical dimensions;
- focus remains on the toggled control.

When three Products are already selected, selecting a fourth is a no-op and announces:

```text
最多比較 3 道，請先取消一項。
```

The warning uses the existing comparison status region. Leaving comparison resets this transient message while the surface is hidden, so reopening shows the actual selection summary rather than a stale rejection.

## Mobile comparison grammar

CMP1 uses vertical dimension blocks rather than Product columns:

```text
[dimension]
Product name                     value
Product name                     value
Product name                     value
```

This keeps all selected Products visible within each decision dimension while avoiding a desktop matrix compressed into a phone.

The same grammar widens on desktop; there is no second desktop-only comparison implementation.

## Bounded dimensions

CMP1 uses only the existing canonical data model and a fixed priority order:

1. price;
2. portion class;
3. meal role;
4. preparation class;
5. shareability;
6. coarse traits;
7. required customization presence.

Availability is shown beside Product identity rather than scored as a dimension.

Price is always included and uses the existing `zh-TW` TWD formatter. CMP1 shows exact prices such as `NT$320`; it does not show cheapest badges, percentage differences, value scores, or price rankings.

Required customization is derived through the canonical modifier-group rule and shows only:

```text
有必選項目
無必選項目
```

CMP1 exposes no modifier-group names, options, defaults, prices, or selection controls.

## Truthful semantic evidence

Semantic projection uses `resolveProductSemantics()` so category defaults and Product overrides retain the canonical merge rule.

Each semantic datum preserves:

```ts
type ComparisonEvidence = Readonly<{
  valueLabel: string | null;
  source: MetadataSource | null;
  confidence: MetadataConfidence | null;
  status: "known" | "low_confidence" | "missing";
}>;
```

Display states:

```text
known             normal value + 商家確認 / 分類預設
low confidence    coarse value + 低可信
missing           未提供
```

Missing evidence never appears as `否`, `不適合`, an empty cell, a hidden Product row, or a mark indistinguishable from equality.

Stable meal-role, portion, trait, source, and confidence labels are shared through `src/customer/menu-semantic-labels.ts`; menu reading and comparison no longer maintain duplicate label maps.

## Difference-only rule

Price is always shown.

A semantic dimension appears only when:

1. at least one selected Product has a value; and
2. normalized values differ, or at least one value is missing or low-confidence.

A semantic dimension is omitted when all values are missing or all selected Products have the same high- or medium-confidence value. Source differences alone do not force an otherwise equal dimension to appear.

Required customization appears only when selected Products differ.

If price is the only visible dimension, CMP1 states:

```text
目前資料沒有顯示其他可比較差異。
```

This does not claim that the Products are identical.

## Empty and reduced states

```text
0 selected   選擇 2–3 道考慮項目開始比較。
1 selected   再選 1 道即可比較。
2–3 selected render bounded evidence
```

If the Candidate collection is externally reduced below two while comparison remains active, Candidate shortage takes priority:

```text
至少需要 2 道考慮項目才能比較。
```

The comparison surface remains understandable and does not silently navigate away.

## Focus, live status, and return

- Entry, Back, and selectors are native buttons.
- The heading is programmatically focusable.
- One polite live region reports selection changes and the three-item limit.
- Unrelated menu-reading renders do not mutate comparison status.
- Candidate-state changes rebuild selector and evidence projections consistently.
- Comparison evidence rendering does not steal focus or scroll.
- Opening focuses the comparison heading.
- Back restores Candidate-workspace scroll with `behavior: "instant"`, then restores the prior focus origin when available.
- If the origin is unavailable, focus returns to the stable comparison entry.
- Candidate-workspace return context for the menu remains preserved.
- No row-wide click, swipe, long press, hover-only action, or pointer-only gesture exists.

## Test-first implementation

Added:

```text
src/customer/candidate-comparison.ts
src/customer/candidate-comparison.test.ts
src/customer/candidate-comparison-surface.test.ts
src/customer/menu-semantic-labels.ts
src/app/candidate-comparison.ts
src/styles/candidate-comparison.css
scripts/candidate-comparison-review.test.mjs
scripts/candidate-comparison-geometry.test.mjs
```

Updated:

```text
src/customer/menu-app-state.ts
src/customer/menu-app-state.test.ts
src/customer/menu-reading.ts
src/app/App.ts
src/app/candidate-workspace.ts
index.html
scripts/build-static.mjs
package.json
README.md
docs/workstreams.md
docs/candidate-comparison-plan.md
```

Automated evidence covers:

- empty identity-only comparison state;
- current-Candidate membership;
- duplicate, stale, unknown, and over-limit handling;
- canonical selection order;
- explicit empty first open;
- Candidate/comparison independence;
- Candidate-removal sanitation and non-reselection;
- sold-out retained Candidate;
- two- and three-Product projection;
- exact TWD price and visible equality;
- difference-only semantic dimensions;
- missing, low-confidence, and category-default evidence;
- deterministic trait ordering;
- required-customization difference;
- reduced Candidate collection guidance;
- nested surface grammar;
- three mounted sibling surfaces and one active `main`;
- neutral application mount root;
- stable `aria-pressed` selector nodes;
- live-status and transient-limit reset paths;
- instant comparison return;
- absence of Decision and transaction mechanics;
- CSS-derived 320px and 390px geometry bounds.

## Narrow reverse-review corrections

Implementation and review found and corrected:

1. **Old CND2 exclusion contract** — historical tests still treated all comparison state as forbidden; they now require comparison to remain separate and transaction-free.
2. **Brittle source assertion** — the comparison return contract initially depended on a local variable name rather than return behavior.
3. **Surface bypass** — comparison could initially open directly from the menu; it now requires Candidate-workspace origin.
4. **Additional transition bypasses** — Candidate workspace, locator, and comparison toggles now enforce their active surfaces.
5. **Candidate-change early return** — a Candidate-state change could rebuild selectors but skip comparison evidence; both projections now update consistently.
6. **Reduced-Candidate guidance** — one selected Product with only one remaining Candidate initially asked for another selection instead of reporting the Candidate shortage.
7. **Invalid toggle side effect** — unknown or non-Candidate actions briefly sanitized state; they now remain referential no-ops.
8. **Fake shared labels** — the new label module initially served only comparison while menu reading kept duplicate maps; both now share the stable labels.
9. **Transient limit persistence** — the three-item warning could survive leaving and reopening comparison; Back now resets it while hidden.
10. **Unused projection import** — an unused App import and `void` suppression were removed.
11. **Nested main landmarks** — the mount root was a `main` containing active surface mains; it is now a neutral `div`.

## Geometry evidence

The CSS contract fixes:

```text
comparison horizontal padding      0.85rem per side
selector button                    3.5rem × 1.7rem
dimension value column             max(6.8rem, 42%)
dimension gap                      0.55rem
comparison entry row               2.35rem
```

A deterministic CSS-derived calculation reports:

```text
320px viewport
content width        292.8px
name column          161.0px
value column         123.0px
selector copy        228.0px
focus inset            7.6px

390px viewport
content width        362.8px
name column          201.6px
value column         152.4px
selector copy        298.0px
focus inset            7.6px
```

This is a code-derived geometry contract, not runtime-browser evidence. The current container could not launch even a minimal headless Chromium `--dump-dom` process, and the PR workflow does not publish a downloadable Pages artifact. Complete branch-runtime Chromium verification and real-device fit remain unclaimed.

## CI evidence

The latest implementation head passes:

```text
Typecheck         ✓
Tests             ✓
Static build      ✓
```

## Current disposition

```text
[implemented, awaiting review] CMP1 — Bounded Candidate comparison
```

Questions for final review:

- Does explicit 2–3 item selection remain clearly distinct from Candidate membership?
- Does the vertical dimension-block grammar reduce scanning burden without becoming a specification dump?
- Are source and confidence labels informative rather than noisy?
- Is the Candidate-workspace-only entry discoverable enough?
- Are `比較`, `回到考慮項目`, and the non-order hint sufficiently clear?
- Does the CSS geometry hold in a complete runtime browser at 320px and 390px?
- Should CMP1 pass, be revised, or be rejected for the current scope?

No measured memory reduction, decision improvement, real-device usability, natural terminology, unfamiliar-participant comprehension, or conventional-interface superiority is claimed.

## Blocked later work

CMP1 implementation does not authorize:

- winner selection or `決定點這道`;
- explicit Decision;
- Configuration;
- Current order;
- quantity or modifier selection;
- totals, cart, checkout, or submission;
- recommendation, ranking, filtering, or table composition;
- routing, persistence, backend, analytics, or a conventional baseline.

## Contract impact

None.

CMP1 implements the bounded Candidate comparison already anticipated by `docs/product-contract.md`, `docs/interaction-model.md`, `docs/demo-scope.md`, and `docs/evaluation-plan.md`. It does not change Candidate or transaction invariants.
