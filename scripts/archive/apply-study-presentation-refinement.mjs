import { readFile, writeFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");
const write = (path, content) => writeFile(path, content, "utf8");

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one exact match, found ${count}.`);
  return source.replace(before, after);
};

const replacePatternOnce = (source, pattern, after, label) => {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)) ?? [];
  if (matches.length !== 1) throw new Error(`${label}: expected one pattern match, found ${matches.length}.`);
  return source.replace(pattern, after);
};

await write("research-history/catalog/study-presentations.mjs", `export const studyPresentations = Object.freeze({
  "12A-S1": Object.freeze({
    method: "盲測比較",
    cardMeta: "盲測比較 · 12 / 12A",
    subjectLabel: "比較對象",
    subjectIds: Object.freeze(["12", "12A"]),
    boundaryLabel: "判讀限制",
    boundary: "研究工具是否可執行，不等於其中任何 prototype 已獲採用。",
  }),
  "25P-S1": Object.freeze({
    method: "陌生讀者任務",
    cardMeta: "陌生讀者任務 · 25P",
    subjectLabel: "受測物件",
    subjectIds: Object.freeze(["25P"]),
    boundaryLabel: "前置條件與判讀",
    boundary: "25P-L1 是執行研究前的可讀性修正，不是另一個比較條件；研究結果不直接授權 25PA。",
  }),
});
`);

{
  const path = "research-history/model-page.mjs";
  let source = await read(path);
  source = replaceOnce(
    source,
    'import { designModels, modelById, presentationNotes } from "./catalog/presentation-models.mjs";\n',
    'import { designModels, modelById, presentationNotes } from "./catalog/presentation-models.mjs";\nimport { studyPresentations } from "./catalog/study-presentations.mjs";\n',
    "model-page study metadata import",
  );
  source = replaceOnce(
    source,
    '  selectionSummary: requiredElement("#selection-summary"),\n  selectionLabel: requiredElement("#selection-label"),\n',
    "",
    "model-page redundant selection elements",
  );
  source = replacePatternOnce(
    source,
    /const evidenceTargetIds = [\s\S]*?\nconst canCompareWithParent/,
    `const cardPresentation = (object) => {
  if (object.objectType === "study") {
    const presentation = studyPresentations[object.id];
    return {
      title: objectLabel(object),
      meta: presentation?.cardMeta ?? "研究流程",
    };
  }
  if (object.objectType === "correction") {
    return { title: objectLabel(object), meta: "" };
  }
  return { title: objectLabel(object), meta: "" };
};

const canCompareWithParent`,
    "model-page card presentation",
  );
  source = replaceOnce(
    source,
    `  const comparing = viewMode === "compare";
  elements.selectionSummary.hidden = viewMode !== "all";
  elements.selectionLabel.textContent = objectLabel(object);
  elements.objectPicker.hidden = viewMode === "all";
  elements.compareParent.hidden = !canCompare || viewMode === "all";
  elements.compareParent.disabled = !canCompare;
  elements.compareParent.setAttribute("aria-pressed", String(comparing));
  elements.compareParent.textContent = comparing ? "結束比較" : "與 " + (parent?.id ?? "parent") + " 比較";
`,
    `  const comparing = viewMode === "compare";
  elements.objectPicker.hidden = viewMode === "all";
  elements.compareParent.hidden = !canCompare || viewMode === "all";
  elements.compareParent.disabled = !canCompare;
  elements.compareParent.textContent = comparing ? "結束比較" : "與 " + (parent?.id ?? "parent") + " 比較";
`,
    "model-page toolbar semantics",
  );
  await write(path, source);
}

{
  const path = "research-history/model-object-inspector.mjs";
  let source = await read(path);
  source = replaceOnce(
    source,
    'const asArray = (value) => Array.isArray(value) ? value : [];\n',
    'import { studyPresentations } from "./catalog/study-presentations.mjs";\n\nconst asArray = (value) => Array.isArray(value) ? value : [];\n',
    "inspector study metadata import",
  );
  source = replacePatternOnce(
    source,
    /    if \(object\.objectType === "study"\) \{[\s\S]*?\n    \}\n\n    if \(object\.objectType === "correction"\) \{/,
    `    if (object.objectType === "study") {
      const presentation = studyPresentations[object.id];
      const subjectIds = presentation?.subjectIds
        ?? asArray(object.evidenceFor).filter((id) => objectById.has(id));
      return {
        eyebrow: "研究工具",
        variable: presentation?.method ?? "研究流程",
        beforeLabel: presentation?.subjectLabel ?? "研究對象",
        before: describeReferences(subjectIds) || parent?.summary || "尚未記錄研究對象。",
        afterLabel: "研究流程",
        after: object.summary,
        unchangedLabel: presentation?.boundaryLabel ?? "判讀限制",
        unchanged: presentation?.boundary
          ?? "研究工具是否可執行，不等於其中任何 prototype 已獲採用。",
      };
    }

    if (object.objectType === "correction") {`,
    "inspector study semantics",
  );
  source = replaceOnce(
    source,
    `    elements.title.textContent = object.objectType === "study"
      ? object.id + " · 研究工具"
      : (object.objectType === "correction" ? object.id + " · 必要修正" : objectLabel(object));
`,
    `    elements.title.textContent = objectLabel(object);
`,
    "inspector identity title",
  );
  await write(path, source);
}

{
  const path = "research-history/models/index.html";
  let source = await read(path);
  source = replaceOnce(
    source,
    `            <p id="selection-summary" class="model-selection-summary">
              <span>已選取</span>
              <strong id="selection-label"></strong>
            </p>
`,
    "",
    "HTML redundant selected summary",
  );
  source = replaceOnce(
    source,
    '<button id="compare-parent" class="model-compare-action" type="button" aria-pressed="false" hidden>與 parent 比較</button>',
    '<button id="compare-parent" class="model-compare-action" type="button" hidden>與 parent 比較</button>',
    "HTML comparison action semantics",
  );
  await write(path, source);
}

{
  const path = "research-history/model-page-workbench.css";
  let source = await read(path);
  source = replacePatternOnce(
    source,
    /\n\.model-selection-summary \{[\s\S]*?\n\}\n\n\.model-object-picker \{/,
    "\n.model-object-picker {",
    "CSS redundant selection summary",
  );
  source = replaceOnce(
    source,
    `
  .model-selection-summary {
    padding-block: .2rem;
  }
`,
    "",
    "CSS mobile selection summary",
  );
  await write(path, source);
}

{
  const path = "scripts/archive/validate-model-page-renderer.mjs";
  let source = await read(path);
  source = replaceOnce(
    source,
    '  "section-summary", "selection-summary", "selection-label", "object-picker", "object-select",\n',
    '  "section-summary", "object-picker", "object-select",\n',
    "validator element ids",
  );
  source = replaceOnce(
    source,
    `  if (selectors.get("#selection-summary").hidden
    || selectors.get("#selection-label").textContent !== "18B · Semantic Zoom"
    || !selectors.get("#object-picker").hidden
    || !selectors.get("#compare-parent").hidden) {
    throw new Error("Full-group view must show a plain selected-object summary without parent controls.");
  }
`,
    `  if (!selectors.get("#object-picker").hidden || !selectors.get("#compare-parent").hidden) {
    throw new Error("Full-group view must avoid duplicate selected-object and parent controls.");
  }
`,
    "validator full-group controls",
  );
  source = replaceOnce(
    source,
    `  if (selectors.get("#inspector-role").textContent !== "研究工具"
    || selectors.get("#inspector-object-title").textContent !== "12A-S1 · 研究工具") {
    throw new Error("Study objects must use a distinct research-tool presentation.");
  }
  const studyCard = selectors.get("#all-live-board").children.find((card) => card.dataset.objectId === "12A-S1");
  if (studyCard?.querySelector(".model-live-card__meta")?.textContent !== "比較 12 / 12A") {
    throw new Error("Study cards must name their compared objects instead of resembling a normal variant.");
  }
`,
    `  if (selectors.get("#inspector-role").textContent !== "研究工具"
    || selectors.get("#inspector-object-title").textContent !== "12A-S1 · Blinded Reader Comparison"
    || selectors.get("#difference-variable").textContent !== "盲測比較") {
    throw new Error("12A-S1 must retain its identity and explicit blinded-comparison method.");
  }
  const studyCard = selectors.get("#all-live-board").children.find((card) => card.dataset.objectId === "12A-S1");
  if (studyCard?.querySelector(".model-live-card__select strong")?.textContent !== "12A-S1 · Blinded Reader Comparison"
    || studyCard?.querySelector(".model-live-card__meta")?.textContent !== "盲測比較 · 12 / 12A") {
    throw new Error("12A-S1 card must separate research-tool role, object identity, and protocol metadata.");
  }

  modelSelect.value = "depth-projection";
  modelSelect.dispatch("change");
  selectors.get("#object-select").value = "25P-S1";
  selectors.get("#object-select").dispatch("change");
  const depthStudyCard = selectors.get("#all-live-board").children.find((card) => card.dataset.objectId === "25P-S1");
  if (selectors.get("#inspector-object-title").textContent !== "25P-S1 · Unfamiliar-reader Study"
    || selectors.get("#difference-variable").textContent !== "陌生讀者任務"
    || selectors.get("#difference-before").textContent.includes("25P-L1")
    || !selectors.get("#difference-unchanged").textContent.includes("25P-L1")
    || depthStudyCard?.querySelector(".model-live-card__meta")?.textContent !== "陌生讀者任務 · 25P") {
    throw new Error("25P-S1 must describe one study condition with L1 as a prerequisite, not a blind comparison.");
  }
`,
    "validator explicit study semantics",
  );
  source = replaceOnce(source, '    ".model-selection-summary",\n', "", "validator removed summary CSS contract");
  await write(path, source);
}

{
  const path = "scripts/archive/capture-model-page-review.mjs";
  let source = await read(path);
  source = replaceOnce(
    source,
    `      currentCount: cards.filter((card) => card.dataset.current === 'true').length,
      workbenchWidth: document.querySelector('.model-workbench-shell').getBoundingClientRect().width,
`,
    `      currentCount: cards.filter((card) => card.dataset.current === 'true').length,
      selectionSummaryPresent: Boolean(document.querySelector('#selection-summary')),
      workbenchWidth: document.querySelector('.model-workbench-shell').getBoundingClientRect().width,
`,
    "browser review duplicate summary metric",
  );
  source = replaceOnce(
    source,
    `      inspectorBelow: document.querySelector('#inspector').getBoundingClientRect().top
        > board.getBoundingClientRect().bottom - 4,
`,
    `      inspectorBelow: document.querySelector('#inspector').getBoundingClientRect().top
        > board.getBoundingClientRect().bottom - 4,
      compareToggleAttribute: document.querySelector('#compare-parent').hasAttribute('aria-pressed'),
`,
    "browser review comparison action metric",
  );
  source = replaceOnce(
    source,
    `      sourceText: document.querySelector('#inspector-records').textContent.includes('研究工具'),
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
`,
    `      sourceText: document.querySelector('#inspector-records').textContent.includes('研究工具'),
      inspectorTitle: document.querySelector('#inspector-object-title').textContent,
      method: document.querySelector('#difference-variable').textContent,
      cardTitle: visibleCard.querySelector('.model-live-card__select strong').textContent,
      cardMeta: visibleCard.querySelector('.model-live-card__meta').textContent,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
`,
    "browser review study identity metrics",
  );
  source = replaceOnce(
    source,
    `  cases.push({ name: "paper-field-390-inspector-tabs", width: 390, height: 1000, metrics: studyMetrics });
  await capture(client, "paper-field-390-inspector-tabs.png");

  const failures = [];
`,
    `  cases.push({ name: "paper-field-390-inspector-tabs", width: 390, height: 1000, metrics: studyMetrics });
  await capture(client, "paper-field-390-inspector-tabs.png");

  const taskStudyPath = "/models/?model=depth-projection&section=projection-lens&variant=25P-S1&viewport=390&view=focus";
  await navigate(client, taskStudyPath, 390);
  await waitForVisibleBoard(client, 1);
  const taskStudyMetrics = await evaluate(client, ` + "`" + `(() => {
    const visibleCard = document.querySelector('.model-live-card:not([hidden])');
    return {
      inspectorTitle: document.querySelector('#inspector-object-title').textContent,
      method: document.querySelector('#difference-variable').textContent,
      subject: document.querySelector('#difference-before').textContent,
      boundary: document.querySelector('#difference-unchanged').textContent,
      cardMeta: visibleCard.querySelector('.model-live-card__meta').textContent,
    };
  })()` + "`" + `);
  cases.push({ name: "depth-390-task-study", width: 390, height: 1000, metrics: taskStudyMetrics });

  const failures = [];
`,
    "browser review 25P study metrics",
  );
  source = replaceOnce(
    source,
    `    || mobile.currentCount !== 1 || !mobile.resizedState || !mobile.focusReuse || !mobile.allReuse
`,
    `    || mobile.currentCount !== 1 || mobile.selectionSummaryPresent
    || !mobile.resizedState || !mobile.focusReuse || !mobile.allReuse
`,
    "browser review no duplicate summary assertion",
  );
  source = replaceOnce(
    source,
    `    || !compareMetrics.currentReused || !compareMetrics.parentReused
    || compareMetrics.documentOverflow || !compareMetrics.inspectorBelow) {
`,
    `    || !compareMetrics.currentReused || !compareMetrics.parentReused
    || compareMetrics.documentOverflow || !compareMetrics.inspectorBelow
    || compareMetrics.compareToggleAttribute) {
`,
    "browser review action button assertion",
  );
  source = replaceOnce(
    source,
    `  if (!studyMetrics.compareHidden || !studyMetrics.focusVisible || !studyMetrics.liveReady
    || !studyMetrics.relationVisible || !studyMetrics.recordsVisible || !studyMetrics.sourceText
    || studyMetrics.documentOverflow) {
    failures.push("Study and inspector-tab boundary failed.");
  }
`,
    `  if (!studyMetrics.compareHidden || !studyMetrics.focusVisible || !studyMetrics.liveReady
    || !studyMetrics.relationVisible || !studyMetrics.recordsVisible || !studyMetrics.sourceText
    || studyMetrics.inspectorTitle !== "12A-S1 · Blinded Reader Comparison"
    || studyMetrics.method !== "盲測比較"
    || studyMetrics.cardTitle !== "12A-S1 · Blinded Reader Comparison"
    || studyMetrics.cardMeta !== "盲測比較 · 12 / 12A"
    || studyMetrics.documentOverflow) {
    failures.push("12A-S1 identity and blinded-comparison presentation failed.");
  }
  if (taskStudyMetrics.inspectorTitle !== "25P-S1 · Unfamiliar-reader Study"
    || taskStudyMetrics.method !== "陌生讀者任務"
    || !taskStudyMetrics.subject.includes("25P") || taskStudyMetrics.subject.includes("25P-L1")
    || !taskStudyMetrics.boundary.includes("25P-L1")
    || taskStudyMetrics.cardMeta !== "陌生讀者任務 · 25P") {
    failures.push("25P-S1 task-study presentation incorrectly implies a blind comparison.");
  }
`,
    "browser review explicit study assertions",
  );
  await write(path, source);
}

console.log("Applied explicit study presentation, identity, and toolbar semantics refinement.");
