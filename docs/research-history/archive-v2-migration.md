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
        ├──────────────────────────┐
        ↓                          ↓
catalog/index.mjs          catalog/extensions.mjs
        └──────────────┬───────────┘
                       ↓
             archive catalog schema v2
                    ├─ browser index renderer
                    └─ Node validators
```

`research-history/catalog/extensions.mjs` is the canonical intake surface for new schema-v2 objects. A family intake PR may import smaller family modules from that file, but it must not introduce a second extension list in the browser or validator.

The legacy research validator still contains important prototype-specific contracts. During migration it runs through `scripts/archive/run-legacy-research-validator.mjs`, which supplies its former literal-link expectations temporarily and restores the real catalog-rendered index immediately afterward.

This bridge is transitional. Family intake PRs should add structured v2 metadata and validators without restoring hand-written homepage cards.

## Published path contract

Catalog paths are relative to `research-history/`, because that directory becomes the root of the GitHub Pages artifact.

- `entrypoint` points to an executable page such as `phases/22a-row-only/index.html`.
- `reviewDocument` points to a published record inside `research-history/`; it must not point to repository-only `docs/` content outside the Pages artifact.
- `evidencePath` points to a published file or directory inside `research-history/`.
- absolute paths, backslashes, and `.` or `..` path segments are rejected.

Repository coordination documents may remain under `docs/research-history/`, but a catalog card can link only to material included in the published archive.

## Known publication boundary

The catalog landing page is rendered by a JavaScript module. A `<noscript>` notice is provided, and all existing prototype URLs remain stable, but the complete object list is not currently pre-rendered into static HTML. If crawlable or no-JavaScript catalog navigation becomes a requirement, add a build-time catalog renderer rather than restoring a hand-maintained list.

## Intake rules after this PR

1. Preserve source PR and commit provenance.
2. Add one catalog object for each independently reviewable research object.
3. Add new schema-v2 objects through `catalog/extensions.mjs` or modules imported by it.
4. Classify studies and corrections separately from prototypes.
5. Preserve negative evidence as searchable archive material.
6. Do not add literal object links or comparison rows to `research-history/index.html`.
7. Keep existing public URLs stable during family intake.
8. Replace the legacy registry only after all current branches have a v2 catalog destination.
