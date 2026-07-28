# Research archive v2 migration

## Purpose

The archive accumulated parallel prototype, correction, negative-evidence, and study branches. The original registry can identify a prototype and its executable assets, but its single `status` field now carries several unrelated meanings. The archive index also repeated catalog information in hand-written cards and tables, while the legacy validator required every executable link to appear as literal HTML.

Archive v2 first changes the control layer. It does not redesign, relocate, or reinterpret an existing prototype.

## Current migration boundary

This foundation keeps all of the following unchanged:

- every existing prototype entrypoint;
- every historical snapshot and pinned commit;
- the shared six-category, 30-product fixture;
- prototype-specific renderers, controllers, styles, and evidence;
- the legacy registry as the temporary identity and path source.

It introduces a v2 catalog adapter with separate fields for:

- `objectType`;
- `disposition`;
- `evidenceState`;
- `researchParentId`;
- `dependsOn`;
- `evidenceFor`;
- `mechanismsFrom`.

## Transitional architecture

```text
prototype-registry.js (schema v1, temporary source)
        ↓
research-history/catalog/index.mjs
        ↓
archive catalog schema v2
        ├─ catalog-rendered archive index
        └─ generic catalog and entrypoint validation
```

The legacy research validator still contains important prototype-specific contracts. During migration it runs through `scripts/archive/run-legacy-research-validator.mjs`, which supplies its former literal-link expectations temporarily and restores the real catalog-rendered index immediately afterward.

This bridge is transitional. Family intake PRs should add structured v2 metadata and validators without restoring hand-written homepage cards.

## Intake rules after this PR

1. Preserve source PR and commit provenance.
2. Add one catalog object for each independently reviewable research object.
3. Classify studies and corrections separately from prototypes.
4. Preserve negative evidence as searchable archive material.
5. Do not add literal object links or comparison rows to `research-history/index.html`.
6. Keep existing public URLs stable during family intake.
7. Replace the legacy registry only after all current branches have a v2 catalog destination.
