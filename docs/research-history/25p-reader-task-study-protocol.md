# 25P first-use reader task study protocol

## Status

Evidence-collection preparation only.

This study evaluates the existing `25P Menu Projections` plus the readable band-label prerequisite. It does not implement `25PA Task-first Entry`, does not change the prototype, and does not claim participant results before sessions are actually run.

## Study question

Can unfamiliar readers use the existing three projections and visible semantic bands to complete one realistic three-condition menu task without being told a projection order?

The task requires readers to combine:

- serving band: `分享`;
- continuous price: no more than `NT$500`;
- preparation band: exclude `較慢` and treat `未標註` as unknown rather than acceptable;
- final trade-off: fastest versus lowest price.

## Executable runner

Use:

```text
/research-history/studies/25p-reader-task/
```

For a local checkout:

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:4173/studies/25p-reader-task/
```

The runner:

- embeds the unchanged 25P prototype from the stacked prerequisite branch;
- hides research headers and mechanism notes, not prototype controls or information;
- supports 320px, 390px, and 1280px frames;
- randomizes the starting projection unless the facilitator supplies a counterbalancing parameter;
- records elapsed time, projection sequence, and opened Product IDs only in memory;
- contains no answer key and performs no automated scoring;
- lets the facilitator copy an anonymous text summary through an explicit clipboard action;
- uses no localStorage, sessionStorage, analytics, form submission, backend, or network response collection.

## Participants

Run an initial qualitative gate with six unfamiliar readers.

This is not statistical validation. Six sessions are used because the two primary mobile widths and three possible starting projections form a complete `2 × 3` counterbalancing matrix.

Avoid readers who already know the 25P axis model when possible. Do not explain the hypothesis or answer set before the task ends.

Each participant must be told:

- this is a prototype-reading study, not an ordering service;
- there is no correct interaction sequence they are expected to know;
- they may stop at any time;
- no name, contact information, recording, account identifier, or demographic profile will be stored in the repository.

## Counterbalancing schedule

Use these six primary sessions:

| Session | Viewport | Starting projection | Runner query |
| --- | ---: | --- | --- |
| S01 | 320px | 價格 × 份量 | `?viewport=320&start=price-serving` |
| S02 | 390px | 價格 × 時間 | `?viewport=390&start=price-preparation` |
| S03 | 320px | 份量 × 時間 | `?viewport=320&start=serving-preparation` |
| S04 | 390px | 價格 × 份量 | `?viewport=390&start=price-serving` |
| S05 | 320px | 價格 × 時間 | `?viewport=320&start=price-preparation` |
| S06 | 390px | 份量 × 時間 | `?viewport=390&start=serving-preparation` |

Desktop is a secondary accessibility and scaling check. It does not replace either mobile width in the eligibility gate.

When the runner is opened without query parameters, it chooses one of the three starting projections using browser randomness and defaults to 390px.

## Participant task

Read this verbatim:

> 你和兩位朋友要點一道分享料理。每道料理預算不超過 NT$500，而且不想選「較慢」的料理。請找出所有符合條件的料理。接著回答：若優先最快，會選哪一道；若優先最低價，會選哪一道？

Do not add examples, define the band labels, or tell the participant which projection to choose.

The participant may:

- use the three existing projection buttons in any order;
- select Product nodes and read the existing semantic-cell list;
- clear a selected cell with Escape;
- revise their answer until they say the task is complete.

## Facilitator sequence

### 1. Setup

1. Open the assigned query from the counterbalancing table.
2. Confirm the viewport and generated anonymous session code.
3. Explain the study and privacy boundary.
4. Start the session only when the participant is ready.

### 2. Unassisted task

1. Let the participant read the task and prototype without explanation.
2. Start no separate verbal timer; the runner tracks total elapsed time.
3. Record the first correct qualifying Product time manually when observed.
4. Record the complete-set time manually when the participant first names all qualifying Products.
5. Do not confirm or reject individual answers during the task.

### 3. Assistance boundary

If the participant cannot continue, first ask:

> 你現在覺得缺少什麼資訊？

Do not name a projection. A direct projection-order hint counts as assisted completion and must be recorded separately.

Never explain that `未標註` should be excluded while the task is active.

### 4. Completion

1. Ask the participant to state the complete qualifying set.
2. Ask for the fastest choice and reason.
3. Ask for the lowest-price choice and reason.
4. Ask what they did with `未標註` and why.
5. End the runner timer.
6. Record the answers exactly before consulting the answer key.

## Fixture-backed answer key

All qualifying Products are:

| Product | Price | Serving band | Preparation band |
| --- | ---: | --- | --- |
| 紹興奶油蝦 | NT$480 | 分享 | 一般 |
| 蒜酥椒鹽軟殼蟹 | NT$460 | 分享 | 較快 |
| 宮保杏鮑菇 | NT$340 | 分享 | 一般 |

Trade-off answers:

- fastest: `蒜酥椒鹽軟殼蟹`;
- lowest price: `宮保杏鮑菇`.

`季節時蔬豆腐煲` is excluded because preparation is `未標註`. The study must not silently reinterpret unknown data as `一般`, `較快`, or an acceptable substitute.

## Measures

Record per session:

- viewport and assigned starting projection;
- total completion time;
- time to first correct qualifying Product;
- time to the complete three-Product set;
- participant's uncorrected qualifying set;
- omissions and incorrect inclusions;
- fastest and lowest-price answers;
- whether the trade-off explanation references both preparation and price;
- whether `未標註` was correctly excluded as unknown;
- projection sequence and number of changes;
- Product nodes opened;
- whether visible band labels were used or node positions were guessed;
- unprovided gestures, hesitation, retries, and abandonment;
- facilitator assistance and projection-order hints;
- one anonymous representative quote.

Preference and visual novelty are not success measures for this study.

## Eligibility gate for a separate 25PA proposal

After the initial six sessions, 25PA remains blocked unless all of these are true:

1. At least five of six readers identify the exact three-Product qualifying set.
2. At least five of six correctly exclude `未標註` as unknown.
3. At least five of six give both correct trade-off answers and explain the relevant dimensions.
4. At least five of six complete without a projection-order hint.
5. No repeated failure is concentrated at either 320px or 390px.
6. No starting projection produces the same blocking failure in both of its assigned sessions.

If four of six sessions pass and the failures conflict rather than repeat, run up to three additional diagnostic sessions without changing the prototype or runner.

Additional sessions do not authorize a UI revision. They only resolve whether the pattern is stable enough to classify.

## Stop conditions

Stop the 25PA line and record 25P as insufficient for this task when any of these occurs:

- three or more of the first six readers fail to identify the complete set;
- the same `未標註` error appears in three or more sessions;
- three or more readers require a projection-order hint;
- one mobile viewport produces a repeated failure not present at the other width;
- readers can answer only after the facilitator explains the axis relation;
- the only plausible rescue is a wizard, filter, ranking, recommendation, or automatic projection selection.

Do not turn repeated axis-model failure into a task-first interface branch.

## Interpretation boundary

A successful study would establish only that the labelled 25P model is usable for this one fixture-backed task under the tested conditions.

It would not establish:

- that 25P should replace the complete menu;
- broad preference or product readiness;
- that other restaurant data has equally defensible bands;
- that a 25PA interface is already designed;
- statistical superiority over a document or 2D baseline.

## Reporting

After sessions are complete, add one anonymized evidence summary containing:

- session count and viewport distribution;
- starting-projection distribution;
- exact-set, unknown-treatment, trade-off, and unassisted completion counts;
- repeated successful patterns;
- repeated failures and the states where they occurred;
- representative anonymous quotes;
- `25PA ELIGIBLE`, `25PA STILL BLOCKED`, or `STOP 25PA LINE`;
- explicit confirmation that no 25PA UI was implemented in the evidence branch.

Do not commit raw names, contact details, recordings, IP addresses, account identifiers, or identifiable demographic notes.
