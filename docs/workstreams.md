# Workstreams

This file is the current coordination view for Menu Lens.

It exists to prevent parallel conversations from redefining the product, duplicating work, or expanding the demo before the current evidence gate is complete.

## Coordination rules

- The core conversation owns product-contract changes and cross-workstream conflict resolution.
- Each implementation conversation should own one bounded outcome, not a collection of screens or technologies.
- Workstreams should modify only the files needed for their outcome.
- Cross-cutting discoveries should be recorded and returned to the core conversation rather than silently expanding scope.
- Direct review, browser verification, and participant evidence must remain distinct evidence states.
- Conventional-interface comparison is parked until the Menu Lens interaction is coherent enough to evaluate on its own.
- Prefer fewer moving parts, fewer dependencies, and fewer abstractions while the product model is still being tested.

## Current sequence

```text
[complete] foundation memory
→ [complete] domain schema and reference dataset
→ [complete] formative evaluation protocol
→ [complete] spatial interaction exploration
→ [complete] Archive v2 intake and closure synthesis
→ [active] evidence closure
    → direct review: 22D–22G / 24A–24C
    → participant study: 12A-S1
    → conditional participant study: 25P-S1
    → product-direction synthesis
→ [paused] customer menu substrate implementation in src/
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
| Spatial interaction exploration | Complete | document, horizontal, matrix, landscape, multi-scale, and depth hypotheses | complete-menu substrate and research archive | executable research objects and mechanism notes |
| Archive v2 curation | Complete | schema-v2 intake, provenance, evidence boundaries, records, validators, closure synthesis | spatial exploration | one canonical, validated research archive |
| Evidence closure | In progress | remaining direct review, prepared participant studies, product-direction synthesis | Archive v2 | explicit dispositions and a bounded next product direction |
| Customer menu substrate | Paused | clean product reading surface rebuilt in `src/` | evidence closure and product-direction synthesis | one selected complete-menu reading substrate |
| Customer decision spine | Paused | full menu → inline detail → candidates → comparison → decision → configuration → current order | customer menu substrate | one complete interactive flow |
| Continuity and table state | Deferred | scroll restoration, preserved candidates, submitted rounds, coarse table composition | customer decision spine | continuity behavior over the same state model |
| Alternative lenses | Deferred | thin quick, shared-table, and featured views | stable decision spine | views over the same canonical menu |
| Merchant authoring | Deferred | category defaults, exceptions, confidence, incomplete-data preview | proven useful semantic fields | small authoring test, not production CMS |
| Conventional baseline | Parked | credible conventional ordering flow using the same data | coherent Menu Lens demo and explicit study need | optional comparison condition |
| Production integration | Out of scope | payment, POS, KDS, inventory, auth, deployment operations | none in current demo | none |

## Completed foundation work

A new conversation can determine, without relying on chat history:

- what Menu Lens is investigating;
- which states must remain distinct;
- which terminology to use;
- which workstream is currently allowed to proceed;
- which work is deferred or out of scope;
- how to report changes and unresolved questions.

The authoritative entry points are:

- `README.md`
- `docs/product-contract.md`
- `docs/glossary.md`
- `docs/workstreams.md`
- `docs/handoff.md`

The domain and reference-data workstream provides:

- canonical TypeScript menu and order-state types;
- runtime validation for the local dataset boundary;
- one fictional restaurant with six categories and 30 Products;
- required and optional modifier examples;
- personal and shared portion examples;
- sold-out Products that remain in the canonical collection;
- intentionally incomplete semantic metadata;
- metadata source and confidence representation;
- focused compile-time and runtime invariant tests.

The formative-evaluation workstream provides:

- moderated task scripts for overview, consideration, comparison, and Configuration;
- neutral moderator and think-aloud guidance;
- observable success, failure, and falsification signals;
- a bounded local event vocabulary;
- observation and session-summary templates;
- explicit criteria for redesigning, simplifying, or removing a feature.

The first customer-facing slice provides:

- one static local client using the validated canonical menu;
- restaurant overview and complete-menu trust cues;
- all six categories and all 30 Products in one stable document;
- category navigation that moves without filtering or replacing Products;
- inline Product detail resolved by stable `ProductId`;
- sold-out and incomplete-metadata behavior;
- keyboard open, Escape close, and focus return;
- reduced-motion-aware category scrolling;
- focused menu-reading tests and a static build path.

## Completed workstream: spatial interaction exploration and Archive v2

Spatial exploration intentionally preserved multiple research families instead of selecting a product winner while mechanisms were still being formed.

Archive v2 now provides:

- one catalog schema for historical nodes, prototypes, corrections, studies, and syntheses;
- separate object type, disposition, and evidence-state fields;
- stable lineage and source provenance;
- executable and review-document paths generated from the same catalog;
- original fixed-commit snapshots kept separate from reconstructions;
- central validation for catalog, entrypoints, homepage rendering, family contracts, and legacy compatibility;
- completed intake for document, horizontal, matrix-paper, Landscape Core, Landscape Ablations, Vertical Landscape, Multi-scale, and Depth continuations;
- prepared `12A-S1` and `25P-S1` participant-study infrastructure;
- an Archive v2 closure synthesis that does not select a product direction.

The following boundaries remain in force:

- browser success is not participant evidence;
- `keep-controlled` is not product adoption;
- `provisional` objects require the named next gate;
- `negative-evidence` objects remain visible rather than being erased;
- no source Draft branch should be merged directly into a future product implementation;
- Candidate, comparison, Decision, Configuration, and Current order were not part of Archive v2.

## Active workstream: evidence closure

### Goal

Reduce the validated archive into explicit research dispositions before returning to product implementation.

This phase is not another prototype-expansion round. It closes unanswered evidence gates using existing objects and prepared study tools.

### Current queue

```text
Direct review
├─ 22D Geometry-only Focus
├─ 22E Typography-only Focus
├─ 22F Padding-only Focus
├─ 22G Collapse-only Focus
├─ 24A Equal-column Vertical Type
├─ 24B Horizontal Price Labels
└─ 24C Fixed-type Reading Scale

Participant evidence
├─ 12A-S1 Blinded Reader Comparison — first
└─ 25P-S1 Unfamiliar-reader Study — only if 25P remains worth testing

Then
└─ Product-direction synthesis
```

### Direct-review contract

Review the seven pending objects at the agreed mobile and desktop widths. Each object must receive one bounded disposition:

- `keep-controlled` — the isolated mechanism is useful enough to preserve, without product adoption;
- `study-worthy` — the mechanism presents a specific participant question worth testing;
- `negative-evidence` — the isolated variable does not provide the intended gain;
- `rejected` — the interaction cost or identity loss is too high to continue.

The review should record:

- overview comprehension;
- focused reading gain;
- neighbouring-category recognizability;
- Product-name and price association;
- return position and reversibility;
- spatial movement cost;
- any observed overflow, clipping, or misleading state.

### Participant-study order

Run `12A-S1` first because it tests a central complete-menu question with a bounded parent/child comparison: whether scale-specific semantic information improves comprehension over unreadable miniature Product names.

Execute `25P-S1` only if direct review and synthesis preparation still justify 25P as a secondary lens. `25PA` remains blocked unless the exact six-session protocol reaches its eligibility gate. Do not rescue a failure with a wizard, filter, ranking, recommendation, or automatic projection selection.

### Constraints

- no new prototype family;
- no combined “best-of” child;
- no product code in `src/`;
- no silent evidence-state promotion;
- no treating direct review as participant evidence;
- no reopening Candidate or transaction mechanics;
- no changing a study protocol after sessions begin;
- no deleting negative or stopped evidence from the archive.

### Completion gate

Evidence closure is complete when:

1. `22D`–`22G` and `24A`–`24C` have recorded direct-review dispositions;
2. `12A-S1` has a participant result or an explicit documented cancellation boundary;
3. `25P-S1` has either been executed or intentionally stopped with rationale;
4. the product-direction synthesis classifies the remaining material as substrate, controlled mechanism, secondary lens, study blocked, archive only, or negative evidence;
5. no open research Draft remains mergeable as accidental product code.

## Paused workstream: customer menu substrate

After evidence closure, create a clean product PR from the latest `main`. Do not merge research branches into `src/`.

The first product substrate should contain only:

```text
one complete menu
→ comprehensible overview
→ explicit reading entry
→ reversible inline detail
```

It should select one base reading structure and only the controlled mechanisms explicitly authorized by the product-direction synthesis.

It must not yet add Candidate, comparison, Configuration, Current order, alternative lenses, persistence, routing, backend, or production integrations.

## Paused implementation slice: Candidate and comparison

This slice is not authorized until the customer menu substrate is coherent and the Candidate surface has been reviewed against the rejected Candidate workspace and bounded-comparison evidence.

### Goal

Extend the selected complete-menu client from reading into reversible consideration:

```text
Product
→ Candidate
→ Candidate workspace
→ comparison
```

### Required behavior

- add an available Product as a Candidate using stable `ProductId`;
- remove a Candidate without affecting the canonical menu;
- keep Candidate separate from Current order and purchase commitment;
- do not request quantity or modifiers when adding a Candidate;
- keep browsing context while opening and closing the Candidate workspace;
- compare a small set of genuine Candidate differences using only supported metadata;
- omit unsupported comparison fields instead of guessing;
- return from comparison without clearing Candidates or changing the complete menu;
- add the bounded local events already defined for Candidate and comparison observation;
- add focused state and interaction tests.

### Explicit exclusions

- no `DraftOrderItem` creation;
- no Configuration form;
- no quantity controls;
- no modifier selection;
- no order total;
- no Current order;
- no submitted rounds;
- no persistence, URL state, router, backend, or remote analytics;
- no alternative lenses.

### Completion gate

The next slice is complete when a tester can:

1. preserve two or more possible Products as Candidates;
2. continue browsing the same complete menu;
3. open a clearly separate Candidate workspace;
4. compare supported differences without seeing invented metadata;
5. remove or retain Candidates reversibly;
6. return to the original browsing context;
7. avoid interpreting Candidate as a placed order.

It does not need Decision, Configuration, Current order, continuity persistence, alternative lenses, merchant tooling, production integration, or a baseline comparison before completion.
