import { access, readFile } from "node:fs/promises";
import { loadArchiveCatalog, root } from "./load-catalog.mjs";

const catalog = await loadArchiveCatalog();
const archiveRoot = new URL("research-history/", root);

const requiredPaths = new Set([
  "index.html",
  "archive-index.css",
  "history.css",
  "prototype-registry.js",
  "model-page.css",
  "model-page-workbench.css",
  "model-live-surface.mjs",
  "model-page-state.mjs",
  "model-surface-pool.mjs",
  "model-live-board.mjs",
  "model-object-inspector.mjs",
  "model-page.mjs",
  "model-page-humanized.mjs",
  "models/index.html",
  "catalog/index.mjs",
  "catalog/extensions.mjs",
  "catalog/landscape-ablations.mjs",
  "catalog/closure-intakes.mjs",
  "catalog/all-extensions.mjs",
  "catalog/presentation-models.mjs",
  "catalog/render-index.mjs",
  "originals/manifest.json",
]);

for (const object of catalog.objects) {
  if (object.entrypoint) requiredPaths.add(object.entrypoint);
  if (object.reviewDocument) requiredPaths.add(object.reviewDocument);
  if (object.evidencePath) requiredPaths.add(object.evidencePath);
  for (const asset of [...object.assets.styles, ...object.assets.scripts]) requiredPaths.add(asset);
}

await Promise.all([...requiredPaths].map((path) => access(new URL(path, archiveRoot))));

const [
  index,
  renderer,
  loader,
  modelPage,
  modelRenderer,
  modelHumanization,
  liveSurface,
  pageState,
  surfacePool,
  liveBoard,
  inspector,
] = await Promise.all([
  readFile(new URL("index.html", archiveRoot), "utf8"),
  readFile(new URL("catalog/render-index.mjs", archiveRoot), "utf8"),
  readFile(new URL("scripts/archive/load-catalog.mjs", root), "utf8"),
  readFile(new URL("models/index.html", archiveRoot), "utf8"),
  readFile(new URL("model-page.mjs", archiveRoot), "utf8"),
  readFile(new URL("model-page-humanized.mjs", archiveRoot), "utf8"),
  readFile(new URL("model-live-surface.mjs", archiveRoot), "utf8"),
  readFile(new URL("model-page-state.mjs", archiveRoot), "utf8"),
  readFile(new URL("model-surface-pool.mjs", archiveRoot), "utf8"),
  readFile(new URL("model-live-board.mjs", archiveRoot), "utf8"),
  readFile(new URL("model-object-inspector.mjs", archiveRoot), "utf8"),
]);

for (const contract of [
  '<script src="./prototype-registry.js"></script>',
  '<script type="module" src="./catalog/render-index.mjs"></script>',
  'id="archive-objects"',
  'id="archive-families"',
  'id="archive-originals"',
  'id="object-count"',
  'id="executable-count"',
  'id="study-count"',
  'id="type-filter"',
  'id="disposition-filter"',
  'id="catalog-empty"',
  'href="./models/?model=landscape-paper"',
]) {
  if (!index.includes(contract)) throw new Error(`Archive index is missing v2 contract: ${contract}`);
}

for (const contract of [
  '<link rel="stylesheet" href="../model-page.css" />',
  '<link rel="stylesheet" href="../model-page-workbench.css" />',
  '<script src="../prototype-registry.js"></script>',
  '<script type="module" src="../model-page-humanized.mjs"></script>',
  'id="model-select"',
  'id="section-tabs"',
  'id="model-object-title"',
  'id="object-select"',
  'id="show-all"',
  'id="viewport-select"',
  'id="compare-parent"',
  'id="all-live-board"',
  'id="inspector-tabs"',
  'id="inspector-panel-summary"',
  'id="inspector-panel-relations"',
  'id="inspector-panel-records"',
]) {
  if (!modelPage.includes(contract)) throw new Error(`Design model page is missing refactor contract: ${contract}`);
}

if (!modelHumanization.includes('import "./model-page.mjs";')) {
  throw new Error("Humanized Model bootstrap must extend the canonical coordinator.");
}

for (const obsolete of [
  'id="variant-list"',
  'class="model-sidebar"',
  'id="lineage"',
  'id="record-links"',
  'id="view-all"',
  'id="view-focus"',
  'class="model-toolbar"',
  "在共同母體內比較，不把每個 ablation 當成獨立方案。",
  "看見 parent、同組物件與明確關係，不靠記憶往返頁面。",
  "模型頁負責理解，原始物件仍保持可追溯。",
]) {
  if (modelPage.includes(obsolete)) throw new Error(`Design model page retains obsolete hierarchy: ${obsolete}`);
}

for (const contract of [
  "buildArchiveCatalog",
  "designModels",
  "presentationNotes",
  "createModelPageState",
  "createModelSurfacePool",
  "createModelLiveBoard",
  "createModelObjectInspector",
  "board.render",
]) {
  if (!modelRenderer.includes(contract)) throw new Error(`Design model coordinator is missing contract: ${contract}`);
}

for (const [source, contracts, label] of [
  [liveSurface, ["defaultTargetSelectors", "isolateTarget", "model-live-ready", "ResizeObserver", "waitForImages"], "live surface"],
  [pageState, ["createModelPageState", "replaceFromLocation", "commitUrl", "viewMode"], "page state"],
  [surfacePool, ["createModelSurfacePool", "prune", "destroy"], "surface pool"],
  [liveBoard, ["createModelLiveBoard", "syncSection", "viewMode", "render"], "live board"],
  [inspector, ["createModelObjectInspector", "renderRelations", "renderRecords", "setTab"], "object inspector"],
]) {
  for (const contract of contracts) {
    if (!source.includes(contract)) throw new Error(`${label} module is missing contract: ${contract}`);
  }
}

for (const source of [renderer, loader, modelRenderer]) {
  if (!source.includes("archiveExtensions") || !source.includes("all-extensions.mjs")) {
    throw new Error("Browser renderers and Node loader must consume catalog/all-extensions.mjs.");
  }
}

for (const object of catalog.objects.filter((item) => item.entrypoint)) {
  const literalHref = `href="./${object.entrypoint.replace(/index\.html$/, "")}`;
  if (index.includes(literalHref)) {
    throw new Error(`Archive index must not hand-maintain catalog link ${literalHref}`);
  }
}

if (renderer.includes('review.href = `../')) {
  throw new Error("Archive review links must remain relative to the published research-history root.");
}

console.log(`Archive entrypoints: ${requiredPaths.size} paths verified, including the humanized pooled-surface Model workbench.`);
