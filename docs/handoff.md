# Cross-conversation handoff

Use this document when starting or closing any Menu Lens workstream in a separate conversation.

The repository, not chat history, is the shared memory.

## Required reading order

Every new workstream should read:

1. [`README.md`](../README.md)
2. [`product-contract.md`](product-contract.md)
3. [`glossary.md`](glossary.md)
4. [`workstreams.md`](workstreams.md)
5. the document directly related to the assigned scope

Additional references:

- [`problem-framing.md`](problem-framing.md) for the original problem and hypotheses
- [`interaction-model.md`](interaction-model.md) for state transitions and lens behavior
- [`merchant-data-strategy.md`](merchant-data-strategy.md) for metadata and authoring questions
- [`demo-scope.md`](demo-scope.md) for the current demo boundary
- [`evaluation-plan.md`](evaluation-plan.md) for formative tasks and falsification signals

## Standard opening prompt

Copy and adapt this block when opening a new conversation:

```text
Repository: Mochi96336/menu-lens

Before making changes, read:
- README.md
- docs/product-contract.md
- docs/glossary.md
- docs/workstreams.md
- [documents directly relevant to this workstream]

Workstream:
[one bounded outcome]

Allowed scope:
[files or concepts that may change]

Out of scope:
[nearby work that must not be pulled in]

Success criteria:
[observable outputs and checks]

Coordination rules:
- preserve the product contract
- use glossary terms consistently
- do not merge candidates with order items
- do not create multiple menu sources of truth
- prefer the lowest-entropy implementation that satisfies current needs
- record cross-cutting questions instead of silently expanding scope
- do not start deferred workstreams

Delivery:
- summarize files changed
- report checks run
- list product-contract implications
- list unresolved cross-workstream questions
```

## Scope definition checklist

A workstream is ready to start when its opening message identifies:

- one outcome
- the repository and base branch
- files or modules it may modify
- adjacent work explicitly excluded
- required checks
- whether it may commit, push, or open a pull request
- the information that must return to the core conversation

Avoid assignments such as:

- "build the frontend"
- "design all pages"
- "set up the architecture"
- "make the app production-ready"

Prefer assignments such as:

- "define and validate the canonical product dataset"
- "implement full-menu browsing through candidate comparison"
- "define local events for the decision spine"

## Product-contract escalation

Stop and return to the core conversation when work discovers a need to change:

- the distinction between candidate and order item
- when configuration begins
- the canonical product source
- complete-menu accessibility
- state preservation across views
- the first research questions
- current deferred or out-of-scope boundaries

Do not hide a contract change inside implementation convenience.

## Low-entropy review questions

Before adding a dependency, abstraction, layer, or persistent state, ask:

1. Which current requirement needs it?
2. Which existing duplication or invariant does it resolve?
3. Can it be removed without changing product behavior?
4. Does it make the primary flow easier to read and test?
5. Is it serving current evidence or imagined production scale?

If the answer is hypothetical future flexibility, defer it.

## Standard closing report

Every workstream should end with this structure:

```text
Result
- what is now possible

Changed
- files and major behavior

Validated
- tests, type checks, lint, manual flows, or data checks

Contract impact
- none, or the exact product-contract section affected

Cross-workstream findings
- questions or evidence that another workstream needs

Deferred
- nearby work deliberately not started
```

## Core-conversation responsibility

The core conversation should periodically:

- reconcile cross-workstream findings
- update `product-contract.md` before changing shared meaning
- update `workstreams.md` when sequencing changes
- remove stale assumptions from older documents
- decide whether a discovery needs a dedicated decision record

Separate decision records should be created only when alternatives and consequences are substantial enough that a single contract update would lose important rationale.