import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { loadArchiveCatalog, root } from "./archive/load-catalog.mjs";

const archive = new URL("research-history/", root);
const read = (path) => readFile(new URL(path, archive), "utf8");
const [catalog, page, styles, controller, fixtureSource, rendererSource, reportSource] = await Promise.all([
  loadArchiveCatalog(),
  read("phases/12a-semantic-paper-field/index.html"),
  read("semantic-paper-field.css"),
  read("semantic-paper-field.js"),
  read("menu-fixture.js"),
  read("paper-menu-field-renderer.js"),
  read("review-assets/12a/browser-report.json"),
]);
await Promise.all([
  access(new URL("records/12a/index.html", archive)),
  access(new URL("review-assets/12a/overview-320-comparison-pr.svg", archive)),
  access(new URL("review-assets/12a/overview-390-comparison-pr.svg", archive)),
  access(new URL("review-assets/12a/overview-desktop-comparison-pr.svg", archive)),
  access(new URL("review-assets/12a/states-390-comparison-pr.svg", archive)),
  access(new URL("docs/research-history/12a-semantic-paper-field-review.md", root)),
]);

const object = catalog.objects.find((entry) => entry.id === "12A");
assert.ok(object, "Archive v2 catalog must contain 12A.");
for (const [field, expected] of Object.entries({
  family: "matrix-paper",
  objectType: "prototype",
  researchParentId: "12",
  disposition: "keep-controlled",
  evidenceState: "browser-verified",
  entrypoint: "phases/12a-semantic-paper-field/index.html",
  validationProfile: "semantic-paper-field",
  reviewDocument: "records/12a/index.html",
  evidencePath: "review-assets/12a/browser-report.json",
  sourcePr: 10,
  sourceCommit: "595b95e3f6a65c6acdea6b3201236a149ece8cfa",
})) assert.equal(object[field], expected, `12A.${field} drifted.`);
assert.deepEqual([...object.assets.styles], ["history.css", "paper-menu-field.css", "semantic-paper-field.css"]);
assert.deepEqual([...object.assets.scripts], ["menu-fixture.js", "paper-menu-field-renderer.js", "semantic-paper-field.js"]);

for (const contract of [
  '<link rel="stylesheet" href="../../paper-menu-field.css" />',
  '<link rel="stylesheet" href="../../semantic-paper-field.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../semantic-paper-field.js" defer></script>',
  'data-information-level="overview"',
  "2×3 grid",
  "2.05 scale cap",
  "translate + scale camera",
]) assert.ok(page.includes(contract), `12A page is missing ${contract}.`);
for (const forbidden of ["Candidate workspace", "加入購物車", "選這道", "checkout", "order action"]) {
  assert.ok(!page.includes(forbidden), `12A must not introduce ${forbidden}.`);
}
for (const contract of [
  'viewport.dataset.informationLevel = "overview"',
  'viewport.dataset.informationLevel = "near"',
  'viewport.dataset.informationLevel = "reading"',
  "Math.min(",
  "2.05",
  "translate(${translateX}px, ${translateY}px) scale(${scale})",
  "sheet.inert = true",
  "detailClose.focus",
  "closeDetail(true)",
]) assert.ok(controller.includes(contract), `12A controller is missing ${contract}.`);
for (const forbidden of ["gridTemplateColumns", "gridTemplateRows", "--paper-columns", "--paper-rows", "scrollTo(", "scrollLeft", "elementFromPoint", "localStorage", "sessionStorage", "fetch("]) {
  assert.ok(!controller.includes(forbidden), `12A must not alter paper geometry, add another camera or persist data: ${forbidden}`);
}
for (const forbidden of ["--paper-columns", "--paper-rows", ".paper-sheet {", ".paper-category { flex", "perspective:"]) {
  assert.ok(!styles.includes(forbidden), `12A semantic stylesheet must not redefine parent paper geometry: ${forbidden}`);
}
assert.ok(styles.includes("data-information-level=\"overview\"") || styles.includes('data-information-level="overview"'));
assert.ok(styles.includes("data-information-level=\"near\"") || styles.includes('data-information-level="near"'));

const sandbox = { window: {} };
runInNewContext(fixtureSource, sandbox, { filename: "menu-fixture.js" });
runInNewContext(rendererSource, sandbox, { filename: "paper-menu-field-renderer.js" });
const menu = sandbox.window.menuLensResearchMenu;
const markup = sandbox.window.renderMenuLensPaperField(menu);
const productIds = [...markup.matchAll(/data-product-id="([^"]+)"/g)].map((match) => match[1]);
assert.equal(menu.categories.length, 6);
assert.equal(productIds.length, 30);
assert.equal(new Set(productIds).size, 30);

const report = JSON.parse(reportSource);
for (const width of ["320", "390", "1280"]) {
  assert.ok(report.geometry[width].overview_max_delta <= 0.001, `${width} overview geometry drifted.`);
  assert.ok(report.geometry[width].focus_max_delta <= 0.001, `${width} focus geometry drifted.`);
}
assert.deepEqual(report.states, {
  overview: "overview",
  near: "near",
  reading: "reading",
  reset: "overview",
  detail_close_preserves_transform: true,
});
assert.equal(report.accessibility.overview_tabbable_products, 0);
assert.equal(report.accessibility.near_tabbable_products, 8);
assert.equal(report.accessibility.detail_focus, "close button");
assert.equal(report.accessibility.escape_returns, "origin product");
assert.equal(report.accessibility.reduced_motion_transition, "0s");
assert.deepEqual(report.fixture, { categories: 6, products: 30, unique_products: 30 });

console.log("12A semantic paper validation passed: fixed geometry, scale-specific information, complete fixture and bounded browser evidence.");
