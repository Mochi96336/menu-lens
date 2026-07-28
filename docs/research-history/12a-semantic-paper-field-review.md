# 12A Semantic Paper Field implementation review

## Scope

- Repository: `a20030824/menu-lens`
- Base: `main`
- Base commit: `54bde49c6c1df800ba2e8d1b014c2a2b9eef9177`
- Parent: `12 Paper Menu Field`
- Child: `12A Semantic Paper Field`
- Unique variable: information revealed at the existing overview, focused-category, and detail states

12A does not change the parent 2 × 3 sheet, category positions, fixture membership, canonical order, focus target, `translate + scale` camera formula, `2.05` scale cap, or detail overlay placement.

## Parent and child comparison

### Whole-sheet overview

- [320px parent／child comparison](../../research-history/review-assets/12a/overview-320-comparison-pr.svg)
- [390px parent／child comparison](../../research-history/review-assets/12a/overview-390-comparison-pr.svg)
- [Desktop parent／child comparison](../../research-history/review-assets/12a/overview-desktop-comparison-pr.svg)

Parent 12 attempts to print every miniature Product name and price at overview scale. 12A retains one mark per Product in canonical order, while the category header carries the category name, Product count, and fixture price range.

### Near category, reading detail, and reset

- [390px state comparison](../../research-history/review-assets/12a/states-390-comparison-pr.svg)

Near-category scale restores Product name, price, and sold-out state only for the focused category. The detail overlay adds description, portion, preparation, and required configuration without changing the camera or leaving the sheet.

## Files changed

- `research-history/phases/12a-semantic-paper-field/index.html`
- `research-history/semantic-paper-field.css`
- `research-history/semantic-paper-field.js`
- `research-history/prototype-registry.js`
- `research-history/index.html`
- `research-history/review-assets/12a/*-comparison-pr.svg` and `browser-report.json`
- `docs/research-history/12a-semantic-paper-field-review.md`

No shared renderer, parent HTML, parent CSS, canonical fixture, Product identity, category membership, category order, or validator source was modified. 12A uses the existing `paper-field-variant` validation profile.

## Preserved parent behavior

- fixed 2 × 3 paper geometry
- same canonical sheet and 30 unique Product anchors
- same category coordinates and ordering
- same category click, previous, next, overview, Escape, resize, and reset paths
- same `translate + scale` camera formula and `2.05` scale cap
- same detail overlay position and return to focused context
- reduced-motion removal of sheet and detail transitions

## Browser checks

The parent and child were exercised at 320px, 390px, and 1280px desktop width.

Measured category rectangles relative to the sheet:

| Width | Overview maximum parent/child delta | Focus maximum parent/child delta |
|---:|---:|---:|
| 320px | 0px | 0.000122px |
| 390px | 0px | 0px |
| 1280px | 0px | 0.000061px |

Additional checks:

- 6 categories rendered
- 30 Product IDs rendered exactly once
- overview: 0 miniature Product actions in sequential keyboard order
- focused first category: 8 Product actions in sequential keyboard order
- detail open: focus moves to the close button and the sheet becomes inert
- Escape: detail closes and focus returns to the originating Product
- detail close preserves the focused camera transform
- reset returns to overview information level
- reduced motion reports `0s` sheet transition duration
- pointer and mobile touch reach overview → near → detail → close → reset without a hidden gesture

## Continuation decision

**Result: KEEP.**

Re-reading the implementation, actual diff, browser report, workflow result, and parent／child comparison did not reveal a second mechanism or a local UI defect that justified a narrow revision.

The whole-sheet summary remains inside the same category headers and fixed paper regions. Product density remains one mark per canonical Product in category order. Near-category and reading states add information without changing geometry, camera grammar, focus targets, or page structure.

For the current research question, fixed paper plus semantic zoom is sufficient. There is not yet evidence that local reading remains constrained enough to justify `15A Pair-local Elastic`, and no boundary flip was observed that would justify `16A Stable Weighted Drag`.

## What improved

- Whole-sheet overview no longer asks miniature Product text to be readable.
- Category scope, Product count, fixture price range, and density remain visible without a separate dashboard.
- Near-category focus exposes Product name, price, and essential state.
- Reading detail adds fixture-backed metadata while preserving the focused camera and return context.
- Overview keyboard focus no longer stops on unreadable miniature Product actions.

## Unresolved

- Density marks establish count and continuity but do not identify individual Products before focus; this is intentional and requires direct reader evaluation.
- Sold-out density uses a dashed accent mark. Whether that state should be visible at whole-sheet scale remains an evaluation question, not a geometry change.
- 12A does not address whether the parent camera scale is sufficient for every long Product name.
- This implementation does not add native pinch, free pan, another reading scale, or elastic geometry.

## Repository checks

- `node --check research-history/semantic-paper-field.js`
- browser geometry and state report: `research-history/review-assets/12a/browser-report.json`
- mobile touch emulation: overview → near → reading → close → reset
- GitHub Actions run `30302477478`: `Typecheck`, `Test`, and `Build` passed

## Next proposed step

Run a direct reader comparison of parent 12 and child 12A on whole-menu comprehension and near-category reading. Do not begin another mechanism variant unless that evidence identifies a specific limitation.
