# 25PA Task-first Entry — provisional implementation review

## Status

```text
Research parent: 25P Menu Projections
Git base: agent/menu-lens-25p-band-labels-task
Child: 25PA Task-first Entry
Evidence gate: not completed
Implementation reason: explicit owner request before participant evidence
Disposition: provisional Draft child only
```

This branch intentionally does not rewrite the findings in PR #31, PR #34, or PR #35. Those branches correctly record that no unfamiliar-reader evidence exists. The owner has nevertheless requested an implementation, so 25PA is isolated as a provisional child rather than represented as an eligible or validated product direction.

## Unique variable

25PA changes only the entry sequence:

```text
fixed task briefing
→ explicit “進入投影” action
→ unchanged 25P workspace
```

The first surface translates the approved task into three visible conditions:

1. serving band is 分享;
2. each dish costs no more than NT$500;
3. preparation is 較快 or 一般, while 較慢 and 未標註 do not qualify.

The final comparison question remains visible, but no qualifying Product name or answer is shown.

## After entry

The workspace retains:

- all six categories and 30 unique Products;
- the default 價格 × 份量 projection;
- all three manual projection controls;
- continuous price coordinates;
- serving and preparation bands;
- the same view matrices, quaternion interpolation, nodes, semantic cells, focus cards, and Escape behavior;
- the repaired 25P band labels and focus-card containment from the parent branch.

A compact task reminder can reopen the same briefing. Reopening temporarily hides the workspace rather than recreating it, so the active projection and focused semantic cell remain in memory. Escape from the recalled task returns to the preserved workspace.

## Deliberately excluded

- task wizard, questionnaire, or multi-step setup;
- programmatic projection selection;
- Product filtering, ranking, recommendation, or scoring;
- answer-key Product names;
- Candidate, comparison workspace, cart, order, or transaction state;
- storage, cookies, analytics, or network submission;
- changes to parent 25P files, shared fixture, registry, archive index, or package scripts.

## Validation plan

The dedicated static validator checks the exact task contract, inherited 25P markup, 6 / 30 fixture identity, reversible state controller, and absence of forbidden behaviors.

The real Chromium matrix checks 320px, 390px, and 1280px in three states:

1. initial task briefing;
2. entered projection workspace;
3. recalled task and return.

Required observations:

- no horizontal document overflow;
- task briefing and entry action contained in the phone;
- no internal task scrolling at the target viewport heights;
- 30 unique Product nodes and three projection controls;
- entry does not change the default projection;
- projection and selected semantic cell survive task recall;
- no storage, cookies, or page errors.

Browser results are written to:

- `research-history/review-assets/25pa-task-first-entry/browser-report.json`

Viewport screenshots are uploaded as a workflow artifact rather than committed as evidence of participant success.

## Decision boundary

A passing implementation and layout matrix means only that 25PA is technically coherent as a controlled child. It does not show that task-first entry helps unfamiliar readers, and it does not retroactively satisfy the evidence gate.

The next meaningful comparison is direct reader evidence between labelled 25P and this exact 25PA child. Until that evidence exists, keep the PR Open + Draft and do not mark ready, auto-merge, or merge it.
