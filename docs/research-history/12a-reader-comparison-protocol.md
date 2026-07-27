# 12A direct reader comparison protocol

## Purpose

This study checks whether the fixed 2 × 3 paper plus scale-specific information is already sufficient after 12A.

It does **not** test a new Product mechanism and does not authorize elastic geometry. The study compares:

- Parent 12: miniature Product names and prices remain printed at whole-sheet scale.
- Child 12A: the same Product anchors become density marks at whole-sheet scale, then names, prices, state, and metadata appear at the existing near and reading states.

## Research questions

1. Does the whole-sheet view still feel like a complete menu rather than a dashboard or decorative texture?
2. Can readers understand category density and scope without pretending miniature Product names are readable?
3. Does 12A preserve category position memory through focus, detail, close, and reset?
4. At 320px and 390px, is near-category reading sufficiently legible without changing geometry?
5. Does the added reading metadata improve detail comprehension without creating a second interaction mode?

## Hypothesis boundary

The only evaluated variable is information visibility by the parent’s existing scales.

The comparison must not introduce:

- different category geometry;
- a different camera formula or zoom cap;
- native pinch, free pan, filtering, sorting, or a second overview;
- Candidate, comparison, cart, order, or transaction state;
- any change to Product identity, membership, or canonical order.

## Study runner

Use:

```text
/research-history/studies/12a-reader-comparison/
```

For a local repository checkout:

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:4173/studies/12a-reader-comparison/
```

The runner:

- randomizes parent／child order;
- labels them only as Condition A and Condition B;
- presents one condition at a time;
- hides research titles and mechanism notes inside the embedded prototype;
- supports 320px, 390px, and 1280px frames;
- stores no response, identifier, analytics, or local state.

The facilitator records observations manually with `12a-reader-comparison-observation-sheet.md`.

## Participants

Use an initial qualitative gate of five readers. Add up to three more only when the first five produce conflicting patterns.

Do not treat this sample as statistical validation. The purpose is to find repeated comprehension or reading failures before another mechanism branch is proposed.

Avoid participants who already know which condition is 12A when possible. Do not explain the semantic-zoom hypothesis before both conditions are complete.

## Counterbalancing

- The runner randomizes condition order per session.
- Alternate the primary mobile viewport across sessions: 320px, then 390px, then 320px, and so on.
- Use desktop as a secondary check, not as a substitute for mobile sessions.
- Do not show the two conditions side by side until the participant has completed both and given an overall judgment.

## Tasks

Run the same tasks for each condition.

### 1. Whole-sheet overview

Give the participant eight seconds of unrestricted viewing without explaining the intended information levels.

Ask:

1. What does this whole-sheet view tell you?
2. Which category appears to contain the most dishes?
3. Which category appears to contain the fewest dishes?
4. What visual evidence did you use?
5. Does this feel like a complete menu, a summary dashboard, or decorative texture? Why?

Record whether the reader relied on category labels, visible miniature rows, density marks, guessing, or the restaurant header outside the paper.

### 2. Near-category reading

Ask the participant to enter `個人主餐` and:

1. locate the sold-out dish;
2. read its name and price aloud;
3. identify the first and last Product in that category;
4. describe any retry, hesitation, truncation, or need for an unprovided gesture.

Do not assist unless the participant is unable to proceed. Record assistance separately from task success.

### 3. Reading detail

Ask the participant to open the sold-out Product and describe what information is available.

Do not prompt individual metadata fields until the participant finishes the open description. Then ask whether they can determine:

- price;
- state;
- description;
- portion;
- preparation time;
- required configuration.

The parent is not expected to expose all fields. Record what the participant can actually find rather than marking the parent incorrect by definition.

### 4. Close and reset

Ask the participant to:

1. close detail;
2. return to the whole sheet;
3. point to the original location of `個人主餐`;
4. explain whether the return felt like the same sheet or a different screen.

## Measures

Record per condition:

- overview description in the participant’s own words;
- densest and sparsest category answer;
- evidence used for that answer;
- complete-menu trust rating from 1 to 5;
- dashboard／texture confusion, if any;
- near-category completion time;
- Product-name or price reading errors;
- unprovided gesture attempts;
- detail fields spontaneously noticed;
- successful close and reset;
- category-location recall;
- assistance required;
- one representative quote.

Preference is collected only after both conditions are complete. Preference alone is not a success criterion.

## Decision gate

### Keep 12A and stop geometry work

Keep fixed paper plus semantic zoom when:

- participants consistently recognize a complete six-category menu;
- density differences can be explained without relying on unreadable text;
- no repeated dashboard confusion appears;
- near-category names and prices are readable without an additional gesture;
- focus, detail, close, reset, and location recall remain reliable;
- 12A does not introduce a repeated cost that outweighs the overview improvement.

A single preference against density marks is not enough to reject 12A.

### Make 15A eligible for a separate proposal

`15A Pair-local Elastic` may be proposed only when the same near-reading limitation:

- occurs independently in at least three sessions;
- appears across both 320px and 390px evidence;
- remains after the participant has correctly reached near-category scale;
- is caused by insufficient local reading space rather than missing information, unclear labels, or unfamiliar controls.

This study does not approve 15A implementation. It only determines whether the evidence threshold for a separate proposal has been reached.

### Do not infer 16A from this comparison

`16A Stable Weighted Drag` requires observed boundary flipping in an elastic or weighted prototype. Parent 12 and child 12A have fixed geometry, so this study cannot provide that evidence.

## Reporting

After sessions are complete, add an evidence summary that includes:

- participant count and viewport distribution;
- condition-order distribution;
- repeated successful patterns;
- repeated failures and the exact states where they occurred;
- representative quotes without personal identifiers;
- KEEP／UNSUCCESSFUL judgment for 12A;
- whether 15A is ineligible or eligible for a new proposal;
- explicit confirmation that 15A and 16A were not implemented in this study branch.

Do not merge raw personal data, recordings, names, email addresses, or identifiable demographic notes into the repository.
