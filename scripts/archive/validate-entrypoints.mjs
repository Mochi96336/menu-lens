import { readFile } from "node:fs/promises";
import { root } from "./load-catalog.mjs";

const index = await readFile(new URL("research-history/index.html", root), "utf8");
const indexRenderer = await readFile(new URL("research-history/index.mjs", root), "utf8");
const modelPage = await readFile(new URL("research-history/models/index.html", root), "utf8");
const modelRenderer = await readFile(new URL("research-history/model-page.mjs", root), "utf8");
const modelHumanization = await readFile(new URL("research-history/model-page-humanized.mjs", root), "utf8");
const conceptVignette = await readFile(new URL("research-history/model-concept-vignette.mjs", root), "utf8");
const routeDiagram = await readFile(new URL("research-history/model-route-diagram.mjs", root), "utf8");
const routeDiagramCss = await readFile(new URL("research-history/model-route-diagram.css", root), "utf8");
const routeOverlayCss = await readFile(new URL("research-history/model-route-overlay.css", root), "utf8");
const modelWorkbenchCss = await readFile(new URL("research-history/model-page-workbench.css", root), "utf8");
const modelPageCss = await readFile(new URL("research-history/model-page.css", root), "utf8");
const liveSurface = await readFile(new URL("research-history/model-live-surface.mjs", root), "utf8");
const liveBoard = await readFile(new URL("research-history/model-live-board.mjs", root), "utf8");
const inspector = await readFile(new URL("research-history/model-object-inspector.mjs", root), "utf8");
const surfacePool = await readFile(new URL("research-history/model-surface-pool.mjs", root), "utf8");
const previewGenerator = await readFile(new URL("scripts/archive/generate-model-previews.mjs", root), "utf8");
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));

for (const contract of [
  '<script type="module" src="./index.mjs"></script>',
  'id="catalog-list"',
  'id="family-count"',
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
  throw new Error("Humanized Model bootstrap must extend the canonical renderer.");
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
  "archiveExtensions",
  "archiveLegacyOverrides",
  "objectLabel",
  "dispositionLabels",
  "evidenceLabels",
  "renderFilters",
  "renderCatalog",
]) {
  if (!indexRenderer.includes(contract)) throw new Error(`Archive renderer is missing v2 contract: ${contract}`);
}

for (const contract of [
  "createModelPageState",
  "createModelSurfacePool",
  "createModelLiveBoard",
  "createModelObjectInspector",
  "createModelRouteDiagram",
  "createModelConceptVignette",
  "syncSurface",
  "renderConcept",
  "renderBoard",
  "renderInspector",
  "historyMode",
]) {
  if (!modelRenderer.includes(contract)) throw new Error(`Design model renderer is missing refactor contract: ${contract}`);
}

for (const contract of ["createModelConceptVignette", "dataset.sectionId", "presentation.sections"]){
  if (!conceptVignette.includes(contract)) throw new Error(`Concept vignette is missing contract: ${contract}`);
}
for (const contract of ["createModelRouteDiagram", "onPreview", "onPreviewEnd", "aria-selected"]){
  if (!routeDiagram.includes(contract)) throw new Error(`Route diagram is missing contract: ${contract}`);
}
for (const contract of ["model-route", "model-route-node", "model-route-edge"]){
  if (!routeDiagramCss.includes(contract)) throw new Error(`Route diagram CSS is missing contract: ${contract}`);
}
for (const contract of ["model-route-overlay", "pointer-events: none"]){
  if (!routeOverlayCss.includes(contract)) throw new Error(`Route overlay CSS is missing contract: ${contract}`);
}
for (const contract of ["model-live-board", "model-live-card", "model-pooled-surface"]){
  if (!modelWorkbenchCss.includes(contract)) throw new Error(`Workbench CSS is missing contract: ${contract}`);
}
for (const contract of ["model-page", "model-masthead", "model-workbench"]){
  if (!modelPageCss.includes(contract)) throw new Error(`Model page CSS is missing contract: ${contract}`);
}
for (const contract of ["createModelLiveSurface", "model-live-frame", "modelLivePresentationFor"]){
  if (!liveSurface.includes(contract)) throw new Error(`Live surface is missing contract: ${contract}`);
}
for (const contract of ["createModelLiveBoard", "syncSurface", "model-live-card__select"]){
  if (!liveBoard.includes(contract)) throw new Error(`Live board is missing contract: ${contract}`);
}
for (const contract of ["createModelObjectInspector", "renderSummary", "renderRelations", "renderRecords"]){
  if (!inspector.includes(contract)) throw new Error(`Inspector is missing contract: ${contract}`);
}
for (const contract of ["createModelSurfacePool", "acquire", "release"]){
  if (!surfacePool.includes(contract)) throw new Error(`Surface pool is missing contract: ${contract}`);
}
for (const contract of ["generate-model-previews", "Page.captureScreenshot", "390"]){
  if (!previewGenerator.includes(contract)) throw new Error(`Preview generator is missing contract: ${contract}`);
}

if (!packageJson.scripts?.build?.includes("build-static.mjs")) {
  throw new Error("Build script must generate the static archive.");
}

console.log("Archive entrypoints validator: index and humanized Model viewer expose the required v2 contracts.");
