import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const read = (path) => readFile(path, "utf8");
const write = (path, content) => writeFile(path, content, "utf8");

const replaceExact = (content, before, after, label) => {
  if (!content.includes(before)) throw new Error(`Could not find ${label}.`);
  return content.replace(before, after);
};

const replaceRange = (content, startMarker, endMarker, replacement, label) => {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`Could not find ${label}.`);
  return `${content.slice(0, start)}${replacement}${content.slice(end)}`;
};

const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
if (branch !== "agent/section-route-diagram-mvp") {
  throw new Error(`Refusing to apply route MVP on unexpected branch ${branch}.`);
}

{
  const path = "research-history/models/index.html";
  let content = await read(path);
  content = replaceExact(
    content,
    '    <link rel="stylesheet" href="../model-page-workbench.css" />\n',
    '    <link rel="stylesheet" href="../model-page-workbench.css" />\n    <link rel="stylesheet" href="../model-route-diagram.css" />\n',
    "route stylesheet link",
  );
  content = replaceExact(
    content,
    '        </div>\n\n        <details class="model-definition-disclosure">',
    `        </div>\n\n        <aside id="model-concept" class="model-concept" hidden>\n          <div class="model-concept__copy">\n            <p id="model-diagram-signature" class="eyebrow"></p>\n            <p id="model-diagram-statement" class="model-concept__statement"></p>\n          </div>\n          <div id="model-concept-vignette" class="model-concept-vignette" aria-hidden="true"></div>\n        </aside>\n\n        <details class="model-definition-disclosure">`,
    "hero concept panel",
  );
  content = replaceExact(
    content,
    `        <div class="model-section-strip">\n          <div id="section-tabs" class="model-section-tabs" role="tablist" aria-label="切換子研究"></div>\n          <p id="section-summary"></p>\n        </div>`,
    `        <div class="model-section-strip">\n          <p class="model-section-strip__eyebrow eyebrow">Research route</p>\n          <div id="section-tabs" class="model-section-tabs" role="tablist" aria-label="切換研究方向"></div>\n          <p class="model-route__current"><strong id="section-current-label"></strong><span id="section-summary"></span></p>\n        </div>`,
    "route diagram container",
  );
  await write(path, content);
}

{
  const path = "research-history/model-live-board.mjs";
  let content = await read(path);
  content = replaceExact(
    content,
    `      } else if (object.objectType === "correction") {\n        roleText = "必要修正";\n      } else if (isActive) {\n        roleText = "已選取";\n      }`,
    `      } else if (object.objectType === "correction") {\n        roleText = "必要修正";\n      }`,
    "generic selected card role",
  );
  await write(path, content);
}

{
  const path = "scripts/archive/run-archive-validators.mjs";
  let content = await read(path);
  content = replaceExact(
    content,
    'await import("./validate-study-presentations.mjs");\n',
    'await import("./validate-study-presentations.mjs");\nawait import("./validate-model-diagram-presentations.mjs");\n',
    "model diagram validator registration",
  );
  await write(path, content);
}

{
  const path = ".github/workflows/validate.yml";
  let content = await read(path);
  content = replaceExact(
    content,
    '          BROWSER_BIN="$BROWSER_BIN" node scripts/archive/validate-section-tabs-browser.mjs\n',
    '          BROWSER_BIN="$BROWSER_BIN" node scripts/archive/validate-section-tabs-browser.mjs\n          BROWSER_BIN="$BROWSER_BIN" node scripts/archive/validate-model-route-browser.mjs\n',
    "model route browser validation step",
  );
  await write(path, content);
}

{
  const path = "research-history/model-page.mjs";
  let content = await read(path);
  content = replaceExact(
    content,
    'import { studyPresentations } from "./catalog/study-presentations.mjs";\n',
    'import { studyPresentations } from "./catalog/study-presentations.mjs";\nimport { modelDiagramPresentations } from "./catalog/model-diagram-presentations.mjs";\n',
    "diagram presentation import",
  );
  content = replaceExact(
    content,
    'import { createModelObjectInspector } from "./model-object-inspector.mjs";\n',
    'import { createModelObjectInspector } from "./model-object-inspector.mjs";\nimport { createModelRouteDiagram } from "./model-route-diagram.mjs";\nimport { createModelConceptVignette } from "./model-concept-vignette.mjs";\n',
    "diagram renderer imports",
  );
  content = replaceExact(
    content,
    '  modelStats: requiredElement("#model-stats"),\n',
    '  modelStats: requiredElement("#model-stats"),\n  modelConcept: requiredElement("#model-concept"),\n  modelDiagramSignature: requiredElement("#model-diagram-signature"),\n  modelDiagramStatement: requiredElement("#model-diagram-statement"),\n  modelConceptVignette: requiredElement("#model-concept-vignette"),\n',
    "concept elements",
  );
  content = replaceExact(
    content,
    '  sectionTabs: requiredElement("#section-tabs"),\n  sectionSummary: requiredElement("#section-summary"),\n',
    '  sectionTabs: requiredElement("#section-tabs"),\n  sectionCurrentLabel: requiredElement("#section-current-label"),\n  sectionSummary: requiredElement("#section-summary"),\n',
    "route current elements",
  );

  const diagramBlock = `const shortSectionLabels = Object.freeze({\n  baseline: "完整基準",\n  "ledger-density": "Ledger",\n  "market-baseline": "市場基準",\n  spread: "分類 Spread",\n  ribbon: "料理 Ribbon",\n  fisheye: "Fisheye",\n  "semantic-information": "固定紙面",\n  "stopped-lenses": "局部鏡頭",\n  "elastic-geometry": "彈性幾何",\n  core: "共同母體",\n  "reading-grammar": "閱讀文法",\n  "focus-geometry": "焦點幾何",\n  "reading-surface": "閱讀表面",\n  "vertical-writing": "直排",\n});\n\nconst sectionTabLabel = (section) => shortSectionLabels[section.id] ?? section.title;\n\nlet previewSection = null;\nconst diagramPresentationFor = (model) => modelDiagramPresentations[model.id] ?? null;\nconst vignette = createModelConceptVignette({ root: elements.modelConceptVignette });\n\nconst renderConcept = (section, { preview = false } = {}) => {\n  const presentation = diagramPresentationFor(state.value.model);\n  vignette.render({ presentation, sectionId: section.id, preview });\n};\n\nconst routeDiagram = createModelRouteDiagram({\n  root: elements.sectionTabs,\n  currentLabel: elements.sectionCurrentLabel,\n  currentNote: elements.sectionSummary,\n  labelForSection: sectionTabLabel,\n  onSelect: (section) => {\n    previewSection = null;\n    state.setSection(section);\n    render({ historyMode: "push", focusTarget: { kind: "section", id: section.id } });\n  },\n  onPreview: (section) => {\n    const presentation = diagramPresentationFor(state.value.model);\n    if (!presentation) return;\n    previewSection = section;\n    routeDiagram.preview({ section, presentation });\n    renderConcept(section, { preview: true });\n  },\n  onPreviewEnd: () => {\n    if (!previewSection) return;\n    previewSection = null;\n    const presentation = diagramPresentationFor(state.value.model);\n    routeDiagram.restore({ section: state.value.section, presentation });\n    renderConcept(state.value.section);\n  },\n});\n\n`;
  content = replaceRange(
    content,
    "const shortSectionLabels = Object.freeze({",
    "const cardPresentation = (object) => {",
    `${diagramBlock}const cardPresentation = (object) => {`,
    "section route renderer block",
  );

  content = replaceExact(
    content,
    '  elements.modelStats.textContent = `${model.sections.length} 組子研究 · ${objectCount} 個研究物件`;\n};',
    `  elements.modelStats.textContent = \`${'${model.sections.length}'} 組子研究 · ${'${objectCount}'} 個研究物件\`;\n  const presentation = diagramPresentationFor(model);\n  elements.modelConcept.hidden = !presentation;\n  elements.modelDiagramSignature.textContent = presentation?.signature ?? "";\n  elements.modelDiagramStatement.textContent = presentation?.statement ?? "";\n  renderConcept(previewSection ?? state.value.section, { preview: Boolean(previewSection) });\n};`,
    "model concept rendering",
  );

  content = replaceRange(
    content,
    "const renderSectionTabs = ({ model, section }) => {",
    "const renderObjectSelect = ({ section, object }) => {",
    `const renderSectionRoute = ({ model, section }) => {\n  const presentation = diagramPresentationFor(model);\n  routeDiagram.render({ model, section, presentation });\n};\n\nconst renderObjectSelect = ({ section, object }) => {`,
    "section route render function",
  );

  content = replaceExact(
    content,
    '    [...elements.sectionTabs.children]\n      .find((button) => button.dataset.sectionId === target.id)?.focus();',
    '    routeDiagram.getButtons()\n      .find((button) => button.dataset.sectionId === target.id)?.focus();',
    "nested route focus restoration",
  );
  content = replaceExact(
    content,
    '  renderSectionTabs(snapshot);\n',
    '  renderSectionRoute(snapshot);\n',
    "route render call",
  );
  content = replaceExact(
    content,
    'elements.modelSelect.addEventListener("change", () => {\n  const model = modelById.get(elements.modelSelect.value);',
    'elements.modelSelect.addEventListener("change", () => {\n  previewSection = null;\n  const model = modelById.get(elements.modelSelect.value);',
    "model-change preview reset",
  );
  content = replaceExact(
    content,
    'elements.sectionTabs.addEventListener("scroll", syncSectionTabOverflow, { passive: true });\nconst sectionTabsResizeObserver = typeof ResizeObserver === "function"\n  ? new ResizeObserver(syncSectionTabOverflow)\n  : null;\nsectionTabsResizeObserver?.observe(elements.sectionTabs);\n\n',
    "",
    "legacy section overflow ownership",
  );
  content = replaceExact(
    content,
    'window.addEventListener?.("popstate", () => {\n  state.replaceFromLocation();',
    'window.addEventListener?.("popstate", () => {\n  previewSection = null;\n  state.replaceFromLocation();',
    "history preview reset",
  );
  await write(path, content);
}

execFileSync("git", ["config", "user.name", "github-actions[bot]"]);
execFileSync("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
execFileSync("git", ["rm", ".github/workflows/apply-section-route-diagram-mvp.yml", "scripts/apply-section-route-diagram-mvp.mjs"]);
execFileSync("git", ["add", "."]);
execFileSync("git", ["commit", "-m", "Implement Horizontal section route diagram MVP"]);
execFileSync("git", ["push", "origin", "HEAD:agent/section-route-diagram-mvp"]);
