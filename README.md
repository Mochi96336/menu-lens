# Menu Lens

Menu Lens is a restaurant menu prototype focused on making mobile menu reading easier before transaction mechanics begin.

It explores a simple problem: most QR ordering interfaces begin with product cards, modifiers, cart, and checkout before helping people understand the restaurant, compare nearby dishes, or preserve their place.

Menu Lens separates three layers that are often collapsed into one:

1. **Menu document** — What does this restaurant offer? How large is the menu, how is it organized, and what is the price range?
2. **Decision support** — Which information helps a diner compare and understand Products while choices remain reversible?
3. **Transaction system** — Which specifications, quantities, order rounds, and payment actions are required after explicit order intent?

The next prototype focuses on the menu document:

```text
understand → browse → inspect → decide → configure → order
```

## Core hypothesis

A digital menu can preserve the overview, density, spatial memory, and editorial judgment of a good paper menu while adding reversible detail and trustworthy live state.

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
- A valid domain distinction does not automatically justify a separate customer-facing control or surface.

The authoritative version of the core rules remains [`docs/product-contract.md`](docs/product-contract.md).

## Current research questions

The next implementation investigates:

1. Can a mobile complete menu establish the restaurant's scope, categories, approximate size, and price range without requiring interaction?
2. Can nearby Products be compared through stable alignment, proximity, density, and hierarchy rather than a separate comparison workflow?
3. Can Product detail appear in place and remain reversible without destroying reading position or hiding surrounding alternatives?

Candidate, Anchor, semantic-axis, dedicated comparison, and conventional comparison interfaces remain parked until a simpler menu document proves insufficient.

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

The first replacement slice ends at inline Product detail.

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
- a conventional comparison implementation in the replacement build.

## Low-entropy implementation direction

The next coded version should remain easy to read, test, change, and delete:

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
- [`docs/interaction-model.md`](docs/interaction-model.md) — historical interaction model; future changes must follow the current workstream disposition
- [`docs/menu-document-ui-direction.md`](docs/menu-document-ui-direction.md) — active replacement UI direction, information architecture, prototype variants, and evaluation gates
- [`docs/merchant-data-strategy.md`](docs/merchant-data-strategy.md) — progressive metadata, category defaults, confidence, governance, and graceful degradation
- [`docs/demo-scope.md`](docs/demo-scope.md) — reference restaurant, primary flow, exclusions, and build sequence
- [`docs/evaluation-plan.md`](docs/evaluation-plan.md) — formative tasks, observations, local events, and falsification signals

## Current status

The foundation, domain schema, reference dataset, formative evaluation protocol, and first complete-menu baseline are complete.

Draft PR #4 explored relational reading, Anchor and semantic-axis controls, Candidate marks, a Candidate workspace, and a dedicated comparison surface. The interaction family was rejected as the active product direction because it turned menu reading into a formal decision workflow and added controls without sufficient demonstrated value.

The replacement direction begins again from the complete-menu and inline-detail baseline on `main`:

```text
[complete] foundation, domain data, evaluation, complete-menu baseline
→ [active planning] digital menu document UI
→ [blocked] implementation prototype
→ [blocked] Decision / Configuration / Current order
```

The active planning record is [`docs/menu-document-ui-direction.md`](docs/menu-document-ui-direction.md).
