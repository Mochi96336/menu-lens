# Workstreams

This file is the current coordination view for Menu Lens.

It prevents parallel conversations from redefining the product, retaining failed interaction surfaces, or expanding the demo before the decision spine is coherent.

## Coordination rules

- The core conversation owns product-contract changes and cross-workstream conflict resolution.
- Each implementation conversation owns one bounded outcome.
- Cross-cutting discoveries must be recorded instead of silently expanding scope.
- Desktop-only differences and visual polish do not prove a product difference.
- Failed or insufficient experiments remain isolated as evidence instead of accumulating in the active path.
- Conventional-interface comparison remains parked.
- Prefer fewer moving parts, dependencies, and abstractions while the product model is still being tested.
- Do not merge Product, Candidate, comparison selection, DraftOrderItem, ConfiguredOrderItem, or SubmittedOrderRound state.
- Passing one slice does not automatically authorize the next surface.

## Current sequence

```text
[complete] foundation memory
→ [complete] domain schema and reference dataset
→ [complete] formative evaluation protocol
→ [active] customer decision spine
    [complete] complete-menu technical baseline
    → [passed] mobile-first relational menu reading
        [rejected] large category Atlas
        → [rejected] desktop-first static workspace
        → [passed] M1 compressed overview + shared ledger
        → [rejected] M2 modal Product detail
        → [rejected, removed] C1 fixed Product focus rail
        → [useful but insufficient] Prototype A — Axis-only score
        → [useful but insufficient] Prototype B — Anchor-only relation
        → [passed for current scope] Prototype C — Anchor + explicit shared axis
    → [passed for current scope] CND1 — Attached Candidate marks
    → [passed for current scope] CND2 — Candidate review workspace
    → [implemented, awaiting review] CMP1 — Bounded Candidate comparison
    → [blocked] Decision / Configuration / Current order
→ [deferred] continuity and table state
→ [deferred] thin alternative lenses
→ [deferred] merchant-authoring test
→ [parked] conventional baseline decision
```

## Workstream status

| Workstream | Status | Scope | Primary output |
|---|---|---|---|
| Foundation memory | Complete | product contract, glossary, boundaries, handoff | stable shared memory |
| Domain and reference data | Complete | types, validation, fictional menu, incomplete metadata | canonical local dataset |
| Formative evaluation | Complete | tasks, observations, events, falsification signals | observation contract |
| Relational menu research | Passed for current scope | stable ledger and A/B/C evidence | accepted C reading substrate |
| CND1 Attached Candidate marks | Passed for current scope | row-attached reversible Candidate membership | accepted consideration state |
| CND2 Candidate review workspace | Passed for current scope | derived retrieval, revisit, removal, exact menu return | accepted Candidate collection surface |
| CMP1 Bounded Candidate comparison | Implemented, awaiting review | explicit 2–3 Candidate selection and difference-only evidence | reviewable bounded comparison surface |
| Decision / Configuration / Current order | Blocked | transaction-boundary states | explicit CMP1 disposition first |
| Continuity and table state | Deferred | submitted rounds and coarse composition | stable decision spine first |
| Alternative lenses | Deferred | quick, shared-table, featured | stable decision spine first |
| Merchant authoring | Deferred | defaults, exceptions, confidence preview | proven semantic value first |
| Conventional baseline | Parked | conventional comparison condition | explicit later research need |
| Production integration | Out of scope | payment, POS, KDS, auth, live inventory | none |

## Authoritative entry points

Read before CMP1 review:

1. `README.md`
2. `docs/product-contract.md`
3. `docs/glossary.md`
4. `docs/workstreams.md`
5. `docs/candidate-workspace-plan.md`
6. `docs/candidate-comparison-plan.md`
7. `docs/interaction-model.md`
8. `docs/demo-scope.md`
9. `docs/evaluation-plan.md`

Active implementation record:

```text
docs/candidate-comparison-plan.md
```

Accepted substrate records:

```text
docs/relational-menu-research.md
docs/prototype-b-anchor-plan.md
docs/prototype-c-anchor-axis-plan.md
docs/candidate-marks-plan.md
docs/candidate-workspace-plan.md
```

## Relational prototype dispositions

### Prototype A — Axis-only score

```text
[useful but insufficient]
```

Useful:

- one shared dimension supported simultaneous multi-Product scanning;
- portion and preparation exposed explicit known and unknown states;
- canonical order and geometry remained stable.

Insufficient:

- price duplicated the visible numeric price column;
- only one dimension remained visible;
- axis switching retained memory work.

The obsolete selector UI was removed. Its pure projection remains as historical evidence.

### Prototype B — Anchor-only relation

```text
[useful but insufficient]
```

Useful:

- exact price deltas removed repeated arithmetic;
- one temporary Anchor fit the domain model;
- canonical rows, statuses, and geometry remained stable.

Decisive failure:

- row-level semantic selection mixed dimensions;
- trusted differences were silently suppressed;
- omission was indistinguishable from equality;
- the surface could imply false exclusivity.

### Prototype C — Anchor + explicit shared axis

```text
[passed for current scope]
```

C preserves one Anchor and exact price deltas while the user explicitly selects one category-wide `份量` or `準備` axis.

Accepted evidence:

- complete active-axis projection across canonical rows;
- formal absolute labels or `未提供`;
- exact price deltas and visible equality;
- stable canonical order and four-column ledger;
- same-category axis preference preservation;
- row-local keyboard focus after Anchor selection and Escape;
- stable 320px and 390px geometry proxy;
- passing Typecheck, tests, and static build.

Evidence boundary:

- acceptance is a current-scope product disposition;
- unfamiliar-participant evidence is not claimed;
- learnability and measured task improvement remain unproven.

## CND1 — Attached Candidate marks

```text
[passed for current scope]
```

State boundary:

```text
Product
→ Candidate membership by ProductId
```

Candidate membership has no quantity, configuration, modifier selections, order total, submission state, recommendation rank, notes, or ownership.

Available rows expose one persistent `考慮` toggle. Membership is expressed through `aria-pressed` and pressed styling. Sold-out rows remain visible and cannot be newly marked.

Candidate membership survives overview, category focus, all-expanded mode, every Anchor transition, semantic-axis switching, and same-category reopening.

Final review corrected stale ProductId counting, Candidate-dependent Product typography, repeated live-region announcements, changing toggle labels, an unused row state mirror, and a premature detached-list projection.

## CND2 — Candidate review workspace

```text
[passed for current scope]
```

Boundary:

```text
canonical Category and Product references
+ Candidate ProductId membership
→ derived Candidate review workspace
```

The workspace stores no Product copies, Candidate insertion order, ranking, score, quantity, Configuration, totals, or order state.

Implemented behavior:

- one fixed-geometry `查看考慮項目` entry;
- compact canonical grouped document;
- exactly two row actions: `在菜單中查看` and `移出考慮`;
- exact ordinary Back restoration;
- canonical Product locator;
- deterministic removal focus;
- in-place empty state;
- one active and interactive `main` surface.

Final review corrected unavailable Back focus, sold-out locator focus, hidden workspace rebuilds, hidden-status geometry, inherited smooth scrolling, and a stale CSS branch.

Evidence boundary:

- complete runtime Chromium verification at 320px and 390px is not claimed;
- real-device fit and unfamiliar-participant comprehension remain unproven.

## CMP1 — Bounded Candidate comparison

```text
[implemented, awaiting review]
```

Research question:

> Can a diner reduce repeated memory work across two or three serious Candidates using a bounded, truthful comparison without mistaking comparison selection for commitment or losing the Candidate workspace?

### Implemented boundary

```text
canonical Products
+ Candidate ProductId membership
+ identity-only comparison selection
→ bounded comparison projection
```

Comparison state:

```ts
type CandidateComparisonState = Readonly<{
  productIds: ReadonlyArray<ProductId>;
}>;
```

App surface:

```text
surface.kind = menu | candidates | comparison
```

Selection contains only current Candidates, no duplicates, at most three ProductIds, and canonical Product order. Opening comparison never preselects Products. Candidate removal sanitizes selection; re-adding a Candidate does not reselect it.

### Entry and surface grammar

CND2 Product rows retain their two actions. CMP1 adds one Candidate-workspace header action:

```text
比較考慮項目
```

Pure transitions enforce:

```text
menu
→ Candidate workspace
→ comparison
→ Candidate workspace
→ exact previous menu context
```

Comparison cannot open directly from the menu. Comparison selection changes only on the active comparison surface. Candidate locator and Candidate-workspace transitions cannot bypass comparison Back.

The mount root is a neutral `div`; menu, Candidate workspace, and comparison remain mounted sibling `main` surfaces with exactly one visible and interactive.

### Comparison grammar

Every Candidate appears in canonical order with one persistent `比較` button using `aria-pressed`.

A fourth selection is a no-op and uses one bounded status message. The transient limit warning resets while comparison is hidden, so reopening shows the real selection summary.

CMP1 uses vertical dimension blocks rather than a wide Product-column matrix.

Fixed-priority dimensions:

1. exact price;
2. portion class;
3. meal role;
4. preparation class;
5. shareability;
6. coarse traits;
7. required customization presence.

Price is always visible. Semantic dimensions appear only for meaningful value differences or missing/low-confidence evidence. Equal complete dimensions and all-missing dimensions are omitted.

Evidence distinguishes:

```text
商家確認
分類預設
低可信
未提供
```

Required customization shows only `有必選項目` or `無必選項目`; modifier names, options, prices, defaults, and controls remain absent.

### Empty and reduced states

```text
0 selected   選擇 2–3 道考慮項目開始比較。
1 selected   再選 1 道即可比較。
2–3 selected render bounded evidence
```

If the Candidate set falls below two while comparison remains active, the surface states that at least two Candidates are required and does not silently navigate away.

### Test-first implementation

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

Tests cover selection bounds, canonical order and references, Candidate independence, stale and reduced state, missing and low-confidence evidence, sold-out Candidates, nested surface grammar, focus and instant scroll paths, neutral landmarks, and exclusion of Decision and transaction mechanics.

### Narrow reverse-review corrections

1. historical CND2 tests still forbade all comparison state;
2. one static return assertion depended on a variable name rather than behavior;
3. comparison could open directly from menu;
4. other pure transitions could bypass nested surface grammar;
5. Candidate changes could rebuild selectors but skip evidence;
6. reduced Candidate count could produce impossible one-selection guidance;
7. invalid toggle actions briefly caused sanitation side effects;
8. semantic labels were initially duplicated rather than genuinely shared;
9. the three-item warning could persist after leaving and reopening;
10. an unused projection import and suppression remained in App;
11. the application mount root created nested main landmarks.

### Geometry and evidence boundary

CSS-derived geometry contract:

```text
viewport     name column   value column   selector copy   focus inset
320px        161.0px       123.0px        228.0px         7.6px
390px        201.6px       152.4px        298.0px         7.6px
```

This is not complete runtime-browser evidence. The execution container could not launch a minimal headless Chromium process, and PR CI does not publish a downloadable Pages artifact.

Passing evidence:

- Typecheck;
- domain and app-state tests;
- projection and surface tests;
- structure, accessibility, focus, scroll, and geometry contracts;
- static build.

Evidence not claimed:

- reduced memory work for unfamiliar users;
- natural comprehension of comparison selection;
- improved or faster decisions;
- real-device fit;
- conventional-interface superiority.

### Current gate

CMP1 awaits explicit product-owner disposition. Do not begin the next state until CMP1 is accepted, revised, or rejected.

## Blocked later work

CMP1 implementation does not authorize:

- winner selection or `決定點這道`;
- explicit Decision;
- Configuration;
- Current order;
- quantity or modifier selection;
- totals, cart, checkout, or submission;
- recommendation, ranking, filtering, or table composition;
- routing, persistence, backend, analytics, or conventional baseline work.

## Constraints

- no backend, database, authentication, payment, POS, or KDS integration;
- no conventional baseline;
- no alternative lens implementation;
- no merchant CMS;
- no remote analytics;
- no generic state machine, repository abstraction, plugin system, comparison-field registry, or design-system package;
- preserve canonical Product and category order;
- preserve `Product ≠ Candidate ≠ comparison selection ≠ DraftOrderItem ≠ ConfiguredOrderItem ≠ SubmittedOrderRound`;
- do not count visual polish or desktop-only behavior as proof.

## Contract impact

None.

Prototype C, CND1, CND2, and CMP1 implement existing product invariants without changing `docs/product-contract.md`.
