import { readFile, writeFile } from "node:fs/promises";

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}.`);
  return source.replace(before, after);
};

const update = async (path, transform) => {
  const source = await readFile(path, "utf8");
  const next = transform(source);
  if (next === source) throw new Error(`${path}: transform made no changes.`);
  await writeFile(path, next);
};

await update("research-history/models/index.html", (source) => replaceOnce(source, `        <div class="model-toolbar" aria-label="研究物件顯示設定">
          <div class="model-toolbar__group" aria-label="觀察模式">
            <span>顯示</span>
            <button id="view-all" type="button" data-view-mode="all" aria-pressed="true">本組全部</button>
            <button id="view-focus" type="button" data-view-mode="focus" aria-pressed="false">單張</button>
            <button id="compare-parent" type="button" data-view-mode="compare" aria-pressed="false">Parent</button>
          </div>

          <div class="model-toolbar__group" aria-label="Viewport 尺寸">
            <span>寬度</span>
            <button type="button" data-viewport="320" aria-pressed="false">320</button>
            <button type="button" data-viewport="390" aria-pressed="true">390</button>
            <button type="button" data-viewport="desktop" aria-pressed="false">1024</button>
          </div>

          <label class="model-object-picker">
            <span>目前物件</span>
            <select id="object-select" aria-label="切換目前研究物件"></select>
          </label>
        </div>`, `        <div class="model-toolbar" aria-label="研究物件顯示設定">
          <div class="model-toolbar__group" aria-label="檢視範圍">
            <span>檢視</span>
            <button id="view-all" type="button" data-view-mode="all" aria-pressed="true">整組</button>
            <button id="view-focus" type="button" data-view-mode="focus" aria-pressed="false">選取</button>
          </div>

          <div class="model-toolbar__group" aria-label="Viewport 尺寸">
            <span>寬度</span>
            <button type="button" data-viewport="320" aria-pressed="false">320</button>
            <button type="button" data-viewport="390" aria-pressed="true">390</button>
            <button type="button" data-viewport="desktop" aria-pressed="false">1024</button>
          </div>

          <div class="model-toolbar__selection">
            <p id="selection-summary" class="model-selection-summary">
              <span>已選取</span>
              <strong id="selection-label"></strong>
            </p>
            <label id="object-picker" class="model-object-picker" hidden>
              <span>選取物件</span>
              <select id="object-select" aria-label="切換選取的研究物件"></select>
            </label>
            <button id="compare-parent" class="model-compare-action" type="button" aria-pressed="false" hidden>與 parent 比較</button>
          </div>
        </div>`, "toolbar markup"));

await update("research-history/model-page.mjs", (source) => {
  source = replaceOnce(source, `  sectionSummary: requiredElement("#section-summary"),
  objectSelect: requiredElement("#object-select"),`, `  sectionSummary: requiredElement("#section-summary"),
  selectionSummary: requiredElement("#selection-summary"),
  selectionLabel: requiredElement("#selection-label"),
  objectPicker: requiredElement("#object-picker"),
  objectSelect: requiredElement("#object-select"),`, "toolbar elements");

  source = replaceOnce(source, `const variantStateLabel = (object) => {
  if (stoppedDispositions.has(object.disposition)) return "stopped";
  if (object.objectType === "study") return "study";
  if (object.objectType === "correction") return "correction";
  return dispositionLabels[object.disposition] ?? object.disposition;
};

const canCompareWithParent`, `const variantStateLabel = (object) => {
  if (stoppedDispositions.has(object.disposition)) return "stopped";
  if (object.objectType === "study") return "study";
  if (object.objectType === "correction") return "correction";
  return dispositionLabels[object.disposition] ?? object.disposition;
};

const shortSectionLabels = Object.freeze({
  baseline: "完整基準",
  "ledger-density": "Ledger",
  "market-baseline": "市場基準",
  spread: "分類 Spread",
  ribbon: "料理 Ribbon",
  fisheye: "Fisheye",
  "semantic-information": "固定紙面",
  "stopped-lenses": "局部鏡頭",
  "elastic-geometry": "彈性幾何",
  core: "共同母體",
  "reading-grammar": "閱讀文法",
  "focus-geometry": "焦點幾何",
  "reading-surface": "閱讀表面",
  "vertical-writing": "直排",
});

const sectionTabLabel = (section) => shortSectionLabels[section.id] ?? section.title;
const evidenceTargetIds = (object) => (Array.isArray(object.evidenceFor) ? object.evidenceFor : [])
  .filter((id) => objectById.has(id));
const cardPresentation = (object) => {
  if (object.objectType === "study") {
    const targets = evidenceTargetIds(object);
    return {
      title: `${object.id} · 研究工具`,
      meta: targets.length ? `比較 ${targets.join(" / ")}` : displayTitle(object),
    };
  }
  if (object.objectType === "correction") {
    return { title: `${object.id} · 必要修正`, meta: displayTitle(object) };
  }
  return { title: objectLabel(object), meta: "" };
};

const canCompareWithParent`, "presentation helpers");

  source = replaceOnce(source, `  syncSurface,
  onSelect: (object) => {`, `  syncSurface,
  cardPresentation,
  onSelect: (object) => {`, "board presentation callback");

  source = replaceOnce(source, `    button.textContent = candidate.title;`, `    button.textContent = sectionTabLabel(candidate);
    button.title = candidate.title;`, "short section labels");

  source = replaceOnce(source, `  elements.compareParent.hidden = !canCompare;
  elements.compareParent.disabled = !canCompare;
  for (const button of viewModeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.viewMode === viewMode));
  }
  for (const button of viewportButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.viewport === viewport));
  }
  elements.board.dataset.viewport = viewport;
  elements.viewportNote.textContent = viewMode === "all"
    ? `${viewportLabel()} 原尺寸並排；整個操作板共用一條水平捲動。`
    : `${viewportLabel()} 原尺寸操作；切換模式與寬度不會重載研究物件。`;
  return { parent, canCompare, viewMode };`, `  const comparing = viewMode === "compare";
  elements.selectionSummary.hidden = viewMode !== "all";
  elements.selectionLabel.textContent = objectLabel(object);
  elements.objectPicker.hidden = viewMode === "all";
  elements.compareParent.hidden = !canCompare || viewMode === "all";
  elements.compareParent.disabled = !canCompare;
  elements.compareParent.setAttribute("aria-pressed", String(comparing));
  elements.compareParent.textContent = comparing ? "結束比較" : `與 ${parent?.id ?? "parent"} 比較`;
  for (const button of viewModeButtons) {
    const selected = button.dataset.viewMode === "all" ? viewMode === "all" : viewMode !== "all";
    button.setAttribute("aria-pressed", String(selected));
  }
  for (const button of viewportButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.viewport === viewport));
  }
  elements.board.dataset.viewport = viewport;
  const needsViewportHint = viewport === "desktop";
  elements.viewportNote.hidden = !needsViewportHint;
  elements.viewportNote.textContent = needsViewportHint
    ? "1024px 畫面維持原尺寸，請橫向移動操作板。"
    : "";
  return { parent, canCompare, viewMode };`, "toolbar semantics");

  source = replaceOnce(source, `for (const button of viewModeButtons) {
  button.addEventListener("click", () => {
    state.setViewMode(button.dataset.viewMode);
    render({ historyMode: "push" });
  });
}

for (const button of viewportButtons)`, `for (const button of viewModeButtons) {
  button.addEventListener("click", () => {
    state.setViewMode(button.dataset.viewMode);
    render({ historyMode: "push" });
  });
}

elements.compareParent.addEventListener("click", () => {
  state.setViewMode(state.value.viewMode === "compare" ? "focus" : "compare");
  render({ historyMode: "push" });
});

for (const button of viewportButtons)`, "compare action listener");
  return source;
});

await update("research-history/model-live-board.mjs", (source) => {
  source = replaceOnce(source, `  setStatus,
  syncSurface,
  onSelect,`, `  setStatus,
  syncSurface,
  cardPresentation,
  onSelect,`, "board arguments");
  source = replaceOnce(source, `    const title = document.createElement("strong");
    select.append(title);`, `    const title = document.createElement("strong");
    const meta = document.createElement("small");
    meta.className = "model-live-card__meta";
    select.append(title, meta);`, "card metadata node");
  source = replaceOnce(source, `    const entry = { card, role, select, title, status, surface };`, `    const entry = { card, role, select, title, meta, status, surface };`, "card entry metadata");
  source = replaceOnce(source, `  const syncCard = (entry, object, active) => {
    entry.card.dataset.current = String(active);
    entry.select.setAttribute("aria-current", String(active));
    entry.title.textContent = objectLabel(object);
    setStatus(entry.status, object);
  };`, `  const syncCard = (entry, object, active) => {
    const presentation = cardPresentation(object);
    entry.card.dataset.current = String(active);
    entry.card.dataset.objectType = object.objectType;
    entry.select.setAttribute("aria-current", String(active));
    entry.title.textContent = presentation.title;
    entry.meta.textContent = presentation.meta;
    entry.meta.hidden = !presentation.meta;
    setStatus(entry.status, object);
  };`, "card presentation sync");
  source = replaceOnce(source, `      entry.role.hidden = viewMode !== "compare" || !visible;
      entry.role.textContent = isActive ? "目前" : (isParent ? "Parent" : "");`, `      let roleText = "";
      if (viewMode === "compare" && visible) {
        roleText = isActive ? "比較對象" : (isParent ? "比較基準" : "");
      } else if (object.objectType === "study") {
        roleText = "研究工具";
      } else if (object.objectType === "correction") {
        roleText = "必要修正";
      } else if (isActive) {
        roleText = "已選取";
      }
      entry.role.hidden = !roleText;
      entry.role.textContent = roleText;`, "card role semantics");
  return source;
});

await update("research-history/model-object-inspector.mjs", (source) => {
  source = replaceOnce(source, `    if (object.objectType === "study") {
      return {
        eyebrow: "研究工具",
        variable: "研究工具與證據範圍",
        beforeLabel: "研究對象",
        before: describeReferences(object.evidenceFor) || parent?.summary || "尚未記錄研究對象。",
        afterLabel: "研究工具",
        after: object.summary,
        unchangedLabel: "證據邊界",
        unchanged: "研究就緒與執行結果不直接代表 prototype 已獲採用。",
      };
    }`, `    if (object.objectType === "study") {
      const targetIds = asArray(object.evidenceFor).filter((id) => objectById.has(id));
      return {
        eyebrow: "研究工具",
        variable: targetIds.length ? `${targetIds.join(" / ")} 盲測` : "比較研究流程",
        beforeLabel: "比較對象",
        before: describeReferences(object.evidenceFor) || parent?.summary || "尚未記錄比較對象。",
        afterLabel: "研究流程",
        after: object.summary,
        unchangedLabel: "判讀限制",
        unchanged: "研究工具是否可執行，不等於其中任何 prototype 已獲採用。",
      };
    }`, "study inspector copy");
  source = replaceOnce(source, `    elements.role.textContent = differenceCopy(context).eyebrow;
    elements.title.textContent = objectLabel(object);`, `    elements.role.textContent = differenceCopy(context).eyebrow;
    elements.title.textContent = object.objectType === "study"
      ? `${object.id} · 研究工具`
      : (object.objectType === "correction" ? `${object.id} · 必要修正` : objectLabel(object));`, "study inspector title");
  return source;
});

await update("research-history/model-page-workbench.css", (source) => {
  source = replaceOnce(source, `  grid-template-columns: minmax(0, auto) minmax(18rem, 1fr);
  gap: .75rem 1.5rem;
  align-items: end;`, `  grid-template-columns: minmax(0, 1fr);
  gap: .5rem;
  align-items: start;`, "section strip layout");
  source = replaceOnce(source, `  overflow-x: auto;
  padding-bottom: .1rem;
  scrollbar-gutter: stable;`, `  overflow-x: auto;
  padding-bottom: .1rem;
  scrollbar-width: none;`, "section tabs scrollbar");
  source = replaceOnce(source, `.model-section-tabs button[aria-selected="true"],
.model-toolbar button[aria-pressed="true"],
.model-inspector-tabs button[aria-selected="true"] {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--paper);
}`, `.model-section-tabs::-webkit-scrollbar {
  display: none;
}

.model-section-tabs button[aria-selected="true"] {
  border-color: transparent transparent var(--accent);
  background: transparent;
  color: var(--ink);
}

.model-toolbar button[aria-pressed="true"],
.model-inspector-tabs button[aria-selected="true"] {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--paper);
}`, "selected tab styling");
  source = replaceOnce(source, `.model-object-picker {
  display: grid;
  grid-template-columns: auto minmax(12rem, 20rem);
  gap: .4rem;
  align-items: center;
  margin-left: auto;
}`, `.model-toolbar__selection {
  display: flex;
  min-width: 0;
  gap: .55rem;
  align-items: center;
  margin-left: auto;
}

.model-selection-summary {
  display: flex;
  min-width: 0;
  gap: .45rem;
  align-items: baseline;
  margin: 0;
}

.model-selection-summary > span {
  color: var(--faint);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: .63rem;
}

.model-selection-summary > strong {
  overflow: hidden;
  max-width: 28rem;
  font-size: .78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-object-picker {
  display: grid;
  grid-template-columns: auto minmax(12rem, 18rem);
  gap: .4rem;
  align-items: center;
}

.model-compare-action {
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}`, "selection toolbar layout");
  source = replaceOnce(source, `.model-live-card__select strong {
  display: block;`, `.model-live-card__select strong {
  display: block;`, "card title anchor");
  source = replaceOnce(source, `.model-live-card > header > .status {
  justify-self: start;
}`, `.model-live-card__meta {
  display: block;
  overflow: hidden;
  margin-top: .2rem;
  color: var(--muted);
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: .66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-live-card[data-object-type="study"] {
  border-top-style: double;
  background: color-mix(in srgb, var(--surface) 86%, var(--paper));
}

.model-live-card[data-object-type="study"] > header {
  background: color-mix(in srgb, var(--surface) 72%, var(--paper));
}

.model-live-card > header > .status {
  justify-self: start;
}`, "card metadata styles");
  source = replaceOnce(source, `  .model-object-picker {
    grid-template-columns: auto minmax(10rem, 1fr);
    width: 100%;
    margin-left: 0;
  }`, `  .model-toolbar__selection {
    width: 100%;
    margin-left: 0;
  }

  .model-object-picker {
    grid-template-columns: auto minmax(10rem, 1fr);
    flex: 1 1 auto;
  }`, "tablet toolbar selection");
  source = replaceOnce(source, `  .model-object-picker {
    grid-template-columns: 1fr;
  }`, `  .model-toolbar__selection {
    align-items: stretch;
    flex-direction: column;
  }

  .model-selection-summary {
    padding-block: .2rem;
  }

  .model-object-picker {
    grid-template-columns: 1fr;
  }`, "mobile toolbar selection");
  return source;
});

await update("scripts/archive/validate-model-page-renderer.mjs", (source) => {
  source = replaceOnce(source, `  "section-summary", "object-select", "view-all", "view-focus", "compare-parent", "viewport-note",`, `  "section-summary", "selection-summary", "selection-label", "object-picker", "object-select",
  "view-all", "view-focus", "compare-parent", "viewport-note",`, "validator ids");
  source = replaceOnce(source, `const viewModeButtons = [
  [selectors.get("#view-all"), "all"],
  [selectors.get("#view-focus"), "focus"],
  [selectors.get("#compare-parent"), "compare"],
].map(([button, mode]) => {`, `const viewModeButtons = [
  [selectors.get("#view-all"), "all"],
  [selectors.get("#view-focus"), "focus"],
].map(([button, mode]) => {`, "validator view buttons");
  source = replaceOnce(source, `  if (lastUrl?.includes("view=") || lastUrl?.includes("compare=")) {
    throw new Error("The default all-object URL must remain canonical.");
  }

  currentFrame.reviewMarker`, `  if (lastUrl?.includes("view=") || lastUrl?.includes("compare=")) {
    throw new Error("The default all-object URL must remain canonical.");
  }
  if (selectors.get("#selection-summary").hidden
    || selectors.get("#selection-label").textContent !== "18B · Semantic Zoom"
    || !selectors.get("#object-picker").hidden
    || !selectors.get("#compare-parent").hidden) {
    throw new Error("Full-group view must show a plain selected-object summary without parent controls.");
  }

  currentFrame.reviewMarker`, "all mode selection contract");
  source = replaceOnce(source, `  if (board.dataset.viewMode !== "focus" || focusCards.length !== 1
    || focusFrame !== currentFrame || focusFrame.reviewMarker !== "pool-preserved") {
    throw new Error("Focus mode must filter the canonical board without moving or recreating its iframe.");
  }`, `  if (board.dataset.viewMode !== "focus" || focusCards.length !== 1
    || focusFrame !== currentFrame || focusFrame.reviewMarker !== "pool-preserved"
    || selectors.get("#object-picker").hidden
    || selectors.get("#compare-parent").hidden
    || selectors.get("#compare-parent").textContent !== "與 18 比較") {
    throw new Error("Selected-object view must reveal its picker and concrete comparison action without recreating the iframe.");
  }`, "focus toolbar contract");
  source = replaceOnce(source, `  if (board.dataset.viewMode !== "compare" || compareCards.length !== 2
    || compareCurrent !== currentFrame || compareParent !== parentFrame
    || compareParent.reviewMarker !== "parent-preserved") {
    throw new Error("Parent mode must filter two canonical board cards without moving their iframes.");
  }`, `  const compareRoles = compareCards.map((card) => card.querySelector(".model-live-card__role")?.textContent);
  if (board.dataset.viewMode !== "compare" || compareCards.length !== 2
    || compareCurrent !== currentFrame || compareParent !== parentFrame
    || compareParent.reviewMarker !== "parent-preserved"
    || selectors.get("#compare-parent").textContent !== "結束比較"
    || !compareRoles.includes("比較對象") || !compareRoles.includes("比較基準")) {
    throw new Error("Concrete comparison must label its object and baseline without using current/Parent ambiguity.");
  }`, "compare semantics contract");
  source = replaceOnce(source, `  if (selectors.get("#inspector-role").textContent !== "研究工具") {
    throw new Error("Study objects must retain their research-tool role.");
  }`, `  if (selectors.get("#inspector-role").textContent !== "研究工具"
    || selectors.get("#inspector-object-title").textContent !== "12A-S1 · 研究工具") {
    throw new Error("Study objects must use a distinct research-tool presentation.");
  }
  const studyCard = selectors.get("#all-live-board").children.find((card) => card.dataset.objectId === "12A-S1");
  if (studyCard?.querySelector(".model-live-card__meta")?.textContent !== "比較 12 / 12A") {
    throw new Error("Study cards must name their compared objects instead of resembling a normal variant.");
  }`, "study card contract");
  source = replaceOnce(source, `    ".model-object-inspector",
    "#inspector-panel-summary",`, `    ".model-object-inspector",
    ".model-selection-summary",
    'data-object-type="study"',
    "#inspector-panel-summary",`, "css semantics contracts");
  return source;
});

console.log("Applied model toolbar and study-card semantics refinement.");
