# 26A Transition Landmarks — continuation review

## Scope

```text
Repository: a20030824/menu-lens
Base: main
Base commit: 54bde49c6c1df800ba2e8d1b014c2a2b9eef9177
Branch: agent/menu-lens-26a-transition-landmarks
Parent: 26 Parallax Menu Volume
Child: 26A Transition Landmarks
```

26A changes one variable only: intermediate orientations expose category landmark information for the category being left and the next category becoming dominant.

## Continuation finding

The previous delivery report could not be verified. The remote branch still pointed to the base commit, contained no implementation diff, and had no Draft PR. The continuation therefore began as **BLOCKED**, not as a review of a completed child.

The blocker was resolved without changing the parent or shared interaction architecture by adding the missing child-specific implementation, validator, comparison evidence, registry entry, and a registry-aware validation adapter on the existing branch. The archive already renders executable entries dynamically from the registry; the adapter lets the existing static-link assertion validate that generated catalog without adding hidden duplicate links to the page.

## Final result: KEEP

The isolated landmark variable improves the specific transition question while preserving the identity of 26.

At representative 25%, 50%, and 75% positions between category anchors, 26A exposes at most two non-interactive summaries:

- the category being left;
- the next category becoming dominant;
- category title;
- fixture-backed Product count;
- a qualitative extent cue derived from the same angular alignment score already used by parent 26.

At an endpoint the summaries disappear. They do not become destinations, duplicate Products, or introduce a second navigation model.

## Parent comparison

The comparison matrix covers these representative adjacent anchor pairs:

```text
01 → 02
02 → 03
03 → 06
06 → 05
05 → 04
04 → 01
```

Each pair is sampled at:

```text
25% / 50% / 75%
×
spread .02 / .58 / 1
```

This produces 54 adjacent-pair geometry states. A separate diagonal path runs `02 → 01 → 05` through the centre; it correctly resolves to the existing 01 endpoint at the midpoint rather than inventing a seventh destination. For every state, parent and child retain identical:

- volume rotation;
- six field rotations;
- 30 Product transforms;
- Product opacity equation;
- readable Product threshold;
- category anchors and endpoint coordinates.

Review assets:

- `research-history/review-assets/26a/parent-child-320.svg`
- `research-history/review-assets/26a/parent-child-390.svg`
- `research-history/review-assets/26a/parent-child-desktop.svg`
- `research-history/review-assets/26a/state-matrix.csv`
- `research-history/review-assets/26a/diagonal-path.csv`
- `research-history/review-assets/26a/runtime-smoke.json`

The SVGs are deterministic geometry captures generated from the parent and child equations. They are not presented as deployed-page screenshots. Chromium runtime smoke checks were run separately with a parent-compatible bounded controller and the exact child DOM/add-on because this execution environment blocks browser navigation to localhost, file URLs, and GitHub Pages. The production parent controller is separately syntax-checked and contract-checked by the repository validators.

## What improved

Parent 26 already identifies the nearest category and provides a compass, but an intermediate orientation does not explicitly distinguish the category being left from the category becoming dominant. 26A makes that relationship visible before snap:

```text
origin remains spatially present
→ target category is predictable
→ both are described as parts of one continuous volume
```

The cue remains useful at all three tested spread values because spread changes Product depth amplitude, not orientation identity.

## What remains problematic

- Direct reader evidence is still required to show that people interpret the two summaries as spatial continuity rather than status labels.
- The qualitative extent wording describes angular alignment, not measured projected screen area. It must not be treated as a quantitative coverage claim.
- Low-end device performance has not been measured.
- Parent 26 detail does not move focus into the detail panel or add an Escape close path. 26A preserves that parent behavior rather than mixing a separate accessibility revision into this mechanism variant.

These limitations do not require tutorial, full ghosts, auto-flat, more snap endpoints, camera tracking, or additional animation.

## Prototype identity preserved

26A remains 26 because it retains:

- one continuous typographic volume;
- six original category orientations;
- stable Product positions;
- the same camera and orientation model;
- continuous pointer rotation;
- continuous two-pointer depth control;
- the same snap threshold and endpoints;
- the same readable Product and detail behavior;
- 6 categories and 30 unique Products.

The landmarks are an explanatory layer over the existing orientation scores. They do not alter geometry, navigation, Product membership, or information shown inside a category projection.

## Accessibility and interaction checks

- Landmark cards use no `button`, link, click handler, or tab stop.
- Visual cards remain `aria-hidden`; a single polite live-region sentence announces only when the origin/target pair changes.
- Endpoint return clears the live-region sentence.
- Reduced motion removes the landmark transition.
- Keyboard orientation and depth controls are unchanged.
- Detail close and Home reset restore the same child orientation state as parent 26.
- 320px, 390px, and desktop checks show no horizontal document overflow.

## Files changed

Child-specific:

- `research-history/phases/26a-transition-landmarks/index.html`
- `research-history/parallax-transition-landmarks.css`
- `research-history/parallax-transition-landmarks.js`
- `scripts/validate-26a-transition-landmarks.mjs`
- `research-history/review-assets/26a/*`
- `docs/research-history/26a-transition-landmarks-review.md`

Shared integration only:

- `research-history/prototype-registry.js`
- `scripts/validate-research-history-registry.mjs`
- `package.json`

Not changed:

- parent 26 HTML, CSS, or JavaScript;
- shared fixture;
- category anchors;
- canonical Product identity, membership, or order;
- any sibling prototype;
- product application source.

## Decision

Keep 26A as a controlled research child and keep its PR Open + Draft. Do not add another mechanism to this PR.

## Next proposed step — not started

`26C Flat Recovery` may be proposed in a separate branch only after 26A review. Its single question should be whether another continuous control can reach a readable plane without changing 26A's landmark grammar, category anchors, camera model, or endpoint set.

No 26C code, branch, or PR is included here.
