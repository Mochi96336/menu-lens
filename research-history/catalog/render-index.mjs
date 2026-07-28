import { buildArchiveCatalog } from "./index.mjs";

const legacyRegistry = window.menuLensPrototypeRegistry;
const catalog = buildArchiveCatalog(legacyRegistry);
window.menuLensArchiveCatalog = catalog;

const familyById = new Map(catalog.families.map((family) => [family.id, family]));
const objectRoot = document.querySelector("#archive-objects");
const familyRoot = document.querySelector("#archive-families");
const originalRoot = document.querySelector("#archive-originals");
const objectCount = document.querySelector("#object-count");
const executableCount = document.querySelector("#executable-count");
const studyCount = document.querySelector("#study-count");
const typeFilter = document.querySelector("#type-filter");
const dispositionFilter = document.querySelector("#disposition-filter");
const emptyState = document.querySelector("#catalog-empty");

const dispositionLabels = {
  substrate: "substrate",
  reference: "reference",
  "keep-controlled": "controlled keep",
  provisional: "provisional",
  "negative-evidence": "negative evidence",
  "study-only": "study only",
  superseded: "superseded",
  rejected: "rejected",
};

const evidenceLabels = {
  "implementation-only": "implementation evidence",
  "browser-verified": "browser verified",
  "direct-review-pending": "direct review pending",
  "participant-study-ready": "study ready",
  "participant-evidence-complete": "participant evidence complete",
};

const toneForDisposition = (disposition) => {
  if (["rejected", "negative-evidence", "superseded"].includes(disposition)) return "rejected";
  if (["substrate", "keep-controlled"].includes(disposition)) return "active";
  return "partial";
};

const makeText = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
};

const renderFamilies = () => {
  const counts = new Map();
  for (const object of catalog.objects) counts.set(object.family, (counts.get(object.family) ?? 0) + 1);

  for (const family of catalog.families) {
    const article = document.createElement("article");
    article.className = "phase-card archive-family-card";
    article.dataset.familyId = family.id;
    article.append(
      makeText("p", "phase-index", `${counts.get(family.id) ?? 0} objects`),
      makeText("h3", "", family.title),
      makeText("p", "", family.summary),
      makeText("p", "archive-family-card__question", family.question),
    );
    familyRoot.append(article);
  }
};

const cards = [];
const renderObjects = () => {
  for (const object of catalog.objects) {
    const family = familyById.get(object.family);
    const article = document.createElement("article");
    article.className = "prototype-object archive-object";
    article.dataset.prototypeId = object.id;
    article.dataset.objectType = object.objectType;
    article.dataset.disposition = object.disposition;

    const heading = document.createElement("div");
    heading.className = "prototype-object__heading";
    const identity = document.createElement("div");
    identity.append(makeText("p", "phase-index", object.id), makeText("h3", "", object.title));
    const status = makeText("span", `status ${toneForDisposition(object.disposition)}`, dispositionLabels[object.disposition]);
    heading.append(identity, status);

    const relation = object.researchParentId ? `from ${object.researchParentId}` : "root";
    const metadata = makeText(
      "p",
      "prototype-object__meta",
      `${family?.title ?? object.family} · ${relation} · ${object.objectType}`,
    );
    const evidence = makeText("p", "archive-object__evidence", evidenceLabels[object.evidenceState]);

    article.append(heading, makeText("p", "", object.summary), metadata, evidence);

    if (object.entrypoint || object.reviewDocument) {
      const footer = document.createElement("footer");
      if (object.entrypoint) {
        const link = makeText("a", "ghost-button", `開啟 ${object.id}`);
        link.href = `./${object.entrypoint.replace(/index\.html$/, "")}`;
        footer.append(link);
      }
      if (object.reviewDocument) {
        const review = makeText("a", "ghost-button", "查看紀錄");
        review.href = `../${object.reviewDocument}`;
        footer.append(review);
      }
      article.append(footer);
    }

    cards.push(article);
    objectRoot.append(article);
  }
};

const applyFilters = () => {
  const typeValue = typeFilter.value;
  const dispositionValue = dispositionFilter.value;
  let visibleCount = 0;

  for (const card of cards) {
    const visible = (typeValue === "all" || card.dataset.objectType === typeValue)
      && (dispositionValue === "all" || card.dataset.disposition === dispositionValue);
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  }

  emptyState.hidden = visibleCount !== 0;
};

const renderOriginals = async () => {
  try {
    const response = await fetch("./originals/manifest.json");
    if (!response.ok) throw new Error(`manifest request failed: ${response.status}`);
    const manifest = await response.json();

    for (const snapshot of manifest.snapshots ?? []) {
      const article = document.createElement("article");
      article.className = "phase-card";
      const source = `PR #${snapshot.pullRequest} · ${String(snapshot.commit).slice(0, 7)}`;
      article.append(
        makeText("p", "phase-index", source),
        makeText("h3", "", snapshot.title ?? snapshot.slug),
        makeText("p", "", "固定 commit 重新建置後保存的原始輸出。"),
      );
      const footer = document.createElement("footer");
      const link = makeText("a", "button", "開啟原始實作");
      link.href = `./${snapshot.path.replace(/^\/research-history\//, "")}`;
      footer.append(link);
      article.append(footer);
      originalRoot.append(article);
    }
  } catch (error) {
    originalRoot.append(makeText("p", "archive-error", `無法載入原始快照清單：${error.message}`));
  }
};

objectCount.textContent = `${catalog.objects.length} 個研究物件`;
executableCount.textContent = `${catalog.objects.filter((object) => object.entrypoint).length} 個可執行入口`;
studyCount.textContent = `${catalog.objects.filter((object) => object.objectType === "study").length} 個研究工具`;

renderFamilies();
renderObjects();
renderOriginals();

typeFilter.addEventListener("change", applyFilters);
dispositionFilter.addEventListener("change", applyFilters);
applyFilters();
