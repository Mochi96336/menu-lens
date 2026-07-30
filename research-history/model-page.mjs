import { buildArchiveCatalog } from "./catalog/index.mjs";
import { archiveExtensions } from "./catalog/all-extensions.mjs";
import { archiveLegacyOverrides } from "./catalog/legacy-overrides.mjs";
import { designModels, modelById, presentationNotes } from "./catalog/presentation-models.mjs";

const requiredElement = (selector) => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Design model page is missing required element ${selector}.`);
  return element;
};

const makeText = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
};

const asArray = (value) => Array.isArray(value) ? value : [];

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
const viewportValues = new Set(["320", "390", "desktop"]);

const toneForDisposition = (disposition) => {
  if (stoppedDispositions.has(disposition)) return "rejected";
  if (["substrate", "keep-controlled"].includes(disposition)) return "active";
  return "partial";
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
  modelSubstrate: requiredElement("#model-substrate"),
  modelRetains: requiredElement("#model-retains"),
  modelVaries: requiredElement("#model-varies"),
  modelQuestion: requiredElement("#model-question"),
  sectionSummary: requiredElement("#section-summary"),
  sectionTabs: requiredElement("#section-tabs"),
  variantList: requiredElement("#variant-list"),
  stageContextRole: requiredElement("#stage-context-role"),
  stageContextCopy: requiredElement("#stage-context-copy"),
  focusView: requiredElement("#view-focus"),
  compareParent: requiredElement("#compare-parent"),
  allView: requiredElement("#view-all"),
  parentRecordLink: requiredElement("#parent-record-link"),
  viewportNote: requiredElement("#viewport-note"),
  previewGrid: requiredElement("#preview-grid"),
  allPreviewGrid: requiredElement("#all-preview-grid"),
  currentObjectTitle: requiredElement("#current-object-title"),
  currentObjectStatus: requiredElement("#current-object-status"),
  currentExactLink: requiredElement("#current-exact-link"),
  currentPreviewTitle: requiredElement("#current-preview-title"),
  currentPreviewStatus: requiredElement("#current-preview-status"),
  currentPreview: requiredElement("#current-preview"),
  parentPane: requiredElement("#parent-pane"),
  parentObjectTitle: requiredElement("#parent-object-title"),
  parentObjectStatus: requiredElement("#parent-object-status"),
  parentPreview: requiredElement("#parent-preview"),
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
  lineage: requiredElement("#lineage"),
  recordLinks: requiredElement("#record-links"),
});

const viewportButtons = [...document.querySelectorAll("[data-viewport]")];
const viewModeButtons = [...document.querySelectorAll("[data-view-mode]")];
const viewModes = new Set(["focus", "compare", "all"]);

const displayTitle = (object) => {
  const title = String(object?.title ?? "");
  const prefix = `${object?.id ?? ""} `;
  return prefix.trim() && title.startsWith(prefix) ? title.slice(prefix.length).trim() : title;
};
const objectLabel = (object) => `${object.id} · ${displayTitle(object)}`;

const sectionForObject = (model, objectId) =>
  model.sections.find((section) => section.objectIds.includes(objectId));
const featuredSectionForModel = (model) =>
  sectionForObject(model, model.featuredObjectId) ?? model.sections[0];

const resolveLocationState = () => {
  const params = new URLSearchParams(window.location.search);
  const fallbackModel = modelById.get("landscape-paper") ?? designModels[0];
  const model = modelById.get(params.get("model")) ?? fallbackModel;
  const requestedSection = model.sections.find((section) => section.id === params.get("section"));
  const section = requestedSection ?? featuredSectionForModel(model);
  let object = objectById.get(params.get("variant"));
  if (!object || !section.objectIds.includes(object.id)) {
    const preferredObjectId = requestedSection ? section.defaultObjectId : model.featuredObjectId;
    object = objectById.get(preferredObjectId) ?? objectById.get(section.defaultObjectId);
  }
  return {
    model,
    section,
    object,
    viewport: viewportValues.has(params.get("viewport")) ? params.get("viewport") : "390",
    viewMode: params.get("view") === "all"
      ? "all"
      : (params.get("compare") === "parent" ? "compare" : "focus"),
  };
};

const initialState = resolveLocationState();
let activeModel = initialState.model;
let activeSection = initialState.section;
let activeObject = initialState.object;
let activeViewport = initialState.viewport;
let activeViewMode = viewModes.has(initialState.viewMode) ? initialState.viewMode : "focus";

const updateUrl = (mode = "replace") => {
  const next = new URLSearchParams({
    model: activeModel.id,
    section: activeSection.id,
    variant: activeObject.id,
    viewport: activeViewport,
  });
  if (activeViewMode === "compare" && activeObject.researchParentId) next.set("compare", "parent");
  if (activeViewMode === "all") next.set("view", "all");
  const url = `?${next.toString()}${window.location.hash ?? ""}`;
  if (mode === "push" && typeof history.pushState === "function") {
    history.pushState(null, "", url);
  } else if (mode) {
    history.replaceState(null, "", url);
  }
};

const setStatus = (element, object) => {
  element.className = `status ${toneForDisposition(object.disposition)}`;
  element.textContent = dispositionLabels[object.disposition] ?? object.disposition;
};

const archivePath = (path) => `../${path}`;
const viewportLabel = () => activeViewport === "desktop" ? "1024px" : `${activeViewport}px`;

const previewProfileForObject = (object) => {
  if (object.objectType === "study") return "study";
  if (activeModel.id === "complete-document") return "document";
  return "spatial";
};

const previewAssetPath = (object, viewport = activeViewport) =>
  archivePath(`previews/${encodeURIComponent(object.id)}/${viewport}.png`);

const makePreviewPlaceholder = (object, message) => {
  const placeholder = document.createElement("div");
  placeholder.className = "model-preview-placeholder";
  placeholder.append(
    makeText("p", "phase-index", `${object.id} / ${object.objectType}`),
    makeText("h3", "", displayTitle(object)),
    makeText("p", "", message ?? object.summary),
  );
  if (object.entrypoint) {
    const link = makeText("a", "", "開啟 exact prototype");
    link.href = archivePath(object.entrypoint);
    link.target = "_blank";
    link.rel = "noreferrer";
    placeholder.append(link);
  } else if (object.reviewDocument) {
    const link = makeText("a", "", "開啟研究紀錄");
    link.href = archivePath(object.reviewDocument);
    placeholder.append(link);
  }
  return placeholder;
};

const syncPreview = (root, object, role, options = {}) => {
  root.dataset.viewport = activeViewport;
  root.dataset.previewProfile = previewProfileForObject(object);
  const currentImage = root.querySelector?.("img.model-preview-image") ?? root.children?.[0];
  const sameObject = root.dataset.objectId === object.id;

  if (sameObject && currentImage?.tagName === "IMG") {
    currentImage.src = previewAssetPath(object);
    currentImage.alt = `${role}：${objectLabel(object)}，${viewportLabel()} 靜態預覽`;
    return currentImage;
  }

  root.replaceChildren();
  root.dataset.objectId = object.id;

  if (!object.entrypoint) {
    root.append(makePreviewPlaceholder(object, "此研究物件沒有獨立可執行畫面。"));
    return null;
  }

  const image = document.createElement("img");
  image.className = "model-preview-image";
  image.src = previewAssetPath(object);
  image.alt = `${role}：${objectLabel(object)}，${viewportLabel()} 靜態預覽`;
  image.loading = options.eager ? "eager" : "lazy";
  image.decoding = "async";

  const unavailable = makePreviewPlaceholder(object, "靜態預覽尚未產生；仍可開啟 exact prototype。");
  unavailable.className += " model-preview-placeholder--unavailable";
  unavailable.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    unavailable.hidden = false;
    root.dataset.previewUnavailable = "true";
  });
  image.addEventListener("load", () => {
    image.hidden = false;
    unavailable.hidden = true;
    delete root.dataset.previewUnavailable;
  });
  root.append(image, unavailable);
  return image;
};

const renderModelDefinition = () => {
  document.title = `Menu Lens — ${activeModel.title}`;
  elements.modelSelect.value = activeModel.id;
  elements.modelEyebrow.textContent = activeModel.eyebrow;
  elements.modelTitle.textContent = activeModel.title;
  elements.modelSummary.textContent = activeModel.summary;
  elements.modelSubstrate.textContent = activeModel.substrate;
  elements.modelRetains.textContent = activeModel.retains;
  elements.modelVaries.textContent = activeModel.varies;
  elements.modelQuestion.textContent = activeModel.question;
  const objectCount = new Set(activeModel.sections.flatMap((section) => section.objectIds)).size;
  elements.modelStats.textContent = `${activeModel.sections.length} 組子研究 · ${objectCount} 個研究物件`;
};

const focusAdjacent = (event, buttons, currentIndex) => {
  const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
  if (!keys.includes(event.key) || !buttons.length) return;
  event.preventDefault();
  let nextIndex = currentIndex;
  if (["ArrowDown", "ArrowRight"].includes(event.key)) nextIndex = (currentIndex + 1) % buttons.length;
  if (["ArrowUp", "ArrowLeft"].includes(event.key)) nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = buttons.length - 1;
  buttons[nextIndex].focus();
};

const renderSectionTabs = () => {
  elements.sectionTabs.replaceChildren();
  for (const [index, section] of activeModel.sections.entries()) {
    const selected = section.id === activeSection.id;
    const button = makeText("button", "", section.title);
    button.id = `section-tab-${section.id}`;
    button.type = "button";
    button.role = "tab";
    button.dataset.sectionId = section.id;
    button.tabIndex = selected ? 0 : -1;
    button.setAttribute("aria-controls", "variant-list");
    button.setAttribute("aria-selected", String(selected));
    button.addEventListener("keydown", (event) =>
      focusAdjacent(event, [...elements.sectionTabs.children], index));
    button.addEventListener("click", () => {
      activeSection = section;
      activeObject = objectById.get(section.defaultObjectId);
      if (activeViewMode === "compare") activeViewMode = "focus";
      render({ historyMode: "push", focusTarget: { kind: "section", id: section.id } });
    });
    elements.sectionTabs.append(button);
  }
  elements.variantList.setAttribute("aria-labelledby", `section-tab-${activeSection.id}`);
};

const variantStateLabel = (object) => {
  if (stoppedDispositions.has(object.disposition)) return "stopped";
  if (object.objectType === "study") return "study";
  if (object.objectType === "correction") return "correction";
  return dispositionLabels[object.disposition] ?? object.disposition;
};

const renderVariantList = () => {
  elements.variantList.replaceChildren();
  for (const [index, objectId] of activeSection.objectIds.entries()) {
    const object = objectById.get(objectId);
    if (!object) continue;
    const note = presentationNotes[object.id];
    const selected = object.id === activeObject.id;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.objectId = object.id;
    button.dataset.objectType = object.objectType;
    button.tabIndex = selected ? 0 : -1;
    button.setAttribute("aria-current", String(selected));

    const copy = document.createElement("span");
    copy.append(
      makeText("strong", "", `${object.id} · ${note?.shortLabel ?? displayTitle(object)}`),
      makeText("small", "", `${object.objectType} · ${variantStateLabel(object)}`),
    );
    button.append(copy);
    button.addEventListener("keydown", (event) =>
      focusAdjacent(event, [...elements.variantList.children], index));
    button.addEventListener("click", () => {
      activeObject = object;
      activeViewMode = "focus";
      render({ historyMode: "push", focusTarget: { kind: "object", id: object.id } });
    });
    elements.variantList.append(button);
  }
};

const renderViewportState = () => {
  elements.currentPreview.dataset.viewport = activeViewport;
  elements.parentPreview.dataset.viewport = activeViewport;
  for (const button of viewportButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.viewport === activeViewport));
  }
  elements.viewportNote.textContent =
    `${viewportLabel()} 靜態預覽只保留 prototype 畫面；開啟 prototype 可實際操作。`;
};

const canCompareWithParent = (object, parent) =>
  object.objectType === "prototype" && Boolean(object.entrypoint && parent?.entrypoint);

const setViewModeState = (canCompare) => {
  if (activeViewMode === "compare" && !canCompare) activeViewMode = "focus";
  elements.previewGrid.dataset.viewMode = activeViewMode;
  elements.previewGrid.hidden = activeViewMode === "all";
  elements.allPreviewGrid.hidden = activeViewMode !== "all";
  for (const button of viewModeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.viewMode === activeViewMode));
  }
};

const renderAllPreviews = () => {
  const cards = [];
  for (const objectId of activeSection.objectIds) {
    const object = objectById.get(objectId);
    if (!object) continue;
    const card = document.createElement("article");
    card.className = "model-preview-card";
    card.dataset.objectId = object.id;
    card.dataset.current = String(object.id === activeObject.id);

    const select = document.createElement("button");
    select.type = "button";
    select.className = "model-preview-card__select";
    select.dataset.allObjectId = object.id;
    select.setAttribute("aria-current", String(object.id === activeObject.id));
    select.append(
      makeText("strong", "", objectLabel(object)),
      makeText("small", "", `${object.objectType} · ${variantStateLabel(object)}`),
    );
    select.addEventListener("click", () => {
      activeObject = object;
      render({ historyMode: "push", focusTarget: { kind: "all", id: object.id } });
    });

    const preview = document.createElement("div");
    preview.className = "model-preview-card__image";
    syncPreview(preview, object, "本組物件", { eager: true });
    card.append(select, preview);
    cards.push(card);
  }
  elements.allPreviewGrid.replaceChildren(...cards);
};

const renderStage = () => {
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  const canCompare = canCompareWithParent(activeObject, parent);
  if (activeViewMode === "compare" && !canCompare) activeViewMode = "focus";

  elements.currentObjectTitle.textContent = objectLabel(activeObject);
  elements.currentPreviewTitle.textContent = objectLabel(activeObject);
  setStatus(elements.currentObjectStatus, activeObject);
  setStatus(elements.currentPreviewStatus, activeObject);
  syncPreview(elements.currentPreview, activeObject, "目前", { eager: true });

  elements.currentExactLink.hidden = !activeObject.entrypoint;
  if (activeObject.entrypoint) elements.currentExactLink.href = archivePath(activeObject.entrypoint);

  elements.compareParent.hidden = !canCompare;
  elements.compareParent.disabled = !canCompare;
  elements.compareParent.textContent = parent ? `與 parent ${parent.id} 並排` : "與 parent 並排";

  const parentRecordPath = parent?.reviewDocument ?? parent?.entrypoint ?? null;
  elements.parentRecordLink.hidden = !parent || canCompare || !parentRecordPath;
  if (parentRecordPath) {
    elements.parentRecordLink.href = archivePath(parentRecordPath);
    elements.parentRecordLink.textContent = `查看 parent ${parent.id} 記錄`;
  }

  elements.parentPane.hidden = activeViewMode !== "compare";
  if (canCompare && activeViewMode === "compare") {
    elements.parentObjectTitle.textContent = objectLabel(parent);
    setStatus(elements.parentObjectStatus, parent);
    syncPreview(elements.parentPreview, parent, "Parent", { eager: true });
  }

  if (activeViewMode === "all") renderAllPreviews();
  else elements.allPreviewGrid.replaceChildren();
  setViewModeState(canCompare);
  renderViewportState();
};

const describeReferences = (ids) => asArray(ids)
  .map((id) => objectById.get(id))
  .filter(Boolean)
  .map(objectLabel)
  .join("、");

const differenceCopy = () => {
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  const note = presentationNotes[activeObject.id];

  if (activeObject.objectType === "study") {
    const after = activeObject.summary;
    return {
      eyebrow: "研究工具",
      variable: "研究工具與證據範圍",
      beforeLabel: "研究對象",
      before: describeReferences(activeObject.evidenceFor) || parent?.summary || "尚未記錄研究對象。",
      afterLabel: "研究工具",
      after,
      unchangedLabel: "證據邊界",
      unchanged: "研究就緒與執行結果不直接代表 prototype 已獲採用。",
      stage: after,
    };
  }

  if (activeObject.objectType === "correction") {
    const targets = describeReferences(activeObject.evidenceFor);
    const after = note?.after ?? activeObject.summary;
    return {
      eyebrow: "必要修正",
      variable: note?.variable ?? "可信閱讀的必要修正",
      beforeLabel: "問題",
      before: note?.before ?? (targets || parent?.summary || "沒有獨立 prototype parent。"),
      afterLabel: "修正",
      after,
      unchangedLabel: "研究邊界",
      unchanged: note?.unchanged ?? (parent
        ? `${parent.id} 的核心模型、內容身份與主要 interaction grammar 維持不變。`
        : activeModel.retains),
      stage: after,
    };
  }

  if (stoppedDispositions.has(activeObject.disposition)) {
    const after = activeObject.summary;
    return {
      eyebrow: "停止結果",
      variable: note?.variable ?? "停止原因",
      beforeLabel: "嘗試",
      before: note ? `${note.variable}：${note.after}` : activeObject.summary,
      afterLabel: "觀察限制",
      after,
      unchangedLabel: "處理方式",
      unchanged: activeObject.nextGate ?? "保留為負面證據，不再沿此路線延伸。",
      stage: after,
    };
  }

  if (note) {
    return {
      eyebrow: "受控變因",
      variable: note.variable,
      beforeLabel: "調整前",
      before: note.before,
      afterLabel: "調整後",
      after: note.after,
      unchangedLabel: "保留條件",
      unchanged: note.unchanged,
      stage: note.after,
    };
  }

  if (combinedObjectIds.has(activeObject.id)) {
    const after = activeObject.summary;
    return {
      eyebrow: "組合機制",
      variable: "既有機制的組合實作",
      beforeLabel: "沿用條件",
      before: parent?.summary ?? activeModel.substrate,
      afterLabel: "組合內容",
      after,
      unchangedLabel: "研究邊界",
      unchanged: "各機制仍需分開判讀；此物件不建立新的綜合產品方向。",
      stage: after,
    };
  }

  const isSectionBaseline = activeObject.id === activeSection.defaultObjectId;
  if (!parent || isSectionBaseline) {
    const after = activeObject.summary;
    return {
      eyebrow: "比較基準",
      variable: activeSection.title,
      beforeLabel: "來源脈絡",
      before: parent?.summary ?? "此物件是目前子研究的起點。",
      afterLabel: "目前物件",
      after,
      unchangedLabel: "保留條件",
      unchanged: activeModel.retains,
      stage: after,
    };
  }

  const after = activeObject.summary;
  return {
    eyebrow: "模型轉換",
    variable: activeSection.title,
    beforeLabel: "前一模型",
    before: parent.summary,
    afterLabel: "新增假設",
    after,
    unchangedLabel: "保留條件",
    unchanged: activeModel.retains,
    stage: after,
  };
};

const renderDifference = () => {
  const copy = differenceCopy();
  elements.differenceEyebrow.textContent = copy.eyebrow;
  elements.differenceVariable.textContent = copy.variable;
  elements.differenceBeforeLabel.textContent = copy.beforeLabel;
  elements.differenceBefore.textContent = copy.before;
  elements.differenceAfterLabel.textContent = copy.afterLabel;
  elements.differenceAfter.textContent = copy.after;
  elements.differenceUnchangedLabel.textContent = copy.unchangedLabel;
  elements.differenceUnchanged.textContent = copy.unchanged;
  elements.stageContextRole.textContent = copy.eyebrow;
  elements.stageContextCopy.textContent = copy.stage ?? copy.after;
};

const renderOutcomeValue = (root, canonicalValue, explanation) => {
  root.replaceChildren(
    makeText("strong", "", canonicalValue),
    makeText("small", "", explanation),
  );
  root.className = "model-outcome-value";
};

const renderOutcome = () => {
  renderOutcomeValue(
    elements.outcomeDisposition,
    dispositionLabels[activeObject.disposition] ?? activeObject.disposition,
    dispositionExplanations[activeObject.disposition] ?? "Canonical catalog disposition。",
  );
  renderOutcomeValue(
    elements.outcomeEvidence,
    evidenceLabels[activeObject.evidenceState] ?? activeObject.evidenceState,
    evidenceExplanations[activeObject.evidenceState] ?? "Canonical catalog evidence state。",
  );

  if (stoppedDispositions.has(activeObject.disposition)) {
    elements.outcomeTitle.textContent = "停止原因";
    elements.outcomeNextLabel.textContent = "後續限制";
  } else if (activeObject.objectType === "study") {
    elements.outcomeTitle.textContent = "研究狀態";
    elements.outcomeNextLabel.textContent = "研究條件";
  } else if (activeObject.objectType === "correction") {
    elements.outcomeTitle.textContent = "研究狀態";
    elements.outcomeNextLabel.textContent = "研究邊界";
  } else {
    elements.outcomeTitle.textContent = "研究狀態";
    elements.outcomeNextLabel.textContent = "下一步";
  }

  elements.outcomeNextRow.hidden = !activeObject.nextGate;
  elements.outcomeNextGate.textContent = activeObject.nextGate ?? "";
};

const navigateToObject = (objectId) => {
  const modelId = objectOwner.get(objectId);
  const model = modelId ? modelById.get(modelId) : null;
  const section = model
    ? (model.id === activeModel.id && activeSection.objectIds.includes(objectId)
      ? activeSection
      : sectionForObject(model, objectId))
    : null;
  if (!model || !section) {
    window.location.href = "../#catalog";
    return;
  }

  if (model.id !== activeModel.id) {
    const next = new URLSearchParams({
      model: model.id,
      section: section.id,
      variant: objectId,
      viewport: activeViewport,
    });
    window.location.href = `./?${next.toString()}`;
    return;
  }

  activeSection = section;
  activeObject = objectById.get(objectId);
  activeViewMode = "focus";
  render({ historyMode: "push", focusTarget: { kind: "object", id: objectId } });
};

const makeObjectButton = (object) => {
  const button = makeText("button", "", objectLabel(object));
  button.type = "button";
  button.addEventListener("click", () => navigateToObject(object.id));
  return button;
};

const makeLineageGroup = (title, description, objects) => {
  const group = document.createElement("section");
  group.className = "model-lineage-group";
  group.append(makeText("h3", "", title), makeText("p", "", description));
  if (!objects.length) {
    group.append(makeText("p", "model-lineage-empty", "沒有記錄。"));
    return group;
  }
  const list = document.createElement("ul");
  for (const object of objects) {
    const item = document.createElement("li");
    item.append(makeObjectButton(object));
    list.append(item);
  }
  group.append(list);
  return group;
};

const renderLineage = () => {
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  const sameStudy = [...new Set(activeSection.objectIds)]
    .filter((id) => id !== activeObject.id && id !== parent?.id)
    .slice(0, 6)
    .map((id) => objectById.get(id))
    .filter(Boolean);

  const relatedIds = new Set([
    ...asArray(activeObject.dependsOn),
    ...asArray(activeObject.mechanismsFrom),
    ...asArray(activeObject.evidenceFor),
    ...catalog.objects
      .filter((object) => object.researchParentId === activeObject.id)
      .map((object) => object.id),
  ]);
  relatedIds.delete(activeObject.id);
  if (parent) relatedIds.delete(parent.id);
  const related = [...relatedIds].map((id) => objectById.get(id)).filter(Boolean);

  elements.lineage.replaceChildren(
    makeLineageGroup(
      "Parent",
      "Catalog 記錄的直接 parent。",
      parent ? [parent] : [],
    ),
    makeLineageGroup(
      "同組物件",
      "同一子研究中的其他研究物件。",
      sameStudy,
    ),
    makeLineageGroup(
      "明確關係",
      "Catalog 記錄的 children、dependsOn、mechanismsFrom 與 evidenceFor。",
      related,
    ),
  );
};

const makeRecordLink = (label, title, href, kind = "research") => {
  const link = document.createElement("a");
  link.className = "model-record-link";
  link.dataset.recordKind = kind;
  link.href = href;
  if (href.startsWith("https://")) {
    link.target = "_blank";
    link.rel = "noreferrer";
  }
  link.append(makeText("small", "", label), makeText("strong", "", title));
  return link;
};

const renderRecords = () => {
  const links = [];
  if (activeObject.entrypoint) {
    links.push(makeRecordLink(
      "Prototype",
      `開啟 ${activeObject.id} exact prototype`,
      archivePath(activeObject.entrypoint),
      "primary",
    ));
  }
  if (activeObject.reviewDocument) {
    links.push(makeRecordLink(
      "Research record",
      "查看 review record",
      archivePath(activeObject.reviewDocument),
    ));
  }
  if (activeObject.evidencePath) {
    links.push(makeRecordLink(
      "Evidence",
      "開啟 evidence artifact",
      archivePath(activeObject.evidencePath),
    ));
  }
  if (activeObject.sourcePr) {
    links.push(makeRecordLink(
      "Source PR",
      `PR #${activeObject.sourcePr}`,
      `https://github.com/a20030824/menu-lens/pull/${activeObject.sourcePr}`,
      "provenance",
    ));
  }
  if (activeObject.sourceCommit) {
    links.push(makeRecordLink(
      "Source commit",
      activeObject.sourceCommit.slice(0, 12),
      `https://github.com/a20030824/menu-lens/commit/${activeObject.sourceCommit}`,
      "provenance",
    ));
  }
  links.push(makeRecordLink("Catalog", "返回完整研究物件目錄", "../#catalog", "provenance"));

  if (!activeObject.entrypoint) {
    const note = document.createElement("div");
    note.className = "model-record-note";
    note.append(
      makeText("small", "", "Executable boundary"),
      makeText("strong", "", "此物件沒有獨立 prototype entrypoint"),
    );
    links.unshift(note);
  }

  elements.recordLinks.replaceChildren(...links);
};

const restoreFocus = (target) => {
  if (!target) return;
  if (target.kind === "all") {
    [...elements.allPreviewGrid.querySelectorAll?.("[data-all-object-id]") ?? []]
      .find((button) => button.dataset.allObjectId === target.id)?.focus();
    return;
  }
  const collection = target.kind === "section"
    ? [...elements.sectionTabs.children]
    : [...elements.variantList.children];
  const key = target.kind === "section" ? "sectionId" : "objectId";
  collection.find((button) => button.dataset[key] === target.id)?.focus();
};

const render = ({ historyMode = "replace", focusTarget = null } = {}) => {
  elements.sectionSummary.textContent = activeSection.summary;
  renderModelDefinition();
  renderSectionTabs();
  renderVariantList();
  renderDifference();
  renderStage();
  renderOutcome();
  renderLineage();
  renderRecords();
  updateUrl(historyMode);
  restoreFocus(focusTarget);
};

for (const model of designModels) {
  const option = document.createElement("option");
  option.value = model.id;
  option.textContent = model.title;
  elements.modelSelect.append(option);
}

elements.modelSelect.addEventListener("change", () => {
  const model = modelById.get(elements.modelSelect.value);
  if (!model) return;
  activeModel = model;
  activeSection = featuredSectionForModel(model);
  activeObject = objectById.get(model.featuredObjectId) ?? objectById.get(activeSection.defaultObjectId);
  activeViewMode = "focus";
  render({ historyMode: "push" });
});

elements.focusView.addEventListener("click", () => {
  activeViewMode = "focus";
  renderStage();
  updateUrl("push");
});

elements.compareParent.addEventListener("click", () => {
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  if (!canCompareWithParent(activeObject, parent)) return;
  activeViewMode = "compare";
  renderStage();
  updateUrl("push");
});

elements.allView.addEventListener("click", () => {
  activeViewMode = "all";
  renderStage();
  updateUrl("push");
});

for (const button of viewportButtons) {
  button.addEventListener("click", () => {
    activeViewport = button.dataset.viewport;
    renderStage();
    updateUrl("push");
  });
}

window.addEventListener?.("popstate", () => {
  const state = resolveLocationState();
  activeModel = state.model;
  activeSection = state.section;
  activeObject = state.object;
  activeViewport = state.viewport;
  activeViewMode = state.viewMode;
  render({ historyMode: null });
});

try {
  render();
} catch (error) {
  document.body.append(
    makeText("p", "archive-error site-shell", `設計模型頁無法載入：${error.message}`),
  );
  console.error(error);
}
