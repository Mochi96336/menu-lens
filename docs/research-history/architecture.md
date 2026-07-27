# Research prototype architecture

This document defines how Menu Lens can keep adding exploratory prototypes without turning the repository into a chronological pile.

## Sources of truth

| Concern | Canonical source | Must not be duplicated in |
|---|---|---|
| Product invariants and domain boundaries | `docs/product-contract.md` | prototype notes |
| Active work and sequencing | `docs/workstreams.md` | root README version lists |
| Prototype identity, family, parent, status, path, and assets | `research-history/prototype-registry.js` | validator arrays or handoff prompts |
| Original commit provenance | `research-history/originals/manifest.json` | prototype registry commit fields |
| Direct product-owner reactions | `docs/research-history/product-direction-review.md` | participant-study results |
| Mechanism narrative and unresolved questions | `docs/research-history/spatial-exploration.md` | registry status labels |

The archive homepage is a presentation of the registry. `scripts/validate-research-history.mjs` reads the same registry and fails when a registered path or asset is missing.

## Repository layers

```text
src/                         current product implementation
data/                        canonical product data
docs/                        product contract, coordination, and research interpretation
research-history/
  prototype-registry.js      canonical prototype catalog
  originals/                 immutable builds pinned to commits
  phases/<id>-<slug>/        one research phase or related variant family
  *.css / *-renderer.js      shared research-only assets
scripts/                     validation, build, and local serving
dist/                        generated output; never edited directly
```

Existing prototype URLs remain stable. Shared research assets stay at the archive root until at least two consumers justify a subdirectory move; avoiding speculative folder depth is more important than making the tree look symmetrical.

## Prototype families

A family describes the stable spatial or interaction substrate. A child prototype should change one main variable relative to its parent.

- `document`: complete vertical content and density refinements
- `relational`: Anchor, Candidate, comparison, or category-scale projections
- `horizontal`: category columns, ribbons, and moving horizontal lenses
- `matrix-paper`: fixed matrices, paper fields, and elastic boundaries
- `landscape`: 18-derived weighted 3 × 2 sheets
- `depth`: 18-derived layered surfaces that test depth as organization

If a proposed prototype changes both its substrate and its main interaction, it should be split into two prototypes or documented as a new family.

## Status vocabulary

Statuses describe what the project should do with a node; they do not claim empirical truth.

| Status | Meaning |
|---|---|
| `accepted-substrate` | safe foundation for later work |
| `current-substrate` | current comparison base for a family |
| `active-variant` | being refined or reviewed now |
| `preserved` | executable evidence; no active implementation work |
| `reviewed-stop` | reviewed and intentionally not extended |
| `unresolved-revisit` | later revisit without disposition |
| `baseline-recorded` | reference pattern that may not be executable |
| `rejected-*` / `product-invalid` | retained historical evidence, not a default product path |

Changing a status requires a reason in the product-direction review or spatial-exploration notes. It does not require deleting the prototype.

## Adding a prototype

1. Choose one parent and state the single main variable being changed.
2. Add one entry to `research-history/prototype-registry.js`.
3. Create the page at its registered path only if the entry is executable. Closely related child variants may share a phase directory.
4. Reuse the shared 30-product fixture unless the research question explicitly concerns data variation.
5. Register every stylesheet, renderer, and controller in the entry's `assets` object.
6. Add a validation profile only when the prototype belongs to an existing structural contract.
7. Record mechanism details in `spatial-exploration.md`; record direct review separately in `product-direction-review.md`.
8. Run `npm test` and `npm run build`.

Do not add the version to the root README or expand the workstream into another numbered ledger. Those documents point to the registry instead.

## Completion boundary

A prototype can be called playable only when:

- all registered files and asset references validate;
- all six categories and 30 products remain present when fixture parity applies;
- its initial, focused, detail, reset, narrow-screen, and reduced-motion states have been inspected;
- the prototype page states what changed from its parent and what remains uncertain;
- direct review has a traceable source and is not presented as participant evidence.

Passing the archive validator alone proves structural integrity, not UI quality.
