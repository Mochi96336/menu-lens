# Section Route Diagram MVP

## Goal

Upgrade the design-model page from a text-and-card archive into an interactive research-model exhibit without changing canonical research identity, prototype behavior, or pooled live surfaces.

The presentation has three layers:

1. **Route diagram** — explains the model structure and navigates sections.
2. **Concept vignette** — visualizes the active section’s primary spatial or reading change with programmatic geometry.
3. **Live board** — retains the exact operable research objects.

The first implementation is deliberately limited to **Horizontal Navigation** and the `sequence` topology. Other models retain the existing section-tab presentation until later phases.

## Product principles

- The diagram must explain research structure, not decorate the page.
- Every visual distinction must correspond to a documented model or section concept.
- Presentation metadata must not override canonical section IDs, object IDs, ordering, lineage, evidence, or disposition.
- The diagram is a real navigation control: URL, focus, history, summary, object group, and live-board state must remain synchronized.
- Motion is explanatory and restrained; reduced-motion users receive the same final states without animation.
- No React, D3, force layout, draggable nodes, 3D, or automatic lineage inference in the MVP.

## Information hierarchy

```text
Model signature
  → what structural family is this?

Concept vignette
  → what changes in the active direction?

Route diagram
  → what directions exist, how are they related, and where am I?

Live board
  → how do the exact prototypes behave?

Inspector
  → what evidence, relations, and records support the object?
```

The generic card role `已選取` is removed. Selection remains visible through the active route node, card border, `aria-current`, and inspector identity. Semantic roles such as `研究工具`, `必要修正`, `比較對象`, and `比較基準` remain.

## Presentation-data boundary

Add `research-history/catalog/model-diagram-presentations.mjs` as a presentation-only contract.

The MVP contract contains:

```js
{
  kind: "sequence",
  signature: "Horizontal sequence",
  statement: "由市場基準逐步增加分類展寬、料理序列與局部焦點。",
  motif: "horizontal-axis",
  sections: {
    "market-baseline": {
      label: "市場基準",
      note: "完整分類、固定寬度與穩定閱讀位置。",
      vignette: { type: "equal-bands" },
    },
    spread: {
      label: "分類 Spread",
      note: "分類欄在同一張 spread 上原地展寬，鄰近欄位相應壓縮。",
      vignette: { type: "expanded-band", activeIndex: 1 },
    },
    ribbon: {
      label: "料理 Ribbon",
      note: "料理項目形成一條保留順序與長距離位置的連續帶。",
      vignette: { type: "ribbon-sequence", activeIndex: 2 },
    },
    fisheye: {
      label: "Fisheye",
      note: "焦點附近重新分配寬度，遠端項目與完整序列仍保留。",
      vignette: { type: "fisheye-axis", activeIndex: 2 },
    },
  },
}
```

Presentation metadata may control only:

- topology and model signature;
- display label and short concept note;
- known vignette type and bounded visual parameters.

It may not control:

- section identity or order;
- object membership or default object;
- lineage, prerequisites, evidence, or disposition;
- prototype URLs or runtime behavior.

## MVP visual structure

### Hero concept panel

Horizontal Navigation gains a compact programmatic SVG vignette near the model introduction. The active section selects one of four scenes:

- `equal-bands` — equal category bands;
- `expanded-band` — one band expands in place while neighbours compress;
- `ribbon-sequence` — a continuous sequence with a current item and retained neighbours;
- `fisheye-axis` — local enlargement with compressed but present far items.

The vignette contains no product screenshot, fixture text, or hand-authored illustration. It uses a fixed vocabulary of axes, bands, nodes, labels, and focus marks.

### Sequence route

The existing section rail becomes a sequence diagram for Horizontal Navigation:

```text
○────────●────────○────────○
市場基準  分類 Spread  料理 Ribbon  Fisheye
```

- the active node is solid and its path is emphasized;
- each node remains a real HTML button with tab semantics;
- the SVG line layer is non-interactive and presentation-only;
- on narrow screens the route scrolls horizontally and reuses position-aware overflow cues;
- models without a diagram contract keep the existing flat section tabs.

### Current concept copy

The route presents a short active-section label and note. This replaces using the full section summary as the only explanation. The canonical section summary remains visible to validators and may continue to support detailed context where appropriate.

## Interaction contract

### Hover preview

Desktop pointer hover may temporarily preview another section’s vignette and concept note.

It must not change:

- URL;
- canonical active section;
- visible live-board objects;
- selected object;
- history.

Pointer leave restores the committed section.

### Click commit

Clicking a route node:

1. calls the existing section-state transition;
2. updates the default object and live group;
3. pushes the URL;
4. updates the route active state;
5. commits the vignette and concept note;
6. preserves focus on the selected node.

### Keyboard

- Arrow Left / Right moves roving focus.
- Home / End moves to the first or last section.
- Enter / Space activates through the native button.
- Focus and selected state must remain visually distinct.

### History

Direct URL load, click, `history.back()`, and `history.forward()` must restore the same section, object group, route node, concept note, vignette, and scroll visibility.

## Responsive contract

### Desktop

- Hero copy and concept vignette may form two columns.
- The four sequence nodes should be visible without horizontal overflow.
- The route must read as a connected model, not four independent pills.

### 390px and 320px

- Route remains a horizontally scrollable control.
- The active node is fully visible with an edge inset.
- Existing left/right overflow cues remain available.
- The vignette stacks below the hero copy and stays within the document width.
- Touch targets remain at least 44px high.
- Hover preview is not required on touch-only interaction.

## Accessibility

- Route root uses `role="tablist"` and a clear accessible label.
- Each node is a button with `role="tab"`, roving `tabindex`, and `aria-selected`.
- SVG route lines and vignette are `aria-hidden` because equivalent text is present.
- Concept copy uses `aria-live="polite"` for committed changes; hover previews must not create excessive announcements.
- Reduced-motion mode removes transitions but preserves all final geometry and state changes.

## Implementation modules

### New

- `research-history/catalog/model-diagram-presentations.mjs`
- `research-history/model-route-diagram.mjs`
- `research-history/model-concept-vignette.mjs`
- `scripts/archive/validate-model-diagram-presentations.mjs`
- `scripts/archive/validate-model-route-browser.mjs`

### Updated

- `research-history/models/index.html`
- `research-history/model-page.mjs`
- `research-history/model-page-workbench.css`
- `research-history/model-live-board.mjs`
- `scripts/archive/run-archive-validators.mjs`
- `.github/workflows/validate.yml`

## Validation

### Static validator

The presentation validator fails closed when:

- a presentation references an unknown model or section;
- a canonical section is omitted from a configured model;
- the presentation attempts to define object IDs or canonical ordering;
- `kind`, `motif`, or `vignette.type` is unknown;
- labels or notes are empty;
- parameters do not match the known vignette schema.

### Fake-DOM / renderer contract

Verify:

- Horizontal Navigation receives the sequence presentation;
- fallback models still render their normal section controls;
- the generic `已選取` role is absent;
- study, correction, and comparison roles remain;
- route click invokes the same state transition as the previous tab control.

### Real Chrome contract

At minimum:

1. Horizontal Navigation / Spread at 1792px:
   - sequence signature and four nodes;
   - Spread active;
   - expanded-band vignette;
   - `08 / 08A` live cards;
   - no document overflow.
2. Hover Fisheye:
   - vignette and concept note preview;
   - URL, active section, and live cards unchanged;
   - pointer leave restores Spread.
3. Click Fisheye:
   - URL, active node, note, vignette, and `10 / 10A` commit;
   - selected node remains focused.
4. Back / forward:
   - complete state restoration in both directions.
5. 390px and 320px:
   - active node visible;
   - route scroll and overflow cues correct;
   - vignette and document remain within viewport.
6. Reduced motion:
   - identical final states without transition dependence.

## Delivery phases

### Phase 0 — cleanup and contract

- remove `已選取`;
- add the plan and presentation contract;
- add static validation.

### Phase 1 — Horizontal Sequence MVP

- implement sequence route;
- implement the four Horizontal vignettes;
- add preview, click, keyboard, history, and responsive behavior;
- add real Chrome coverage.

### Phase 2 — Landscape Branch

- add branch topology and paper-surface vignettes;
- keep mobile fallback linear while retaining branch semantics.

### Phase 3 — Paper Field

- add field topology and projection/neighbourhood vignettes.

### Phase 4 — Parallel and consolidation

- add parallel topology;
- apply presentation contracts to remaining models;
- extract shared browser/CDP helpers after behavior stabilizes.

## MVP completion boundary

The first PR is complete when:

- the plan is committed;
- `已選取` is removed without removing semantic roles;
- Horizontal Navigation has a programmatic hero vignette and sequence route;
- route navigation fully replaces the old Horizontal tabs without duplicating controls;
- other models retain their current section navigation;
- direct load, hover preview, click, keyboard, back, forward, 320px, 390px, desktop, and reduced-motion contracts pass;
- canonical catalog, prototype code, object grouping, and pooled iframe identity remain unchanged.
