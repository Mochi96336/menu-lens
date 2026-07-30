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

const evidenceLabels = Object.freeze({
  "implementation-only": "implementation evidence only",
  "browser-verified": "browser verified",
  "direct-review-pending": "direct review pending",
  "participant-study-ready": "participant study ready",
  "participant-evidence-complete": "participant evidence complete",
});

const toneForDisposition = (disposition) => {
  if (["rejected", "negative-evidence", "superseded"].includes(disposition)) return "rejected";
  if (["substrate", "keep-controlled"].includes(disposition)) return "active";
  return "partial";
};

const catalog = buildArchiveCatalog(
  window.menuLensPrototypeRegistry,
  archiveExtensions,
  archiveLegacyOverrides,
);
const objectById = new Map(catalog.objects.map((object) => [object.id, object]));
const viewportValues = new Set(["320", "390", "desktop"]);

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
  modelSubstrate: requiredElement("#model-substrate"),
  modelRetains: requiredElement("#model-retains"),
  modelVaries: requiredElement("#model-varies"),
  modelQuestion: requiredElement("#model-question"),
  sectionSummary: requiredElement("#section-summary"),
  sectionTabs: requiredElement("#section-tabs"),
  variantList: requiredElement("#variant-list"),
  compareParent: requiredElement("#compare-parent"),
  previewGrid: requiredElement("#preview-grid"),
  currentObjectTitle: requiredElement("#current-object-title"),
  currentObjectStatus: requiredElement("#current-object-status"),
  currentPreview: requiredElement("#current-preview"),
  parentPane: requiredElement("#parent-pane"),
  parentObjectTitle: requiredElement("#parent-object-title"),
  parentObjectStatus: requiredElement("#parent-object-status"),
  parentPreview: requiredElement("#parent-preview"),
  differenceVariable: requiredElement("#difference-variable"),
  differenceBefore: requiredElement("#difference-before"),
  differenceAfter: requiredElement("#difference-after"),
  differenceUnchanged: requiredElement("#difference-unchanged"),
  outcomeDisposition: requiredElement("#outcome-disposition"),
  outcomeEvidence: requiredElement("#outcome-evidence"),
  outcomeNextGate: requiredElement("#outcome-next-gate"),
  lineage: requiredElement("#lineage"),
  recordLinks: requiredElement("#record-links"),
});

const params = new URLSearchParams(window.location.search);
const fallbackModel = modelById.get("landscape-paper") ?? designModels[0];
let activeModel = modelById.get(params.get("model")) ?? fallbackModel;
let activeSection = activeModel.sections.find((section) => section.id === params.get("section"))
  ?? activeModel.sections[0];
let activeObject = objectById.get(params.get("variant"));
if (!activeObject || !activeSection.objectIds.includes(activeObject.id)) {
  activeObject = objectById.get(activeSection.defaultObjectId);
}
let activeViewport = viewportValues.has(params.get("viewport")) ? params.get("viewport") : "390";
let compareParent = params.get("compare") === "parent";

const sectionForObject = (model, objectId) => model.sections.find((section) => section.objectIds.includes(objectId));

const updateUrl = () => {
  const next = new URLSearchParams({
    model: activeModel.id,
    section: activeSection.id,
    variant: activeObject.id,
    viewport: activeViewport,
  });
  if (compareParent && activeObject.researchParentId) next.set("compare", "parent");
  history.replaceState(null, "", `?${next.toString()}`);
};

const setStatus = (element, object) => {
  element.className = `status ${toneForDisposition(object.disposition)}`;
  element.textContent = dispositionLabels[object.disposition] ?? object.disposition;
};

const archivePath = (path) => `../${path}`;

const renderPreview = (root, object) => {
  root.replaceChildren();
  root.dataset.viewport = activeViewport;

  if (object.entrypoint) {
    const frame = document.createElement("iframe");
    frame.className = "model-preview-frame";
    frame.src = archivePath(object.entrypoint);
    frame.title = `${object.id} ${object.title} exact prototype`;
    frame.loading = "lazy";
    root.append(frame);
    return;
  }

  const placeholder = document.createElement("div");
  placeholder.className = "model-preview-placeholder";
  placeholder.append(
    makeText("p", "phase-index", `${object.id} / ${object.objectType}`),
    makeText("h3", "", object.title),
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
};

const renderSectionTabs = () => {
  elements.sectionTabs.replaceChildren();
  for (const section of activeModel.sections) {
    const button = makeText("button", "", section.title);
    button.type = "button";
    button.role = "tab";
    button.setAttribute("aria-selected", String(section.id === activeSection.id));
    button.addEventListener("click", () => {
      activeSection = section;
      activeObject = objectById.get(section.defaultObjectId);
      compareParent = false;
      render();
    });
    elements.sectionTabs.append(button);
  }
};

const renderVariantList = () => {
  elements.variantList.replaceChildren();
  for (const objectId of activeSection.objectIds) {
    const object = objectById.get(objectId);
    if (!object) continue;
    const note = presentationNotes[object.id];
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-current", String(object.id === activeObject.id));

    const copy = document.createElement("span");
    copy.append(
      makeText("strong", "", `${object.id} · ${note?.shortLabel ?? object.title}`),
      makeText("small", "", `${dispositionLabels[object.disposition]} · ${evidenceLabels[object.evidenceState]}`),
    );
    button.append(copy);
    button.addEventListener("click", () => {
      activeObject = object;
      compareParent = false;
      render();
    });
    elements.variantList.append(button);
  }
};

const renderStage = () => {
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  if (!parent) compareParent = false;

  elements.currentObjectTitle.textContent = `${activeObject.id} · ${activeObject.title}`;
  setStatus(elements.currentObjectStatus, activeObject);
  renderPreview(elements.currentPreview, activeObject);

  elements.compareParent.disabled = !parent;
  elements.compareParent.setAttribute("aria-pressed", String(Boolean(parent && compareParent)));
  elements.compareParent.textContent = parent ? `與 parent ${parent.id} 比較` : "沒有 research parent";
  elements.previewGrid.dataset.compare = String(Boolean(parent && compareParent));
  elements.parentPane.hidden = !(parent && compareParent);

  if (parent && compareParent) {
    elements.parentObjectTitle.textContent = `${parent.id} · ${parent.title}`;
    setStatus(elements.parentObjectStatus, parent);
    renderPreview(elements.parentPreview, parent);
  } else {
    elements.parentPreview.replaceChildren();
  }

  for (const button of document.querySelectorAll("[data-viewport]")) {
    button.setAttribute("aria-pressed", String(button.dataset.viewport === activeViewport));
  }
};

const renderDifference = () => {
  const parent = activeObject.researchParentId ? objectById.get(activeObject.researchParentId) : null;
  const note = presentationNotes[activeObject.id];
  elements.differenceVariable.textContent = note?.variable
    ?? (parent ? activeSection.title : "模型共同母體");
  elements.differenceBefore.textContent = note?.before
    ?? parent?.summary
    ?? "此物件是這組比較的 root，沒有較早的 research parent。";
  elements.differenceAfter.textContent = note?.after ?? activeObject.summary;
  elements.differenceUnchanged.textContent = note?.unchanged ?? activeModel.retains;
};

const renderOutcome = () => {
  elements.outcomeDisposition.textContent = dispositionLabels[activeObject.disposition] ?? activeObject.disposition;
  elements.outcomeEvidence.textContent = evidenceLabels[activeObject.evidenceState] ?? activeObject.evidenceState;
  elements.outcomeNextGate.textContent = activeObject.nextGate ?? "Canonical catalog 尚未記錄下一個 evidence gate。";
};

const navigateToObject = (objectId) => {
  const modelId = objectOwner.get(objectId);
  const model = modelId ? modelById.get(modelId) : null;
  const section = model ? sectionForObject(model, objectId) : null;
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
  render();
};

const makeObjectButton = (object) => {
  const button = makeText("button", "", `${object.id} · ${object.title}`);
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
    .map((id) => objectById.get(id))
    .filter(Boolean);

  const relatedIds = new Set([
    ...activeObject.dependsOn,
    ...activeObject.mechanismsFrom,
    ...activeObject.evidenceFor,
    ...catalog.objects.filter((object) => object.researchParentId === activeObject.id).map((object) => object.id),
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
      "Descendants and relations",
      "包含 children、dependsOn、mechanismsFrom 與 evidenceFor。",
      related,
    ),
  );
};

const makeRecordLink = (label, title, href) => {
  const link = document.createElement("a");
  link.className = "model-record-link";
  link.href = href;
  link.append(makeText("small", "", label), makeText("strong", "", title));
  return link;
};

const renderRecords = () => {
  const links = [];
  if (activeObject.entrypoint) {
    links.push(makeRecordLink("Executable", `開啟 ${activeObject.id} exact prototype`, archivePath(activeObject.entrypoint)));
  }
  if (activeObject.reviewDocument) {
    links.push(makeRecordLink("Review", "查看研究紀錄", archivePath(activeObject.reviewDocument)));
  }
  if (activeObject.evidencePath) {
    links.push(makeRecordLink("Evidence", "開啟 evidence asset", archivePath(activeObject.evidencePath)));
  }
  if (activeObject.sourcePr) {
    links.push(makeRecordLink(
      "Source PR",
      `PR #${activeObject.sourcePr}`,
      `https://github.com/a20030824/menu-lens/pull/${activeObject.sourcePr}`,
    ));
  }
  if (activeObject.sourceCommit) {
    links.push(makeRecordLink(
      "Source commit",
      activeObject.sourceCommit.slice(0, 12),
      `https://github.com/a20030824/menu-lens/commit/${activeObject.sourceCommit}`,
    ));
  }
  links.push(makeRecordLink("Catalog", "返回完整研究物件目錄", "../#catalog"));

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

const render = () => {
  elements.sectionSummary.textContent = activeSection.summary;
  renderModelDefinition();
  renderSectionTabs();
  renderVariantList();
  renderStage();
  renderDifference();
  renderOutcome();
  renderLineage();
  renderRecords();
  updateUrl();
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
  activeSection = model.sections[0];
  activeObject = objectById.get(activeSection.defaultObjectId);
  compareParent = false;
  render();
});

elements.compareParent.addEventListener("click", () => {
  if (!activeObject.researchParentId) return;
  compareParent = !compareParent;
  renderStage();
  updateUrl();
});

for (const button of document.querySelectorAll("[data-viewport]")) {
  button.addEventListener("click", () => {
    activeViewport = button.dataset.viewport;
    renderStage();
    updateUrl();
  });
}

try {
  render();
} catch (error) {
  document.body.append(makeText("p", "archive-error site-shell", `設計模型頁無法載入：${error.message}`));
  console.error(error);
}
