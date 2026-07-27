# Workstreams

This file is the current coordination view for Menu Lens.

It exists to prevent parallel conversations from redefining the product, duplicating work, or expanding the demo before the decision spine is coherent.

## Coordination rules

- The core conversation owns product-contract changes and cross-workstream conflict resolution.
- Each implementation conversation should own one bounded outcome, not a collection of screens or technologies.
- Workstreams should modify only the files needed for their outcome.
- Cross-cutting discoveries should be recorded and returned to the core conversation rather than silently expanding scope.
- Conventional-interface comparison is parked until the Menu Lens interaction is coherent enough to evaluate on its own.
- Prefer fewer moving parts, fewer dependencies, and fewer abstractions while the product model is still being tested.

## Current sequence

```text
[complete] foundation memory
→ [complete] domain schema and reference dataset
→ [complete] formative evaluation protocol
→ [active] spatial interaction exploration
    [registry] document / relational / horizontal / matrix-paper / landscape / depth families
    → [current substrate] 18 Landscape Paper
    → [active variants] 22 Weighted Pinch / 23 Collapsible / 24 Vertical / 25 Menu Depth
    → [active] detail-level visual and interaction review
→ [paused] customer decision spine
    Candidate surface review
    → Decision + Configuration + Current order
→ continuity and table state
→ thin alternative lenses
→ merchant-authoring test
→ decide whether a conventional baseline is useful
```

## Workstream status

| Workstream | Status | Scope | Depends on | Primary output |
|---|---|---|---|---|
| Foundation memory | Complete | product contract, glossary, workstream boundaries, handoff protocol | existing design core | stable cross-conversation reference |
| Domain and reference data | Complete | types, validation, 30-product fictional menu, incomplete metadata cases | product contract | local typed dataset and tests |
| Formative evaluation | Complete | task scripts, observation notes, lightweight local events, falsification signals | product contract | protocol that shapes implementation |
| Spatial interaction exploration | In progress | horizontal structure, two-dimensional overview, category focus, location continuity | complete-menu substrate and research archive | playable spatial hypotheses and mechanism notes |
| Customer decision spine | Paused | full menu → inline detail → candidates → comparison → decision → configuration → current order | spatial interaction exploration | one complete interactive flow |
| Continuity and table state | Deferred | scroll restoration, preserved candidates, submitted rounds, coarse table composition | customer decision spine | continuity behavior over the same state model |
| Alternative lenses | Deferred | thin quick, shared-table, and featured views | stable decision spine | views over the same canonical menu |
| Merchant authoring | Deferred | category defaults, exceptions, confidence, incomplete-data preview | proven useful semantic fields | small authoring test, not production CMS |
| Conventional baseline | Parked | credible conventional ordering flow using the same data | coherent Menu Lens demo and explicit study need | optional comparison condition |
| Production integration | Out of scope | payment, POS, KDS, inventory, auth, deployment operations | none in current demo | none |

## Completed foundation work

A new conversation can determine, without relying on chat history:

- what Menu Lens is investigating
- which states must remain distinct
- which terminology to use
- which workstream is currently allowed to proceed
- which work is deferred or out of scope
- how to report changes and unresolved questions

The authoritative entry points are:

- `docs/product-contract.md`
- `docs/glossary.md`
- `docs/workstreams.md`
- `docs/handoff.md`

The domain and reference-data workstream now provides:

- canonical TypeScript menu and order-state types
- runtime validation for the local dataset boundary
- one fictional restaurant with 30 products
- required and optional modifier examples
- personal and shared portion examples
- sold-out products that remain in the canonical collection
- intentionally incomplete semantic metadata
- metadata source and confidence representation
- focused compile-time and runtime invariant tests

The formative-evaluation workstream now provides:

- four moderated task scripts for overview, consideration, comparison, and Configuration
- neutral moderator and think-aloud guidance
- observable success, failure, and falsification signals
- a bounded local event vocabulary
- observation and session-summary templates
- explicit criteria for redesigning, simplifying, or removing a feature

The first customer-facing slice now provides:

- one static local client using the validated canonical menu
- restaurant overview and complete-menu trust cues
- all six categories and all 30 products in one stable document
- category navigation that moves without filtering or replacing products
- inline product detail resolved by stable `ProductId`
- sold-out and incomplete-metadata behavior
- keyboard open, Escape close, and focus return
- reduced-motion-aware category scrolling
- focused menu-reading tests and a static build path

## Active workstream: spatial interaction exploration

### Goal

Explore spatial models that are materially different from a vertical document or familiar category pager. The workstream may preserve multiple hypotheses; it does not need to select a winner before the mechanisms are playable.

```text
prototype-registry.js
├─ document
├─ relational
├─ horizontal
├─ matrix-paper
├─ landscape
   ├─ 18 current substrate
   ├─ 19–21 reviewed-stop evidence
   └─ 22–24 active variants
└─ depth
   ├─ 25 family hub
   ├─ 25P active real-axis projection
   ├─ Menu Sections rejected semantic-depth evidence
   └─ 25B retained first-pass falsification
```

### Progress

The registry and executable archive retain 25B as a first-pass falsification study. Its shared ordinal slices remain semantically unsupported and are not a recommended direction. Menu Sections preserved the anchor from Z0 to Z+1, but the shorter overview surface forced a large boundary jump, so only the semantic-depth model stops before pinch. The active 25P prototype uses one real data model—price × portion × preparation—and rotates the same 30 nodes, bounding frame, and axes between three shallow three-dimensional views. It is a secondary decision lens, not a replacement for the complete menu.

### Required outputs

- a valid registry entry for every research node, with one family and at most one parent
- stable URLs for every executable historical phase
- registered asset references and structural validation
- complete six-category, 30-product fixture parity where the profile requires it
- direct review kept separate from participant evidence
- visual inspection of initial, focused, detail, reset, and narrow-screen states before a prototype is called playable

### Constraints

- no Candidate, comparison, Decision, Configuration, or Current order implementation during spatial exploration
- no pinch-to-zoom or freeform canvas in the first 08 prototype; this bounded 08 constraint does not apply to 22 or 24
- no claim that 07 represents every market product; it is a familiar baseline family, not a completed benchmark
- no forced disposition or participant-study requirement while interaction mechanisms are still being formed
- every executable hypothesis must render all six categories and 30 products from the shared fixture
- preserve `Product ≠ Candidate ≠ DraftOrderItem ≠ ConfiguredOrderItem ≠ SubmittedOrderRound` unless the product contract is explicitly revised

## Paused implementation slice: Candidate and comparison

This slice is not authorized to proceed until spatial exploration is intentionally closed and the Candidate surface has been reviewed against the rejected Candidate workspace and bounded-comparison evidence.

### Goal

Extend the existing complete-menu client from reading into reversible consideration:

```text
Product
→ Candidate
→ Candidate workspace
→ comparison
```

### Required behavior

- add an available Product as a Candidate using stable `ProductId`
- remove a Candidate without affecting the canonical menu
- keep Candidate separate from Current order and purchase commitment
- do not request quantity or modifiers when adding a Candidate
- keep browsing context while opening and closing the Candidate workspace
- compare a small set of genuine Candidate differences using only supported metadata
- omit unsupported comparison fields instead of guessing
- return from comparison without clearing Candidates or changing the complete menu
- add the bounded local events already defined for Candidate and comparison observation
- add focused state and interaction tests

### Explicit exclusions

- no `DraftOrderItem` creation
- no Configuration form
- no quantity controls
- no modifier selection
- no order total
- no Current order
- no submitted rounds
- no persistence, URL state, router, backend, or remote analytics
- no alternative lenses

### Completion gate

The next slice is complete when a tester can:

1. preserve two or more possible products as Candidates
2. continue browsing the same complete menu
3. open a clearly separate Candidate workspace
4. compare supported differences without seeing invented metadata
5. remove or retain Candidates reversibly
6. return to the original browsing context
7. avoid interpreting Candidate as a placed order

It does not need Decision, Configuration, Current order, continuity persistence, alternative lenses, merchant tooling, production integration, or a baseline comparison before completion.
