# Digital menu document UI direction

## Document status

```text
branch  agent/menu-document-direction
status  [active planning]
scope   customer UI direction only
```

This document defines the replacement UI direction after PR #4 was rejected as the active product foundation.

It does not authorize Candidate, comparison-mode, Decision, Configuration, Current order, or transaction implementation. Its purpose is to restore the project to the original problem: making a mobile menu easier to understand, scan, compare, and revisit than a conventional QR ordering feed.

## Product question

> How can a mobile complete menu preserve the overview, density, spatial memory, and nearby comparison of a good paper menu while adding reversible detail and trustworthy live state?

The first replacement prototype should behave like a **digital menu document**, not a decision workflow, catalog management tool, or miniature checkout interface.

## Directional decision

The default customer flow becomes:

```text
restaurant overview
→ visible menu structure
→ complete menu document
→ inline Product detail
→ explicit order intent
→ required configuration
```

The first UI slice ends at inline Product detail.

The following are not default prerequisites for understanding or comparing the menu:

- Anchor selection;
- semantic-axis selection;
- Candidate marking;
- Candidate workspace;
- comparison membership;
- dedicated comparison surface;
- questionnaire or guided recommendation flow.

## Primary user jobs

The first interface should let a diner:

1. understand what kind of restaurant this is;
2. see how large the menu is and how it is organized;
3. reach any category without losing the sense of a complete menu;
4. scan many Products without repetitive card chrome;
5. compare nearby alternatives directly in the document;
6. open detail without losing surrounding Products or reading position;
7. notice sold-out, incomplete, or uncertain information without treating it as hidden content;
8. express order intent only after understanding the Product.

## Core UI principles

### 1. Zero-interaction overview

The first viewport should communicate useful structure before the user taps anything.

It should expose, within bounded space:

- restaurant identity;
- short restaurant description;
- number of categories;
- number of Products;
- overall price range;
- category names and counts;
- enough category character to distinguish the restaurant's structure.

The overview must not be a dashboard of cards. It should read as the top of the same menu document that continues below.

### 2. One continuous document

Categories should remain part of one stable complete-menu document.

Category navigation may jump within the document, but it must not imply filtering, replace the page with a separate feed, or make users wonder whether hidden Products exist.

Canonical Category and Product order should remain stable.

### 3. Comparison through layout

The default comparison mechanism is not a button. It is simultaneous visibility.

Use:

- shared price alignment;
- stable Product-name width;
- repeated metadata positions;
- clear category grouping;
- restrained row height;
- nearby alternatives;
- selective emphasis of meaningful differences.

Do not require users to enter a comparison mode merely to compare two adjacent dishes.

### 4. Dense rows, not isolated cards

Products should feel like entries in a composed menu rather than independent storefront tiles.

Avoid by default:

- full bordered cards for every Product;
- repeated shadows and rounded containers;
- oversized imagery;
- repeated button bars;
- duplicated labels that occupy more space than the Product information.

Rows may use separators, rhythm, indentation, or subtle background grouping, but the category should remain the primary visual unit.

### 5. Detail expands in place

Opening Product detail should expand directly below or within the Product row.

The expanded area should:

- preserve the Product's original position;
- keep neighboring alternatives visible where practical;
- avoid covering the whole viewport;
- avoid navigation to a separate page;
- avoid forcing modifier completion;
- close without scroll or focus loss.

A bottom sheet remains a fallback only if inline detail cannot fit the required information without destroying reading continuity.

### 6. Transaction actions remain secondary

The menu should not look like a cart-building interface before the diner understands the Product.

The primary row interaction is reading or expanding detail.

An order-intent action may appear:

- inside expanded detail;
- as a restrained trailing action when unambiguous;
- after the Product's price and availability, not before its identity.

Quantity, required modifiers, totals, and checkout remain outside the first replacement slice.

### 7. Progressive semantic information

Semantic metadata should support scanning without turning each row into a specification sheet.

The default row may expose at most one or two high-value cues, such as:

- personal or shared portion;
- preparation rhythm;
- characteristic trait;
- required customization presence.

Additional evidence belongs in inline detail.

Missing or low-confidence data should not remove Products or create false negative labels.

## Proposed information architecture

### A. Restaurant header

The header should be compact enough that the menu begins in or near the first viewport.

Suggested structure:

```text
Restaurant name
Short editorial description

30 dishes · 6 categories · NT$80–NT$680
```

Optional operational information appears only when trustworthy.

Avoid hero imagery that pushes the actual menu below the fold.

### B. Menu map

Immediately below the header, show a compact category map.

Preferred first prototype:

```text
開胃小食  5      主餐  7
分享料理  6      飯麵  4
飲品      4      甜點  4
```

The map is a table-of-contents view, not a set of filter chips.

Each category entry may include:

- name;
- Product count;
- category price range when useful;
- one short structural cue only if it materially distinguishes the category.

Selecting an entry scrolls to the category section and preserves the complete document.

### C. Category section

Each section should establish a strong reading boundary:

```text
分享料理                                      6 道
適合多人一起分食                         NT$280–NT$680
```

The header may become a lightweight sticky context marker while the section is being read, but sticky behavior must not accumulate multiple bars or consume excessive vertical space.

### D. Product ledger

Preferred row grammar:

```text
三杯杏鮑菇                         約 2–3 人     NT$280
九層塔、麻油、醬香

椒麻雞腿                           一人份        NT$320
花椒、酸香、微辣
```

The row has three stable zones:

1. Product identity and optional short description;
2. one bounded decision cue;
3. price and availability.

On very narrow screens, the cue may wrap below the Product name, but price alignment should remain stable.

The row itself may be the detail trigger if its affordance is clear and accessible. A small disclosure control is preferable to a repeated large `查看` button.

### E. Inline Product detail

Expanded structure:

```text
三杯杏鮑菇                         約 2–3 人     NT$280
九層塔、麻油、醬香

  以杏鮑菇取代肉類，使用麻油、老薑與九層塔收汁。

  份量        約 2–3 人分享        商家確認
  餐點角色    分享料理             分類預設
  準備節奏    一般                 分類預設
  必選規格    無

  [ 選這道 ]
```

The detail block should not repeat all row information unless repetition is necessary for comprehension.

The evidence labels should remain visually secondary to the values.

### F. Reading return

Closing detail must preserve:

- exact category context;
- scroll position;
- keyboard focus;
- canonical ordering;
- any previously visible sold-out or incomplete-data state.

Category navigation should likewise preserve a predictable return path to the menu map.

## Mobile layout direction

### Viewport target

The first prototype should be designed and tested at:

- 320px width;
- 390px width;
- a common desktop width for widening behavior.

Mobile is not a compressed desktop card grid. It is the primary document grammar.

### Suggested spacing rhythm

Use a compact but readable vertical rhythm:

- restaurant header: 16–24px internal spacing;
- category map rows: approximately 40–48px targets;
- category heading: 16–24px top separation;
- Product row: approximately 56–76px collapsed depending on description;
- row separators rather than outer cards;
- inline detail: visibly nested but not modal-looking.

These are prototype bounds, not final tokens.

### Sticky behavior

The first prototype may use one sticky category-context bar containing:

```text
分享料理                    回到分類
```

Do not stack:

- restaurant header;
- category chip bar;
- candidate summary;
- comparison actions;
- order footer.

At most one persistent reading aid should occupy vertical space at a time.

## Desktop widening

Desktop should widen the same information hierarchy rather than introduce a second product model.

Possible behavior:

- restaurant summary and menu map share the top region;
- category sections remain in one reading order;
- Product rows gain more room for descriptions and cues;
- price remains aligned;
- inline detail may use a two-column fact layout;
- no separate desktop-only comparison matrix in the first prototype.

A two-column category layout is allowed only if it preserves clear reading order and does not fragment spatial memory.

## First prototype variants

### Variant A — Ledger-first

```text
compact restaurant header
→ category map
→ full-width category ledgers
→ inline detail
```

Characteristics:

- highest density;
- strongest price and cue alignment;
- closest to a well-typeset paper menu;
- least dependent on imagery;
- preferred first implementation.

### Variant B — Editorial sections

```text
compact overview
→ category introduction
→ one representative feature
→ dense remaining Product ledger
```

Characteristics:

- stronger restaurant character;
- useful when some Products deserve explanation;
- risk of creating unequal visibility or promotional hierarchy;
- should remain an explicit editorial choice, not algorithmic ranking.

### Variant C — Compact index with local expansion

```text
category map
→ very compact Product index
→ one expanded Product at a time
```

Characteristics:

- maximum overview;
- useful for very large menus;
- descriptions rely more heavily on expansion;
- risk of under-communicating Product character in collapsed state.

## Recommended starting point

Start with **Variant A — Ledger-first**.

It most directly tests the core hypothesis that layout, density, hierarchy, and inline detail can solve the problem without Candidate or comparison workflows.

The first implementation should modify the existing `main` complete-menu baseline rather than build another parallel application.

## First implementation scope

Implement only:

1. compact restaurant header;
2. visible category map with counts and bounded price information;
3. one continuous complete-menu document;
4. category sections with strong hierarchy;
5. aligned dense Product rows;
6. one or two bounded row cues;
7. inline Product detail;
8. sold-out and incomplete-data states;
9. exact close and return continuity;
10. 320px, 390px, and desktop geometry checks.

Do not implement:

- Candidate state;
- saved-item workspace;
- explicit comparison selection;
- Anchor or semantic-axis controls;
- recommendation, ranking, or filtering;
- quantity or modifiers;
- Decision or Current order;
- backend, persistence, router, analytics, or merchant authoring;
- a generic layout engine or design-system package.

## Evaluation tasks

The first review should use direct tasks rather than asking whether the interface looks cleaner.

### Task 1 — Establish overview

Ask an unfamiliar tester to explain:

- what the restaurant mainly serves;
- approximately how large the menu is;
- the major categories;
- the general price range.

No category control should need explanation.

### Task 2 — Compare nearby alternatives

Ask the tester to choose between two or three Products in the same category and explain the differences they used.

The tester should not need to enter a comparison mode.

### Task 3 — Inspect and return

Ask the tester to inspect one Product, close it, and continue comparing the neighboring Products.

Record whether they lose position, surrounding context, or category orientation.

### Task 4 — Find a distant Product

Ask the tester to move to a different category and then return to the previous reading area.

Record whether the menu still feels like one stable document.

## Success signals

The direction is promising when unfamiliar testers can:

- describe the restaurant and menu structure before deep exploration;
- trust that the complete menu is present;
- compare adjacent Products without extra setup;
- understand price, portion, and Product character at a glance;
- inspect detail without losing place;
- identify sold-out and incomplete-data states without mistaking them for hidden Products;
- describe the interaction as reading a menu rather than managing selections.

## Falsification signals

Revise or reject the direction when repeated testing shows:

- the first viewport still feels like a generic app dashboard;
- users cannot tell how categories relate to the complete menu;
- density makes Products indistinguishable;
- row cues create a specification dump;
- inline detail causes large orientation shifts;
- users need explicit comparison tools for ordinary nearby alternatives;
- order actions dominate reading;
- sticky navigation consumes more space than it saves;
- desktop widening introduces a separate interaction grammar.

## Open design questions

The first prototype should answer, not merely debate:

1. Does the category map need price ranges or only counts?
2. Should all categories be expanded by default, or should the top begin with a compact overview followed by the continuous document?
3. Which one or two Product cues deserve collapsed-row space?
4. Is the entire row a detail trigger, or should there be a visible disclosure affordance?
5. Can price remain aligned when Product names wrap at 320px?
6. Should category context be sticky, and how little vertical space can it use?
7. Is imagery absent, optional, or limited to category-level editorial moments?
8. Where can `選這道` appear without making every row look transactional?
9. How should low-confidence evidence appear without adding repetitive badges?
10. At what menu size does optional saved-item behavior become genuinely useful?

## Workstream gate

The next implementation workstream may begin only after this document receives an explicit disposition:

```text
[active planning] digital menu document UI direction
→ [blocked] implementation prototype
→ [blocked] Decision / Configuration / Current order
```

Approval authorizes only the bounded menu-document prototype described above.
