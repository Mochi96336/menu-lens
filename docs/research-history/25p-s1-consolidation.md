# 25P-S1 study consolidation

## Canonical result

PR #34 and PR #35 both implement an unfamiliar-reader evidence tool for the same 25P prerequisite. Archive v2 retains one canonical study object and one participant runner:

```text
25P-S1 Unfamiliar-reader Study
entrypoint: research-history/studies/25p-reader-task/index.html
parent: 25P
depends on: 25P-L1
```

This consolidation contains no participant result and does not authorize 25PA.

## Retained from PR #34

Primary source: PR #34, head `360c1947092363b72a545265ae3c0555e49de143`.

Retained:

- the single-condition participant runner;
- S01–S06 counterbalancing across 320px／390px and three starting projections;
- exact participant task;
- in-memory elapsed time, projection sequence, and opened Product IDs;
- post-task anonymous observation fields;
- explicit eligibility threshold and stop conditions;
- active／finished layout behavior and eleven-case layout report.

## Retained from PR #35

Technical source: PR #35, head `137426acf07b07aaad908a15640d2b2bc26e5143`.

Reimplemented against the canonical PR #34 runner:

- actual browser execution at 320px, 390px, and 1280px;
- 30 unique Product nodes and three projection controls inside the iframe;
- readable band summary and hidden research chrome;
- completed session flow;
- zero localStorage and sessionStorage keys;
- zero cookies;
- no external or non-read network submission;
- reload returning the runner to setup state.

The second PR #35 participant runner, duplicate protocol, package-script edit, and self-committing workflow are not retained.

## Evidence boundary

The committed layout report is bounded technical evidence. The Playwright workflow supplies executable technical verification for the consolidated runner, but neither source PR contains unfamiliar-reader evidence.

After S01–S06, record exactly one classification:

```text
25PA ELIGIBLE
25PA STILL BLOCKED
STOP 25PA LINE
```

Do not create a wizard, filter, ranking, recommendation, or automatic projection selection to rescue repeated projection-grammar failure.
