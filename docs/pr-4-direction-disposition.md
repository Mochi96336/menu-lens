# PR #4 product-direction disposition

## Document status

```text
branch  agent/menu-map-atlas
PR      #4 — Build menu reading workspace
status  [rejected as the active product direction]
```

This document records the product-owner disposition of the complete interaction direction explored on PR #4.

The implementation remains useful research evidence, but it must not be interpreted as the next customer-facing foundation and must not authorize Decision, Configuration, Current order, or later product work.

## Decision

The following combined direction does not pass as the active Menu Lens product direction:

```text
relational menu reading
→ Anchor selection
→ explicit semantic-axis selection
→ Candidate marking
→ Candidate review workspace
→ separate comparison selection
→ comparison surface
```

Prototype C, CND1, CND2, and CMP1 are therefore treated as one rejected interaction family rather than individually accepted foundations for continued implementation.

PR #4 should remain a research record and should not be merged into `main` as the customer UI baseline.

## Why the direction was rejected

### 1. It changed the problem

The original product problem was how a mobile menu could preserve the overview, density, spatial memory, and adjacent comparison of a good paper menu.

PR #4 gradually reframed that problem as the construction of an explicit decision workflow with increasingly formal states and transitions.

The implementation became good at distinguishing:

```text
Product
≠ Candidate
≠ comparison selection
≠ DraftOrderItem
≠ ConfiguredOrderItem
≠ SubmittedOrderRound
```

That distinction is valid in the domain model, but the UI required users to manage those distinctions directly before the distinctions had demonstrated customer value.

### 2. Comparison became a mode instead of a property of layout

A paper menu supports comparison because nearby products, names, prices, and descriptions are simultaneously visible and spatially aligned.

PR #4 instead required users to:

```text
mark Candidates
→ open a Candidate workspace
→ open a comparison surface
→ select comparison members again
→ inspect a separate projection
```

This added interaction and terminology where the desired value should primarily come from information architecture, alignment, proximity, density, and continuity.

### 3. Candidate became a default workflow without sufficient need

Candidate state can be useful for very large menus, long sessions, or group coordination. It was not demonstrated to be a necessary default step for ordinary menu reading.

The project should not require users to externalize every temporary possibility into application state merely because that state can be modeled cleanly.

### 4. Anchor and semantic-axis controls transferred layout work to the user

The Anchor and shared-axis experiments asked the user to specify how products should be compared before the interface revealed relationships.

The next direction should instead make the most important differences visible without setup. Optional controls may be reconsidered only after the default document already supports useful reading.

### 5. Implementation correctness did not establish product usefulness

PR #4 contains careful state boundaries, canonical identity handling, focus and scroll recovery, truthful missing-data treatment, accessibility contracts, and extensive tests.

Those checks establish that the implemented interaction behaves as designed. They do not establish that the interaction is worth the added controls, terminology, or surface transitions.

## What remains valuable

The following work remains reusable:

- canonical domain schema and stable Product identity;
- validated reference menu and progressive semantic metadata;
- explicit separation between browsing, configuration, and submitted order state;
- truthful missing, inferred, category-default, and merchant-confirmed evidence;
- stable category and Product ordering;
- focus, scroll, reduced-motion, and hidden-surface lessons;
- tests and documents describing failed or insufficient interaction hypotheses;
- the principle that product details must preserve browsing context.

The reusable value is mainly in the data model, evidence policy, continuity rules, and negative research findings—not in the PR #4 customer workflow.

## What must not continue from PR #4

Do not begin or extend:

- Anchor selection as a primary menu interaction;
- semantic-axis selection as a prerequisite for understanding products;
- Candidate marking as a mandatory or default decision step;
- a separate Candidate workspace as the main reading destination;
- separate comparison membership;
- a dedicated comparison surface;
- Decision, Configuration, or Current order on top of this interaction family;
- new abstractions whose only purpose is to support these rejected surfaces.

## Replacement direction

Return to the `main` complete-menu and inline-detail baseline and investigate Menu Lens as a **digital menu document**.

The next product question is:

> How can a mobile complete menu establish restaurant overview, support direct comparison among nearby dishes, reveal details in place, and preserve reading position without requiring a separate decision workflow?

The first replacement UI should prioritize:

1. zero-interaction restaurant and menu overview;
2. one stable complete-menu document;
3. category structure visible before deep scrolling;
4. dense, aligned Product rows rather than independent cards;
5. comparison through proximity and shared columns;
6. inline reversible detail;
7. order actions that remain secondary until explicit intent;
8. no Candidate, Anchor, semantic-axis, or comparison-mode requirement.

## Repository handling

- Keep PR #4 Open + Draft while its disposition and evidence are recorded.
- Do not mark it ready for review.
- Do not merge it.
- Do not add further product implementation to `agent/menu-map-atlas`.
- Begin the replacement direction from current `main` on a separate branch.
- Preserve PR #4 as a reviewable research artifact until the new direction is established, then close it without merging.

## Evidence boundary

This disposition does not prove a replacement UI will succeed. It states that the current interaction family imposes visible workflow cost without sufficient demonstrated value and is therefore not an acceptable foundation for continued implementation.
