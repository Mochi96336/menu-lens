# Workstreams

This file is the current coordination view for Menu Lens.

It exists to prevent parallel conversations from redefining the product, carrying rejected experiments forward, or expanding the demo before the active UI question is answered.

## Coordination rules

- The core conversation owns product-contract changes and cross-workstream conflict resolution.
- Each implementation conversation owns one bounded outcome.
- Cross-cutting discoveries must be recorded instead of silently expanding scope.
- A technically valid state boundary does not automatically justify a customer-facing control or surface.
- Comparison should first be attempted through layout, proximity, alignment, and density.
- Failed or insufficient interaction experiments remain research evidence and must not accumulate in the active path.
- Conventional-interface comparison remains parked.
- Prefer fewer moving parts, dependencies, and abstractions while the product model is still being tested.
- Passing one slice does not automatically authorize the next transaction state.

## Current sequence

```text
[complete] foundation memory
→ [complete] domain schema and reference dataset
→ [complete] formative evaluation protocol
→ [complete] first complete-menu + inline-detail baseline
→ [rejected] PR #4 explicit decision-workflow direction
→ [active planning] digital menu document UI
→ [blocked] bounded implementation prototype
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
| Complete-menu baseline | Complete | overview, stable full menu, category navigation, inline detail | runnable main baseline |
| PR #4 interaction family | Rejected as active direction | Anchor, semantic axes, Candidate, separate comparison | negative research evidence |
| Digital menu document UI | Active planning | layout-first overview, dense rows, inline detail, continuity | reviewed UI direction |
| Replacement implementation prototype | Blocked | bounded changes to the main baseline | explicit direction approval first |
| Decision / Configuration / Current order | Blocked | transaction-boundary states | stable reading direction first |
| Continuity and table state | Deferred | submitted rounds and coarse composition | stable decision spine first |
| Alternative lenses | Deferred | quick, shared-table, featured | stable menu document first |
| Merchant authoring | Deferred | defaults, exceptions, confidence preview | proven semantic value first |
| Conventional baseline | Parked | conventional comparison condition | explicit later research need |
| Production integration | Out of scope | payment, POS, KDS, auth, live inventory | none |

## Authoritative entry points

Read before any new customer UI work:

1. `README.md`
2. `docs/product-contract.md`
3. `docs/glossary.md`
4. `docs/workstreams.md`
5. `docs/menu-document-ui-direction.md`
6. `docs/problem-framing.md`
7. `docs/merchant-data-strategy.md`
8. `docs/evaluation-plan.md`
9. `docs/demo-scope.md`

Active planning record:

```text
docs/menu-document-ui-direction.md
```

Historical interaction documents may inform review, but they do not authorize implementation that conflicts with the current disposition.

## Completed foundation work

The repository already provides:

- canonical TypeScript menu and order-state types;
- runtime validation for the local dataset boundary;
- one fictional restaurant with 30 Products and six Categories;
- required and optional modifier examples;
- personal and shared portion examples;
- sold-out Products that remain in the canonical collection;
- intentionally incomplete semantic metadata;
- metadata source and confidence representation;
- focused compile-time and runtime invariant tests;
- one runnable static client on `main`;
- restaurant overview and complete-menu trust cues;
- all Categories and Products in one stable document;
- category navigation that moves without filtering or replacing Products;
- inline Product detail resolved by stable `ProductId`;
- keyboard open, Escape close, focus return, and reduced-motion behavior.

## Rejected direction: PR #4

PR #4 explored:

```text
relational reading
→ Anchor selection
→ semantic-axis selection
→ Candidate marking
→ Candidate workspace
→ separate comparison membership
→ comparison surface
```

The direction was rejected as the active product foundation because it converted a menu-reading problem into a formal decision workflow.

The branch remains useful for:

- negative research evidence;
- state-boundary and canonical-identity lessons;
- truthful missing and confidence states;
- focus, scroll, hidden-surface, and accessibility lessons;
- examples of technically correct interactions that did not demonstrate sufficient customer value.

Do not continue product implementation on `agent/menu-map-atlas`.

Do not merge Candidate, Anchor, semantic-axis, or comparison-surface UI into the replacement baseline merely because those components already exist.

## Active workstream: digital menu document UI

### Goal

Define a mobile-first interface that behaves like a well-composed digital menu document:

```text
restaurant overview
→ visible menu structure
→ complete menu document
→ inline Product detail
```

The default interface should support understanding and nearby comparison without requiring a decision mode.

### Required direction

- useful restaurant and menu overview before interaction;
- a compact category map that behaves as a table of contents, not filters;
- one stable complete-menu document;
- Category sections as the primary visual grouping;
- dense aligned Product rows rather than isolated cards;
- comparison through proximity, shared columns, hierarchy, and repeated information positions;
- at most one or two high-value cues in collapsed rows;
- inline reversible detail;
- sold-out and incomplete-data states that remain visible;
- restrained transaction affordances;
- mobile grammar tested at 320px and 390px;
- desktop widening that preserves the same information architecture.

### Explicit exclusions

- Candidate state or saved-item workflow;
- Candidate workspace;
- explicit comparison membership;
- dedicated comparison surface;
- Anchor or semantic-axis controls;
- recommendation, ranking, filtering, or questionnaire flow;
- quantity or modifier controls;
- Decision, Current order, totals, checkout, or submission;
- persistence, URL state, router, backend, or remote analytics;
- alternative lenses;
- generic layout engine, state-machine framework, plugin system, or design-system package.

### Planning outputs

The active planning document must define:

- product question;
- primary user jobs;
- UI principles;
- information architecture;
- mobile row and detail grammar;
- desktop widening behavior;
- first prototype variants;
- recommended starting point;
- implementation scope and exclusions;
- direct evaluation tasks;
- success and falsification signals;
- open questions requiring prototype evidence.

These outputs are recorded in `docs/menu-document-ui-direction.md`.

### Approval gate

The direction is ready for implementation only after an explicit product-owner disposition answers:

1. Does the proposed UI return to the original menu-reading problem?
2. Is comparison primarily achieved by layout rather than additional workflow?
3. Can the first prototype remain one bounded modification of the `main` baseline?
4. Are Candidate and dedicated comparison features genuinely absent from the default path?
5. Are the first evaluation tasks capable of falsifying the direction?

Approval authorizes only the first menu-document prototype.

## Replacement implementation prototype

```text
[blocked]
```

When authorized, the first implementation slice should include only:

1. compact restaurant header;
2. visible category map with counts and bounded price information;
3. one continuous complete-menu document;
4. strong Category section hierarchy;
5. aligned dense Product rows;
6. one or two bounded row cues;
7. inline Product detail;
8. sold-out and incomplete-data states;
9. exact close and return continuity;
10. 320px, 390px, and desktop geometry checks.

It should begin from current `main`, not PR #4.

## Blocked later work

The active planning or first replacement prototype does not authorize:

- Candidate or comparison workflow revival;
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
- no generic state machine, repository abstraction, plugin system, layout engine, or design-system package;
- preserve canonical Product and Category order;
- preserve domain separation between Product, order intent, Configuration, and submitted order state;
- do not expose every domain distinction as a customer control;
- do not count visual polish or desktop-only behavior as proof;
- do not treat implementation completeness as evidence of product usefulness.

## Contract impact

The replacement direction narrows the immediate UI investigation and parks Candidate and dedicated comparison workflows.

Before implementation begins, `docs/product-contract.md`, `docs/interaction-model.md`, `docs/demo-scope.md`, and `docs/evaluation-plan.md` should be reviewed for language that still assumes Candidate and comparison are mandatory steps. Any invariant or research-question change must be explicitly recorded rather than inferred from this workstream document alone.
