# Menu Lens

Menu Lens is a decision-first restaurant menu prototype.

It explores a simple problem: most QR ordering interfaces begin with transaction mechanics—product cards, modifiers, cart, and checkout—before helping people understand the menu, compare possibilities, or coordinate a table.

Menu Lens separates three layers that are often collapsed into one:

1. **Menu map** — What does this restaurant offer? How large is the menu, how is it organized, and what is the price range?
2. **Decision workspace** — What am I considering? How do the options differ? What has the table already chosen, and what may still be missing?
3. **Transaction system** — Which specifications, quantities, order rounds, and payment actions are required to complete the order?

The first demo focuses on the space before the cart:

```text
browse → consider → compare → decide → configure → order
```

## Core hypothesis

A digital menu can preserve the overview, density, spatial memory, and editorial judgment of a good paper menu while adding reversible decision support and visible table state.

The experience should feel like **reading and arranging a meal**, not operating a miniature self-checkout terminal.

## Product invariants

- The full menu is a first-class experience, not a fallback.
- Browsing is not ordering.
- A candidate is not an order item.
- Product details should not destroy browsing position or spatial memory.
- Required configuration begins after explicit purchase intent.
- Lenses are views over one canonical menu, not separately maintained catalogs.
- Switching views must preserve candidates, order state, constraints, and browsing context.
- Merchant data supports progressive enhancement.
- Missing semantic metadata should degrade enhanced features without breaking complete-menu browsing.
- Wrong operational information is worse than absent information.

The authoritative version of these rules is [`docs/product-contract.md`](docs/product-contract.md).

## First research questions

The initial implementation investigates only three primary questions:

1. Can a dense, stable full-menu view establish overview without making users fear that products are hidden?
2. Does separating candidates from order items support genuine consideration without using the cart as a bookmark?
3. Can inline detail and preserved browsing context improve comparison without destroying spatial memory?

A conventional comparison interface is deliberately parked. The project should first make the Menu Lens interaction internally coherent and observable before deciding whether a formal baseline is useful.

## Initial demo scope

### Primary customer flow

```text
full menu
→ inline detail
→ candidate workspace
→ candidate comparison
→ explicit decision
→ required configuration
→ current order
```

### Later, only after the decision spine works

- preserved state across views
- submitted order rounds
- coarse table composition
- thin quick, shared-table, and featured lenses
- merchant category defaults and exception editing

### Explicitly out of scope

- payment
- authentication and membership
- POS or KDS integration
- live inventory and precise preparation-time prediction
- real-time multi-device collaboration
- opaque AI recommendations
- production restaurant operations
- a conventional comparison implementation in the first build

## Low-entropy implementation direction

The first coded version should remain easy to read, test, change, and delete:

- one client application
- one local canonical dataset
- one explicit application state model
- one end-to-end decision flow
- no backend
- no premature monorepo
- no generic plugin system
- no separate design-system package
- no abstraction justified only by hypothetical future scale

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

- [`docs/product-contract.md`](docs/product-contract.md) — authoritative product invariants, first research questions, state boundaries, and low-entropy implementation contract
- [`docs/glossary.md`](docs/glossary.md) — shared terminology for documents, data, code, issues, and conversations
- [`docs/workstreams.md`](docs/workstreams.md) — current sequencing, active scope, parked work, and entry criteria
- [`docs/handoff.md`](docs/handoff.md) — required reading, opening prompt, escalation rules, and closing report
- [`docs/problem-framing.md`](docs/problem-framing.md) — why current QR ordering often feels harder to read than paper
- [`docs/interaction-model.md`](docs/interaction-model.md) — menu map, candidate workspace, lens behavior, table state, and reversibility
- [`docs/merchant-data-strategy.md`](docs/merchant-data-strategy.md) — progressive metadata, category defaults, confidence, governance, and graceful degradation
- [`docs/demo-scope.md`](docs/demo-scope.md) — reference restaurant, primary flow, exclusions, and build sequence
- [`docs/evaluation-plan.md`](docs/evaluation-plan.md) — formative tasks, observations, local events, and falsification signals
- [`docs/research-history/architecture.md`](docs/research-history/architecture.md) — prototype registry, family, lineage, status, and contribution rules

## Current status

The cross-conversation foundation, domain dataset, formative protocol, and first complete-menu slice are complete. New workstreams can rely on the repository instead of prior chat history.

The active workstream is spatial interaction exploration. Prototypes are organized into six families—document, relational, horizontal, matrix-paper, 18-derived landscape, and depth—rather than maintained as another numbered list in this README.

The canonical catalog is [`research-history/prototype-registry.js`](research-history/prototype-registry.js). It records each node's family, parent, status, executable path, and required assets; the research archive and validator both consume it. See [`docs/workstreams.md`](docs/workstreams.md) for current work, [`docs/research-history/spatial-exploration.md`](docs/research-history/spatial-exploration.md) for mechanism notes, and [`docs/research-history/product-direction-review.md`](docs/research-history/product-direction-review.md) for explicitly sourced product review.

Candidate, comparison, Decision, Configuration, and Current order implementation remain paused while the current spatial variants are refined.
