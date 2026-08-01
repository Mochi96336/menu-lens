import { buildArchiveCatalog } from "./catalog/index.mjs";
import { archiveExtensions } from "./catalog/all-extensions.mjs";
import { archiveLegacyOverrides } from "./catalog/legacy-overrides.mjs";
import { designModels, modelById, presentationNotes } from "./catalog/presentation-models.mjs";
import { studyPresentations } from "./catalog/study-presentations.mjs";
import { modelDiagramPresentations } from "./catalog/model-diagram-presentations.mjs";
import { createModelPageState, sectionForObject } from "./model-page-state.mjs";
import { createModelSurfacePool } from "./model-surface-pool.mjs";
import { createModelLiveBoard } from "./model-live-board.mjs";
import { createModelObjectInspector } from "./model-object-inspector.mjs";
import { createModelRouteDiagram } from "./model-route-diagram.mjs";
import { createModelConceptVignette } from "./model-concept-vignette.mjs";

const requiredElement = (selector) => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Design model page is missing required element ${selector}.`);
  return element;
};

const dispositionLabels = Object.freeze({
  substrate: "substrate",
  reference: "reference",
  "keep-controlled": "controlled keep",
  provisional: "provisional",
  "negative-evidence": "negative evidence",
  "study-only": "study only",
  superseded: "superseded",
  rejected: "rejected",
});

const dispositionExplanations = Object.freeze({
  substrate: "共同母體已建立；不代表產品方向已選定。",
  reference: "作為比較基準保存，不表示較成熟或較推薦。",
  "keep-controlled": "機制值得保留，但不等於產品採用。",
  provisional: "仍待直接檢視或後續證據分類。",
  "negative-evidence": "做得出來，但結果支持停止延伸。",
  "study-only": "只作為研究工具，不是設計候選。",
  superseded: "已由較清楚的研究物件取代，仍保留來源脈絡。",
  rejected: "研究邊界已否決此方向。",
});

const evidenceLabels = Object.freeze({
  "implementation-only": "implementation evidence only",
  "browser-verified": "browser verified",
  "direct-review-pending": "direct review pending",
  "participant-study-ready": "participant study ready",
  "participant-evidence-complete": "participant evidence complete",
});

const evidenceExplanations = Object.freeze({
  "implementation-only": "目前只證明物件已實作，尚未完成指定瀏覽器檢視。",
  "browser-verified": "指定環境下可執行；尚不能推論陌生讀者理解或產品採用。",
  "direct-review-pending": "仍需在指定 viewport 完成直接檢視與 disposition。",
  "participant-study-ready": "研究工具已就緒，但尚未產生參與者證據。",
  "participant-evidence-complete": "參與者證據已完成，仍須依研究問題解讀。",
});

const stoppedDispositions = new Set(["negative-evidence", "rejected", "superseded"]);
const combinedObjectIds = new Set(["22", "23"]);

const toneForDisposition = (disposition) => {
  if (stoppedDispositions.has(disposition)) return "rejected";
  if (["substrate", "keep-controlled"].includes(disposition)) return "active";
  return "partial";
};

const setStatus = (element, object) => {
  element.className = `status ${toneForDisposition(object.disposition)}`;
  element.textContent = dispositionLabels[object.disposition] ?? object.disposition;
};

const displayTitle = (object) => {
  const title = String(object?.title ?? "");
  const prefixIds = [object?.id];
  if (object?.objectType === "study") prefixIds.push(object?.researchParentId);
  const prefix = prefixIds
    .filter(Boolean)
    .map((id) => `${id} `)
    .find((candidate) => title.startsWith(candidate));
  return prefix ? title.slice(prefix.length).trim() : title;
};

const objectLabel = (object) => `${object.id} · ${displayTitle(object)}`;
const archivePath = (path) => `../${path}`;

const sourcePresentation = (object) => {
  if (object.objectType === "study") {
    return {
      action: "開啟研究工具 ↗",
      recordLabel: "Study tool",
      recordTitle: `開啟 ${object.id} 研究工具`,
    };
  }
  if (object.objectType === "correction") {
    return {
      action: "開啟修正畫面 ↗",
      recordLabel: "Correction",
      recordTitle: `開啟 ${object.id} 修正畫面`,
    };
  }
  return {
    action: "開啟 prototype ↗",
    recordLabel: "Prototype",
    recordTitle: `開啟 ${object.id} exact prototype`,
  };
};

const catalog = buildArchiveCatalog(
  window.menuLensPrototypeRegistry,
  archiveExtensions,
  archiveLegacyOverrides,
);
const objectById = new Map(catalog.objects.map((object) => [object.id, object]));
const objectOwner = new Map();
for (const model of designModels) {
  for (const section of model.sections) {
    for (const objectId of section.objectIds) {
      if (!objectOwner.has(objectId)) objectOwner.set(objectId, model.id);
    }
  }
}

const elements = Object.freeze({
  modelSelect: requiredElement("#model-select"),
  modelEyebrow: requiredElement("#model-eyebrow"),
  modelTitle: requiredElement("#model-title"),
  modelSummary: requiredElement("#model-summary"),
  modelStats: requiredElement("#model-stats"),
  modelConcept: requiredElement("#model-concept"),
  modelDiagramSignature: requiredElement("#model-diagram-signature"),
  modelDiagramStatement: requiredElement("#model-diagram-statement"),
  modelConceptVignette: requiredElement("#model-concept-vignette"),
  modelSubstrate: requiredElement("#model-substrate"),
  modelRetains: requiredElement("#model-retains"),
  modelVaries: requiredElement("#model-varies"),
  modelQuestion: requiredElement("#model-question"),
  sectionTabs: requiredElement("#section-tabs"),
  sectionCurrentLabel: requiredElement("#section-current-label"),
  sectionSummary: requiredElement("#section-summary"),
  objectPicker: requiredElement("#object-picker"),
  objectSelect: requiredElement("#object-select"),
  viewAll: requiredElement("#view-all"),
  viewFocus: requiredElement("#view-focus"),
  compareParent: requiredElement("#compare-parent"),
  viewportNote: requiredElement("#viewport-note"),
  board: requiredElement("#all-live-board"),
  inspector: {
    role: requiredElement("#inspector-role"),
    title: requiredElement("#inspector-object-title"),
    status: requiredElement("#inspector-status"),
    tabs: requiredElement("#inspector-tabs"),
    summaryPanel: requiredElement("#inspector-panel-summary"),
    relationsPanel: requiredElement("#inspector-panel-relations"),
    recordsPanel: requiredElement("#inspector-panel-records"),
    differenceEyebrow: requiredElement("#difference-eyebrow"),
    differenceVariable: requiredElement("#difference-variable"),
    differenceBeforeLabel: requiredElement("#difference-before-label"),
    differenceBefore: requiredElement("#difference-before"),
    differenceAfterLabel: requiredElement("#difference-after-label"),
    differenceAfter: requiredElement("#difference-after"),
    differenceUnchangedLabel: requiredElement("#difference-unchanged-label"),
    differenceUnchanged: requiredElement("#difference-unchanged"),
    outcomeTitle: requiredElement("#outcome-title"),
    outcomeDisposition: requiredElement("#outcome-disposition"),
    outcomeEvidence: requiredElement("#outcome-evidence"),
    outcomeNextRow: requiredElement("#outcome-next-row"),
    outcomeNextLabel: requiredElement("#outcome-next-label"),
    outcomeNextGate: requiredElement("#outcome-next-gate"),
    relations: requiredElement("#inspector-relations"),
    records: requiredElement("#inspector-records"),
  },
});

const viewportButtons = [...document.querySelectorAll("[data-viewport]")];
const viewModeButtons = [...document.querySelectorAll("[data-view-mode]")];

const state = createModelPageState({ designModels, modelById, objectById });
const surfacePool = createModelSurfacePool();

const viewportPixelWidth = () => state.value.viewport === "desktop" ? 1024 : Number(state.value.viewport);
const viewportLabel = () => `${viewportPixelWidth()}px`;
const previewAssetPath = (object) =>
  archivePath(`previews/${encodeURIComponent(object.id)}/${state.value.viewport}.png`);

const syncSurface = (surface, object, role) => surface.sync({
  key: object.id,
  src: object.entrypoint ? archivePath(object.entrypoint) : null,
  title: `${role}：${objectLabel(object)}，${viewportLabel()} 可操作畫面`,
  viewportWidth: viewportPixelWidth(),
  previewSrc: previewAssetPath(object),
  previewAlt: `${role}：${objectLabel(object)}，${viewportLabel()} 靜態載入畫面`,
});

const variantStateLabel = (object) => {
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
const diagramPresentationFor = (model) => modelDiagramPresentations[model.id] ?? null;
let previewSection = null;

const vignette = createModelConceptVignette({ root: elements.modelConceptVignette });

const renderConcept = (section, { preview = false } = {}) => {
  const presentation = diagramPresentationFor(state.value.model);
  vignette.render({ presentation, sectionId: section.id, preview });
};

const routeDiagram = createModelRouteDiagram({
  root: elements.sectionTabs,
  currentLabel: elements.sectionCurrentLabel,
  currentNote: elements.sectionSummary,
  labelForSection: sectionTabLabel,
  onSelect: (section) => {
    previewSection = null;
    state.setSection(section);
    render({ historyMode: "push", focusTarget: { kind: "section", id: section.id } });
  },
  onPreview: (section) => {
    const presentation = diagramPresentationFor(state.value.model);
    if (!presentation || section.id === state.value.section.id) return;
    previewSection = section;
    routeDiagram.preview({ section, presentation });
    renderConcept(section, { preview: true });
  },
  onPreviewEnd: () => {
    if (!previewSection) return;
    previewSection = null;
    const presentation = diagramPresentationFor(state.value.model);
    routeDiagram.restore({ section: state.value.section, presentation });
    renderConcept(state.value.section);
  },
});

const cardPresentation = (object) => {
  if (object.objectType === "study") {
    const presentation = studyPresentations[object.id];
    if (!presentation) throw new Error(`Study ${object.id} is missing explicit presentation metadata.`);
    return {
      title: objectLabel(object),
      meta: `${presentation.method} · ${presentation.subjectIds.join(" / ")}`,
    };
  }
  if (object.objectType === "correction") {
    return { title: objectLabel(object), meta: "" };
  }
  return { title: objectLabel(object), meta: "" };
};

const canCompareWithParent = (object, parent) =>
  object.objectType === "prototype" && Boolean(object.entrypoint && parent?.entrypoint);

const navigateToObject = (objectId) => {
  const modelId = objectOwner.get(objectId);
  const model = modelId ? modelById.get(modelId) : null;
  const section = model ? sectionForObject(model, objectId) : null;
  const object = objectById.get(objectId);
  if (!model || !section || !object) {
    window.location.href = "../#catalog";
    return;
  }
  previewSection = null;
  if (model.id !== state.value.model.id) state.setModel(model);
  state.patch({ model, section, object, viewMode: "all" });
  render({ historyMode: "push" });
};

const inspector = createModelObjectInspector({
  elements: elements.inspector,
  objectById,
  catalog,
  presentationNotes,
  stoppedDispositions,
  combinedObjectIds,
  dispositionLabels,
  dispositionExplanations,
  evidenceLabels,
  evidenceExplanations,
  objectLabel,
  setStatus,
  sourcePresentation,
  archivePath,
  onNavigate: navigateToObject,
});

const board = createModelLiveBoard({
  boardRoot: elements.board,
  surfacePool,
  objectLabel,
  setStatus,
  syncSurface,
  cardPresentation,
  onSelect: (object) => {
    state.setObject(object);
    render({ historyMode: "push", focusTarget: { kind: "card", id: object.id } });
  },
});

const renderModelDefinition = ({ model, section }) => {
  document.title = `Menu Lens — ${model.title}`;
  elements.modelSelect.value = model.id;
  elements.modelEyebrow.textContent = model.eyebrow;
  elements.modelTitle.textContent = model.title;
  elements.modelSummary.textContent = model.summary;
  elements.modelSubstrate.textContent = model.substrate;
  elements.modelRetains.textContent = model.retains;
  elements.modelVaries.textContent = model.varies;
  elements.modelQuestion.textContent = model.question;
  const objectCount = new Set(model.sections.flatMap((candidate) => candidate.objectIds)).size;
  elements.modelStats.textContent = `${model.sections.length} 組子研究 · ${objectCount} 個研究物件`;

  const presentation = diagramPresentationFor(model);
  elements.modelConcept.hidden = !presentation;
  elements.modelDiagramSignature.textContent = presentation?.signature ?? "";
  elements.modelDiagramStatement.textContent = presentation?.statement ?? "";
  renderConcept(previewSection ?? section, { preview: Boolean(previewSection) });
};

const renderSectionRoute = ({ model, section }) => {
  routeDiagram.render({
    model,
    section,
    presentation: diagramPresentationFor(model),
  });
};

const renderObjectSelect = ({ section, object }) => {
  const currentOptions = [...elements.objectSelect.options ?? []];
  const ids = section.objectIds.filter((id) => objectById.has(id));
  const sameOptions = currentOptions.length === ids.length
    && ids.every((id, index) => currentOptions[index]?.value === id);
  if (!sameOptions) {
    elements.objectSelect.replaceChildren();
    for (const id of ids) {
      const candidate = objectById.get(id);
      const option = document.createElement("option");
      option.value = id;
      option.textContent = objectLabel(candidate);
      elements.objectSelect.append(option);
    }
  }
  elements.objectSelect.value = object.id;
};

const renderToolbar = ({ object, viewport, viewMode }) => {
  const parent = object.researchParentId ? objectById.get(object.researchParentId) : null;
  const canCompare = canCompareWithParent(object, parent);
  if (viewMode === "compare" && !canCompare) {
    state.setViewMode("focus");
    viewMode = "focus";
  }
  const comparing = viewMode === "compare";
  elements.objectPicker.hidden = viewMode === "all";
  elements.compareParent.hidden = !canCompare || viewMode === "all";
  elements.compareParent.disabled = !canCompare;
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
  return { parent, canCompare, viewMode };
};

const renderStage = (snapshot) => {
  const toolbar = renderToolbar(snapshot);
  const objects = snapshot.section.objectIds.map((id) => objectById.get(id)).filter(Boolean);
  board.render({
    objects,
    activeObject: snapshot.object,
    parent: toolbar.parent,
    viewMode: toolbar.viewMode,
    viewport: snapshot.viewport,
  });
};

const restoreFocus = (target) => {
  if (!target) return;
  if (target.kind === "section") {
    routeDiagram.getButtons()
      .find((button) => button.dataset.sectionId === target.id)?.focus();
    return;
  }
  if (target.kind === "card") {
    board.getCard(target.id)?.select.focus();
    return;
  }
  if (target.kind === "object") elements.objectSelect.focus();
};

function render({ historyMode = "replace", focusTarget = null } = {}) {
  const snapshot = state.value;
  renderModelDefinition(snapshot);
  renderSectionRoute(snapshot);
  renderObjectSelect(snapshot);
  renderStage(snapshot);
  inspector.render(snapshot);
  state.commitUrl(historyMode);
  restoreFocus(focusTarget);
}

for (const model of designModels) {
  const option = document.createElement("option");
  option.value = model.id;
  option.textContent = model.title;
  elements.modelSelect.append(option);
}

elements.modelSelect.addEventListener("change", () => {
  previewSection = null;
  const model = modelById.get(elements.modelSelect.value);
  if (!model) return;
  state.setModel(model);
  render({ historyMode: "push" });
});

elements.objectSelect.addEventListener("change", () => {
  const object = objectById.get(elements.objectSelect.value);
  if (!object || !state.value.section.objectIds.includes(object.id)) return;
  state.setObject(object);
  render({ historyMode: "push", focusTarget: { kind: "object", id: object.id } });
});

for (const button of viewModeButtons) {
  button.addEventListener("click", () => {
    state.setViewMode(button.dataset.viewMode);
    render({ historyMode: "push" });
  });
}

elements.compareParent.addEventListener("click", () => {
  state.setViewMode(state.value.viewMode === "compare" ? "focus" : "compare");
  render({ historyMode: "push" });
});

for (const button of viewportButtons) {
  button.addEventListener("click", () => {
    state.setViewport(button.dataset.viewport);
    render({ historyMode: "push" });
  });
}

window.addEventListener?.("popstate", () => {
  previewSection = null;
  state.replaceFromLocation();
  render({ historyMode: null });
});

try {
  render();
} catch (error) {
  const message = document.createElement("p");
  message.className = "archive-error site-shell";
  message.textContent = `設計模型頁無法載入：${error.message}`;
  document.body.append(message);
  console.error(error);
}
