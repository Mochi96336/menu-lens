# Menu Lens

Menu Lens is a decision-first restaurant menu prototype.

It explores a simple problem: most QR ordering interfaces begin with transaction mechanics—product cards, modifiers, cart, and checkout—before helping people understand the menu, compare possibilities, or coordinate a table.

Menu Lens separates three layers that are often collapsed into one:

1. **Menu map** — What does this restaurant offer? How large is the menu, how is it organized, and what is the price range?
2. **Decision support** — What information helps a diner understand nearby alternatives while choices remain reversible?
3. **Transaction system** — Which specifications, quantities, order rounds, and payment actions are required to complete the order?

The first demo focuses on the space before the cart:

```text
browse → understand → decide → configure → order
```

## Core hypothesis

A digital menu can preserve the overview, density, spatial memory, and editorial judgment of a good paper menu while adding trustworthy state and reversible detail.

The experience should feel like **reading a menu**, not operating a miniature self-checkout terminal or managing a formal decision workflow.

## Product invariants

- The full menu is a first-class experience, not a fallback.
- Browsing is not ordering.
- Product details should not destroy browsing position or spatial memory.
- Required configuration begins after explicit purchase intent.
- Lenses are views over one canonical menu, not separately maintained catalogs.
- Switching views must preserve order state, constraints, and browsing context.
- Merchant data supports progressive enhancement.
- Missing semantic metadata should degrade enhanced features without breaking complete-menu browsing.
- Wrong operational information is worse than absent information.
- A clean domain distinction does not automatically justify a separate customer-facing control or surface.

The authoritative version of the core rules remains [`docs/product-contract.md`](docs/product-contract.md). PR #4 exposed a mismatch between those rules and the interaction direction being implemented; that direction is now explicitly rejected rather than silently promoted into the product contract.

## First research questions

The next implementation should investigate:

1. Can a mobile complete menu establish the restaurant's scope, categories, approximate size, and price range without requiring interaction?
2. Can nearby Products be compared through stable alignment, proximity, density, and hierarchy rather than a separate comparison workflow?
3. Can Product detail appear in place and remain reversible without destroying reading position or hiding surrounding alternatives?

A conventional comparison interface remains parked. Candidate, Anchor, semantic-axis, and dedicated comparison workflows are also parked until a simpler menu document proves insufficient.

## Replacement demo direction

### Primary customer flow

```text
restaurant overview
→ visible menu structure
→ complete menu document
→ inline Product detail
→ explicit order intent
→ required configuration
→ current order
```

The replacement direction begins again from the complete-menu and inline-detail baseline on `main`.

It does not assume that Candidate state, explicit comparison selection, or a decision workspace must exist in the default customer flow.

### Later, only if demonstrated necessary

- optional saved items for very large menus or long sessions;
- group coordination and coarse table composition;
- submitted order rounds;
- thin quick, shared-table, and featured lenses;
- merchant category defaults and exception editing;
- explicit comparison tools when layout alone cannot support the task.

### Explicitly out of scope

- payment;
- authentication and membership;
- POS or KDS integration;
- live inventory and precise preparation-time prediction;
- real-time multi-device collaboration;
- opaque AI recommendations;
- production restaurant operations;
- a conventional comparison implementation in the first replacement build.

## Low-entropy implementation direction

The first coded version should remain easy to read, test, change, and delete:

- one client application;
- one local canonical dataset;
- one explicit application state model;
- one bounded experimental slice at a time;
- no backend;
- no premature monorepo;
- no generic plugin system;
- no separate design-system package;
- no abstraction justified only by hypothetical future scale;
- failed interaction experiments should be recorded and stopped rather than repaired indefinitely;
- comparison should first be attempted through document structure, not a new mode.

See the detailed implementation contract in [`docs/product-contract.md`](docs/product-contract.md).

## Shared project memory

The repository, not chat history, is the shared memory across conversations.

Every workstream should begin with:

1. [`README.md`](README.md)
2. [`docs/product-contract.md`](docs/product-contract.md)
3. [`docs/glossary.md`](docs/glossary.md)
4. [`docs/workstreams.md`](docs/workstreams.md)
5. the documents directly related to its scope

Use [`docs/handoff.md`](docs/handoff.md) when opening or closing a separate workstream conversation.

## Core documents

- [`docs/product-contract.md`](docs/product-contract.md) — authoritative product invariants, state boundaries, and low-entropy implementation contract
- [`docs/glossary.md`](docs/glossary.md) — shared terminology for documents, data, code, issues, and conversations
- [`docs/workstreams.md`](docs/workstreams.md) — current sequencing, active scope, parked work, and entry criteria
- [`docs/handoff.md`](docs/handoff.md) — required reading, opening prompt, escalation rules, and closing report
- [`docs/problem-framing.md`](docs/problem-framing.md) — why current QR ordering often feels harder to read than paper
- [`docs/interaction-model.md`](docs/interaction-model.md) — historical interaction model; it must not override the current disposition without contract review
- [`docs/merchant-data-strategy.md`](docs/merchant-data-strategy.md) — progressive metadata, category defaults, confidence, governance, and graceful degradation
- [`docs/demo-scope.md`](docs/demo-scope.md) — reference restaurant, primary flow, exclusions, and build sequence
- [`docs/evaluation-plan.md`](docs/evaluation-plan.md) — formative tasks, observations, local events, and falsification signals
- [`docs/pr-4-direction-disposition.md`](docs/pr-4-direction-disposition.md) — product-owner rejection of the PR #4 interaction family and replacement direction

PR #4 research records remain available as negative evidence:

- [`docs/relational-menu-research.md`](docs/relational-menu-research.md)
- [`docs/prototype-b-anchor-plan.md`](docs/prototype-b-anchor-plan.md)
- [`docs/prototype-c-anchor-axis-plan.md`](docs/prototype-c-anchor-axis-plan.md)
- [`docs/candidate-marks-plan.md`](docs/candidate-marks-plan.md)
- [`docs/candidate-workspace-plan.md`](docs/candidate-workspace-plan.md)
- [`docs/candidate-comparison-plan.md`](docs/candidate-comparison-plan.md)

## Current status

The foundation, domain schema, reference dataset, formative evaluation protocol, and first complete-menu baseline are complete on `main`.

PR #4 explored a large interaction family:

```text
M1 compressed overview + shared ledger
→ Anchor and semantic-axis experiments
→ Candidate marks
→ Candidate workspace
→ explicit comparison selection
→ comparison surface
```

The implementation is technically careful, but the combined direction is rejected as the active product foundation because it turns menu reading into a formal decision workflow and adds controls without sufficient demonstrated customer value.

```text
[rejected as active direction] PR #4 interaction family
→ [next] digital menu document UI direction from main
→ [blocked] Decision / Configuration / Current order
```

Do not continue product implementation on `agent/menu-map-atlas`. Preserve PR #4 as a Draft research artifact, do not merge it, and begin the replacement UI direction on a separate branch from current `main`.
