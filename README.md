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
- A Candidate is not an order item.
- Comparison selection is not Candidate membership or commitment.
- Product details should not destroy browsing position or spatial memory.
- Required configuration begins after explicit purchase intent.
- Lenses are views over one canonical menu, not separately maintained catalogs.
- Switching views must preserve Candidates, order state, constraints, and browsing context.
- Merchant data supports progressive enhancement.
- Missing semantic metadata should degrade enhanced features without breaking complete-menu browsing.
- Wrong operational information is worse than absent information.

The authoritative version of these rules is [`docs/product-contract.md`](docs/product-contract.md).

## First research questions

The initial implementation investigates only three primary questions:

1. Can a dense, stable full-menu view establish overview without making users fear that Products are hidden?
2. Does separating Candidates from order items support genuine consideration without using the cart as a bookmark?
3. Can relational reading, preserved context, and bounded comparison reduce memory work without destroying spatial memory?

A conventional comparison interface is deliberately parked. The project should first make the Menu Lens interaction internally coherent and observable before deciding whether a formal baseline is useful.

## Initial demo scope

### Product-level decision spine

```text
full menu
→ relational reading
→ reversible consideration
→ Candidate review workspace
→ bounded comparison
→ explicit decision
→ required configuration
→ current order
```

Prototype C establishes the accepted relational-reading substrate. CND1 establishes reversible Candidate membership directly on canonical Product rows. CND2 establishes a derived Candidate review workspace that retrieves, revisits, and dismisses Candidates while preserving prior menu context. CMP1 now implements explicit comparison selection and a bounded difference-oriented projection for two or three Candidates without introducing Decision or transaction state.

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
- one bounded experimental slice at a time
- no backend
- no premature monorepo
- no generic plugin system
- no separate design-system package
- no abstraction justified only by hypothetical future scale
- failed interaction experiments should be removed or isolated rather than accumulated

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
- [`docs/interaction-model.md`](docs/interaction-model.md) — menu map, Candidate workspace, comparison, table state, and reversibility
- [`docs/relational-menu-research.md`](docs/relational-menu-research.md) — failed menu-reading hypotheses and relational prototype evidence
- [`docs/prototype-b-anchor-plan.md`](docs/prototype-b-anchor-plan.md) — Prototype B implementation, task matrix, reverse review, and disposition
- [`docs/prototype-c-anchor-axis-plan.md`](docs/prototype-c-anchor-axis-plan.md) — Prototype C implementation, evidence, accepted limitations, and final current-scope disposition
- [`docs/candidate-marks-plan.md`](docs/candidate-marks-plan.md) — CND1 implementation, final re-review corrections, narrow-screen evidence, and accepted disposition
- [`docs/candidate-workspace-plan.md`](docs/candidate-workspace-plan.md) — CND2 implementation, final re-review corrections, evidence boundary, and accepted disposition
- [`docs/candidate-comparison-plan.md`](docs/candidate-comparison-plan.md) — CMP1 implementation, bounded projection, reverse-review corrections, evidence boundary, and current review status
- [`docs/merchant-data-strategy.md`](docs/merchant-data-strategy.md) — progressive metadata, category defaults, confidence, governance, and graceful degradation
- [`docs/demo-scope.md`](docs/demo-scope.md) — reference restaurant, primary flow, exclusions, and build sequence
- [`docs/evaluation-plan.md`](docs/evaluation-plan.md) — formative tasks, observations, local events, and falsification signals

## Current status

The foundation, domain schema, reference dataset, and formative evaluation protocol are complete.

The customer decision spine is active on Draft PR #4:

```text
[passed] M1 compressed overview + shared ledger
→ [rejected] M2 modal Product detail
→ [rejected, removed] C1 fixed Product focus rail
→ [useful but insufficient] Prototype A — Axis-only score
→ [useful but insufficient] Prototype B — Anchor-only relation
→ [passed for current scope] Prototype C — Anchor + explicit shared axis
→ [passed for current scope] CND1 — Attached Candidate marks
→ [passed for current scope] CND2 — Candidate review workspace
→ [implemented, awaiting review] CMP1 — Bounded Candidate comparison
→ [blocked] Decision / Configuration / Current order
```

Prototype C preserves one Anchor, exact price deltas, and one explicit category-wide `份量` or `準備` axis. Formal projection tests, state tests, designer reverse review, focus re-review, narrow-screen proxies, and CI pass. No unfamiliar-participant evidence or measured usability claim is made.

CND1 adds identity-only Candidate membership beside reading state. Available Product rows expose persistent `考慮` toggle buttons whose membership is communicated through `aria-pressed`; sold-out rows remain visible but cannot be newly marked. Candidate membership survives category, overview, all-expanded, Anchor, and semantic-axis transitions while preserving canonical order and row geometry.

CND2 adds one derived, grouped Candidate review `main` surface over canonical Category and Product references. It provides a single menu entry, ordinary Back restoration, canonical Product location, explicit Candidate removal, deterministic focus recovery, and an in-place empty state. It adds no ranking, quantity, Configuration, total, Current order, or copied Product data.

CMP1 adds identity-only comparison selection beside Candidate state and a third sibling `main` surface. Every compared Product is explicitly selected from current Candidates, capped at three, and shown in canonical order. The mobile-first projection uses vertical dimension blocks for exact price, portion, meal role, preparation, shareability, traits, and required-customization presence while preserving missing, source, and confidence states.

CMP1's narrow reverse review corrected surface-transition bypasses, stale evidence after Candidate changes, reduced-Candidate guidance, invalid-toggle side effects, duplicate semantic labels, persistent limit announcements, an unused projection import, and nested main landmarks. Typecheck, domain and app-state tests, structure and focus/scroll contracts, CSS-derived 320px/390px geometry checks, and static build pass.

CMP1 is implemented and awaiting explicit product-owner disposition. The CSS-derived geometry contract is not complete runtime-browser or real-device evidence. No unfamiliar-participant comprehension, memory reduction, decision improvement, or conventional-interface superiority is claimed.

Decision, Configuration, Current order, quantity, modifiers, totals, transaction state, recommendation, and ranking remain blocked.

See [`docs/workstreams.md`](docs/workstreams.md), [`docs/candidate-workspace-plan.md`](docs/candidate-workspace-plan.md), and [`docs/candidate-comparison-plan.md`](docs/candidate-comparison-plan.md) for the active sequence and evidence.
