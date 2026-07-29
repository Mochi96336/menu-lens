# 26C Flat Recovery — implementation review

## Scope

```text
Repository: a20030824/menu-lens
Latest main: 54bde49c6c1df800ba2e8d1b014c2a2b9eef9177
Stacked parent branch: agent/menu-lens-26a-transition-landmarks
Parent head: b89e4bc8e4b21b38f95a6848adbdaf18031318f1
Branch: agent/menu-lens-26c-flat-recovery
Parent: 26A Transition Landmarks
Child: 26C Flat Recovery
```

26C changes one main variable only: it adds a directly operable range control for the existing `state.spread` continuum.

## Research question

Parent 26 already supports continuous depth through a two-pointer pinch and `+`／`-` keyboard commands. The touch path, however, assumes a two-pointer gesture. 26C asks whether the same volume can recover a readable, near-flat presentation through a visible one-dimensional control without creating a flat mode, a new endpoint, or a second camera model.

## Unique variable

The child adds one range:

```text
min .02
max 1
step .01
initial .58
```

The range writes directly into the child controller's existing `state.spread` and calls the same `render()` path as pinch and keyboard depth changes. It does not overlay a cosmetic transform or maintain a second depth state.

## Parent behavior preserved

The 26C controller retains 26／26A contracts for:

- six category anchors and six orientation endpoints;
- all 30 Product positions and canonical identities;
- camera and orientation limits;
- one-pointer rotation;
- two-pointer logarithmic depth control;
- `+`／`-` keyboard depth control;
- Product readability threshold `.58`;
- snap threshold `18`;
- category tags;
- detail open／close;
- Home and reset behavior;
- 26A origin／target landmark grammar and live-region wording.

No sibling prototype or shared fixture is changed.

## Direct controller evidence

A bounded Chromium smoke harness executed the exact child DOM and controller with a six-category／30-Product fixture. The harness does not include the complete repository stylesheet and is not presented as a deployed-page screenshot.

Observed:

- initial range is `.58`;
- range `.02` changes the first Product depth from `-64.96px` to `-2.24px` while volume orientation remains identical;
- range `1` changes the same Product depth to `-112px`;
- intermediate keyboard orientation still exposes the unchanged 26A origin／target landmarks;
- Home restores orientation `0,0`, spread `.58`, and clears transition landmarks;
- detail opens and closes through the inherited path;
- reduced-motion emulation matches;
- 320px, 390px, and desktop bounded harnesses retain 30 Product elements without horizontal document overflow.

Machine-readable evidence:

- `research-history/review-assets/26c/runtime-smoke.json`
- `research-history/review-assets/26c/spread-matrix.csv`

## Parent／child comparison

The deterministic captures preserve the same category volume, orientation, and transition landmarks. The only visible addition is the depth range inside the existing readout.

- `research-history/review-assets/26c/parent-child-320.svg`
- `research-history/review-assets/26c/parent-child-390.svg`
- `research-history/review-assets/26c/parent-child-desktop.svg`

These SVGs are controlled comparison diagrams, not live-page screenshots.

## Accessibility and input boundaries

- The range uses native `input[type=range]` semantics.
- `aria-valuetext` reports the same depth labels used by the parent readout.
- Pointer activity beginning inside the range is excluded from stage rotation.
- Range keyboard events stay on the range; stage arrow rotation remains available when the stage itself is focused.
- Pinch and `+`／`-` remain active and update the same range through `render()`.
- Reset restores the range to `.58`.
- 26A landmark cards remain non-interactive and `aria-hidden`; the inherited live region remains the only spoken transition sentence.

## What remains unresolved

- Direct readers still need to show whether the range makes flat recovery discoverable rather than adding control clutter.
- Full repository CSS must be checked on actual devices at 320px and 390px after CI publication; the current browser environment blocks localhost and branch Pages navigation, so the recorded live smoke uses an inline bounded harness.
- Low-end device performance remains unmeasured.
- Parent detail focus／Escape limitations remain outside this child because fixing them would be a separate accessibility revision.

## Stop condition

26C should be unsuccessful if useful recovery requires any of the following:

- a named flat mode;
- automatic flattening;
- another orientation endpoint;
- camera tracking;
- changed 26A landmark wording or behavior;
- a second Product geometry formula.

## Formal validation routing

The repository workflow only runs for pull requests targeting `main`. The Draft PR may be temporarily retargeted to `main` solely to execute the unchanged Typecheck／Test／Build workflow, then returned to the 26A branch so the final review diff remains parent-to-child.

## Current implementation judgment

The code supports **KEEP as a controlled research child**, subject to repository formal checks. The range reaches the existing near-flat and deep states while preserving orientation and the same Product depth equation. It does not establish product preference or reader comprehension.

## Files changed from 26A

Child-specific:

- `research-history/phases/26c-flat-recovery/index.html`
- `research-history/parallax-flat-recovery.css`
- `research-history/parallax-flat-recovery.js`
- `scripts/validate-26c-flat-recovery.mjs`
- `research-history/review-assets/26c/*`
- `docs/research-history/26c-flat-recovery-review.md`

Shared integration only:

- `research-history/prototype-registry.js`
- `package.json`

Not changed:

- 26 or 26A prototype files;
- `parallax-transition-landmarks.js` or its CSS;
- `parallax-menu-volume.js` or its CSS;
- shared fixture;
- sibling prototypes;
- product application source.
