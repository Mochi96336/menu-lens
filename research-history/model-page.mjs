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
  compareParent: requiredElement("#compare-parent"),
  parentRecordLink: requiredElement("#parent-record-link"),
  viewportNote: requiredElement("#viewport-note"),
  compareViewSwitch: requiredElement("#compare-view-switch"),
  previewGrid: requiredElement("#preview-grid"),
  currentObjectTitle: requiredElement("#current-object-title"),
  currentObjectStatus: requiredElement("#current-object-status"),
  currentExactLink: requiredElement("#current-exact-link"),
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
const previewPaneButtons = [...document.querySelectorAll("[data-preview-pane]")];

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
    compare: params.get("compare") === "parent",
  };
};

const initialState = resolveLocationState();
let activeModel = initialState.model;
let activeSection = initialState.section;
let activeObject = initialState.object;
let activeViewport = initialState.viewport;
let compareParent = initialState.compare;
let activePreviewPane = "current";

const updateUrl = (mode = "replace") => {
  const next = new URLSearchParams({
    model: activeModel.id,
    section: activeSection.id,
    variant: activeObject.id,
    viewport: activeViewport,
  });
  if (compareParent && activeObject.researchParentId) next.set("compare", "parent");
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

const updateFrameTitle = (root, object, role) => {
  const frame = root.children?.[0];
  if (frame?.tagName === "IFRAME") {
    frame.title = `${role} — ${object.id} ${displayTitle(object)} — ${viewportLabel()}`;
  }
};

const syncPreview = (root, object, role) => {
  root.dataset.viewport = activeViewport;
  root.dataset.previewProfile = previewProfileForObject(object);
  if (root.dataset.objectId === object.id) {
    updateFrameTitle(root, object, role);
    return;
  }

  root.replaceChildren();
  root.dataset.objectId = object.id;

  if (object.entrypoint) {
    const frame = document.createElement("iframe");
    frame.className = "model-preview-frame";
    frame.src = archivePath(object.entrypoint);
    frame.title = `${role} — ${object.id} ${displayTitle(object)} — ${viewportLabel()}`;
    frame.loading = "eager";
    root.append(frame);
    return;
  }

  const placeholder = document.createElement("div");
  placeholder.className = "model-preview-placeholder";
  placeholder.append(
    makeText("p", "phase-index", `${object.id} / ${object.objectType}`),
    makeText("h3", "", displayTitle(object)),
    makeText("p", "", object.summary),
  );
  if (object.reviewDocument) {
    const link = makeText("a", "", "開啟研究紀錄");
    link.href = archivePath(object.reviewDocument);
    placeholder.append(link);
  } else {
    placeholder.append(makeText("p", "", "此物件沒有獨立 executable；它保留為研究紀錄或分類基準。"));
  }
  root.append(placeholder);
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
      compareParent = false;
      activePreviewPane = "current";
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
      compareParent = false;
      activePreviewPane = "current";
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
  updateFrameTitle(elements.currentPreview, activeObject, "Current");
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  if (parent) updateFrameTitle(elements.parentPreview, parent, "Parent");
  elements.viewportNote.textContent =
    `固定 ${viewportLabel()} 寬；外層不足時水平捲動，不縮放 prototype。`;
};

const setPreviewPaneState = () => {
  elements.previewGrid.dataset.mobilePane = activePreviewPane;
  for (const button of previewPaneButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.previewPane === activePreviewPane));
  }
};

const canCompareWithParent = (object, parent) =>
  object.objectType === "prototype" && Boolean(object.entrypoint && parent?.entrypoint);

const renderStage = () => {
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  const canCompare = canCompareWithParent(activeObject, parent);
  if (!canCompare) compareParent = false;
  if (!compareParent) activePreviewPane = "current";

  elements.currentObjectTitle.textContent = objectLabel(activeObject);
  setStatus(elements.currentObjectStatus, activeObject);
  syncPreview(elements.currentPreview, activeObject, "Current");

  elements.currentExactLink.hidden = !activeObject.entrypoint;
  if (activeObject.entrypoint) elements.currentExactLink.href = archivePath(activeObject.entrypoint);

  elements.compareParent.hidden = !canCompare;
  elements.compareParent.disabled = !canCompare;
  elements.compareParent.setAttribute("aria-pressed", String(Boolean(canCompare && compareParent)));
  elements.compareParent.textContent = parent ? `與 parent ${parent.id} 比較` : "與 parent 比較";

  const parentRecordPath = parent?.reviewDocument ?? parent?.entrypoint ?? null;
  elements.parentRecordLink.hidden = !parent || canCompare || !parentRecordPath;
  if (parentRecordPath) {
    elements.parentRecordLink.href = archivePath(parentRecordPath);
    elements.parentRecordLink.textContent = `查看 parent ${parent.id} record`;
  }

  elements.previewGrid.dataset.compare = String(Boolean(canCompare && compareParent));
  elements.parentPane.hidden = !(canCompare && compareParent);
  elements.compareViewSwitch.hidden = !(canCompare && compareParent);

  if (canCompare && compareParent) {
    elements.parentObjectTitle.textContent = objectLabel(parent);
    setStatus(elements.parentObjectStatus, parent);
    syncPreview(elements.parentPreview, parent, "Parent");
  }

  setPreviewPaneState();
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
    return {
      eyebrow: "Study role",
      variable: "研究工具，不是設計變體",
      beforeLabel: "Tests",
      before: describeReferences(activeObject.evidenceFor) || parent?.summary || "尚未記錄 evidence target。",
      afterLabel: "Study instrument",
      after: activeObject.summary,
      unchangedLabel: "Does not establish",
      unchanged: "Study readiness 與執行結果都不會自動授權 prototype 採用或建立 combined direction。",
    };
  }

  if (activeObject.objectType === "correction") {
    const targets = describeReferences(activeObject.evidenceFor);
    return {
      eyebrow: "Prerequisite correction",
      variable: note?.variable ?? "可信閱讀的必要修正",
      beforeLabel: "Problem",
      before: note?.before ?? (targets || parent?.summary || "沒有獨立 prototype parent。"),
      afterLabel: "Correction",
      after: note?.after ?? activeObject.summary,
      unchangedLabel: "Research boundary",
      unchanged: note?.unchanged ?? (parent
        ? `${parent.id} 的核心模型、內容身份與主要 interaction grammar 不因此成為新產品方向。`
        : activeModel.retains),
    };
  }

  if (stoppedDispositions.has(activeObject.disposition)) {
    return {
      eyebrow: "Stopped result",
      variable: "停止結果，不是替代方案",
      beforeLabel: "Attempt",
      before: note ? `${note.variable}：${note.after}` : activeObject.summary,
      afterLabel: "Observed limit",
      after: activeObject.summary,
      unchangedLabel: "Consequence",
      unchanged: activeObject.nextGate ?? "保留為負面證據，不再沿此路線延伸。",
    };
  }

  if (note) {
    return {
      eyebrow: "Isolated difference",
      variable: note.variable,
      beforeLabel: "Parent／Before",
      before: note.before,
      afterLabel: "Current／After",
      after: note.after,
      unchangedLabel: "未改變",
      unchanged: note.unchanged,
    };
  }

  if (combinedObjectIds.has(activeObject.id)) {
    return {
      eyebrow: "Combined mechanisms",
      variable: "多個既有機制的 coupled implementation",
      beforeLabel: "Inherited",
      before: parent?.summary ?? activeModel.substrate,
      afterLabel: "Combined",
      after: activeObject.summary,
      unchangedLabel: "Still excluded",
      unchanged: "此物件不因此成為新的 best-of product direction；各機制仍需分開判讀。",
    };
  }

  const isSectionBaseline = activeObject.id === activeSection.defaultObjectId;
  if (!parent || isSectionBaseline) {
    return {
      eyebrow: "Sub-study baseline",
      variable: activeSection.title,
      beforeLabel: parent ? "較早脈絡" : "研究起點",
      before: parent?.summary ?? "此物件是目前 sub-study 的 root。",
      afterLabel: "目前角色",
      after: activeObject.summary,
      unchangedLabel: "比較邊界",
      unchanged: activeModel.retains,
    };
  }

  return {
    eyebrow: "Model transition",
    variable: activeSection.title,
    beforeLabel: "Previous model",
    before: parent.summary,
    afterLabel: "New assumption",
    after: activeObject.summary,
    unchangedLabel: "Open boundary",
    unchanged: activeModel.retains,
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
  if (copy.eyebrow === "Isolated difference") {
    elements.stageContextCopy.textContent = `只改 ${copy.variable}；${copy.unchanged}`;
  } else if (copy.eyebrow === "Stopped result") {
    elements.stageContextCopy.textContent = `${copy.after} ${copy.unchanged}`;
  } else {
    elements.stageContextCopy.textContent = `${copy.variable}。${copy.after}`;
  }
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
    elements.outcomeTitle.textContent = "停止判斷不是另一個可選方案。";
    elements.outcomeNextLabel.textContent = "後續限制";
  } else if (activeObject.objectType === "study") {
    elements.outcomeTitle.textContent = "研究工具就緒不等於設計成立。";
    elements.outcomeNextLabel.textContent = "Study gate";
  } else if (activeObject.objectType === "correction") {
    elements.outcomeTitle.textContent = "前置修正不建立新產品方向。";
    elements.outcomeNextLabel.textContent = "研究邊界";
  } else {
    elements.outcomeTitle.textContent = "實作狀態不等於研究結論。";
    elements.outcomeNextLabel.textContent = "Next gate";
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
  compareParent = false;
  activePreviewPane = "current";
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
      "Research parent",
      "唯一的 lineage parent；不代表較成熟或一定優於 current object。",
      parent ? [parent] : [],
    ),
    makeLineageGroup(
      "Same sub-study",
      "共享同一個研究問題，適合在同一頁直接切換。",
      sameStudy,
    ),
    makeLineageGroup(
      "Recorded relations",
      "只列直接 children、dependsOn、mechanismsFrom 與 evidenceFor。",
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
  compareParent = false;
  activePreviewPane = "current";
  render({ historyMode: "push" });
});

elements.compareParent.addEventListener("click", () => {
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  if (!canCompareWithParent(activeObject, parent)) return;
  compareParent = !compareParent;
  activePreviewPane = "current";
  renderStage();
  updateUrl("push");
});

for (const button of viewportButtons) {
  button.addEventListener("click", () => {
    activeViewport = button.dataset.viewport;
    renderViewportState();
    updateUrl("push");
  });
}

for (const button of previewPaneButtons) {
  button.addEventListener("click", () => {
    if (!compareParent) return;
    activePreviewPane = button.dataset.previewPane;
    setPreviewPaneState();
  });
}

window.addEventListener?.("popstate", () => {
  const state = resolveLocationState();
  activeModel = state.model;
  activeSection = state.section;
  activeObject = state.object;
  activeViewport = state.viewport;
  compareParent = state.compare;
  activePreviewPane = "current";
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
