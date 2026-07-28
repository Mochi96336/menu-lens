# 25P Task Evidence Study

## Status

Evidence-only Workstream F gate stacked on `agent/menu-lens-25p-band-labels-task`.

This study prepares direct unfamiliar-reader sessions. It does not contain participant results and does not implement 25PA Task-first Entry.

## Parent prerequisite

The parent branch adds readable, non-interactive semantic band labels to 25P and fixes one fixture-backed task before any task-first UI is considered.

The study uses that exact 25P page in an iframe:

- `research-history/phases/25-menu-depth/projections.html`

No Product coordinate, band boundary, projection destination, quaternion transition, focus-cell behavior, or controller source is changed.

## Participant task

> 你和兩位朋友要點一道分享料理。每道料理預算不超過 NT$500，而且不想選「較慢」的料理。請找出所有符合條件的料理，再說明：若優先最快會選哪一道；若優先最低價會選哪一道？

The facilitator must not explain projection order or how to interpret `未標註`.

## Runner behavior

The runner provides only study administration outside the prototype:

- ephemeral random session code;
- 320px, 390px, and 1280px iframe widths;
- start, first-correct, complete-set, and end timing controls;
- post-task debrief prompts;
- a new-session reload.

Timing and milestone state stay in page memory. The runner has no response field, form submission, storage, analytics, answer reveal, hidden scoring, recommendation, filter, or projection automation.

When the iframe loads, research headers and notes are hidden so the participant sees the actual phone prototype rather than the version explanation. The 25P prototype itself remains unmodified and is the only task interface.

## Observation record

Use:

- `docs/research-history/25p-task-evidence-observation-sheet.md`

The sheet contains the fixture-backed answer key for the facilitator and records only task behavior. It prohibits personal identifiers and personal free-form data.

## Gate

A separate 25PA plan becomes eligible only after repeated unfamiliar-reader sessions show that readers can:

- identify all three qualifying Products;
- distinguish `分享` from the other serving bands;
- distinguish `一般` and `較快` from `較慢` and `未標註`;
- explain fastest versus lowest-price trade-offs;
- complete without facilitator instruction about projection order.

If repeated sessions fail, stop the 25PA line. Do not use this study as authorization to add a wizard, filter, ranking, automatic projection selection, recommendation, Candidate, cart, order, or transaction state.

## Changed files

- `research-history/studies/25p-task-evidence/index.html`
- `docs/research-history/25p-task-evidence-observation-sheet.md`
- `docs/research-history/25p-task-evidence-study.md`
- `scripts/validate-25p-task-evidence.mjs`
- `scripts/25p-task-evidence-browser.mjs`
- `.github/workflows/25p-task-evidence-validation.yml`
- `package.json`
- generated browser report under `research-history/review-assets/25p-task-evidence/`

Parent 25P implementation files, registry, archive index, shared fixture, and product application source are unchanged.
