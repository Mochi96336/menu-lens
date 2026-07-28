import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/18c-tap-to-read/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("tap-to-read-landscape.css", archiveRoot), "utf8");
const report = JSON.parse(await readFile(new URL("review-assets/18c/browser-report.json", archiveRoot), "utf8"));

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../tap-to-read-landscape.css" />',
  'data-activation="category-entry"',
  'class="landscape-sheet landscape-sheet--equal-columns"',
  'header.dataset.tapEntry = "true"',
  '`閱讀${menu.categories[categoryIndex].name}，${categoryCounts[categoryIndex]} 道料理`',
  'header.tabIndex = overviewMode ? 0 : -1',
  'button.tabIndex = readable ? 0 : -1',
  'button.inert = overviewMode',
  'button.setAttribute("aria-hidden", String(overviewMode))',
  'if (scale !== "overview") return',
  'if (scale !== "reading") return',
  'window.createSpatialDragController',
]) {
  assert.ok(html.includes(required), `18C is missing its category-entry contract: ${required}`);
}
for (const forbidden of [
  'semantic-overview',
  'data-detail-placement="inline"',
  'inline-paper-detail',
  'button.after(detail)',
  '--weighted-columns',
  '--weighted-rows',
]) {
  assert.ok(!html.includes(forbidden), `18C must not inherit semantic, inline-detail or weighting behavior: ${forbidden}`);
}
for (const requiredStyle of [
  '[data-tap-entry="true"]::after',
  'content: "閱讀"',
  '#landscape-viewport[data-scale="overview"] .paper-product',
  'pointer-events: none',
]) {
  assert.ok(styles.includes(requiredStyle), `18C is missing activation styling: ${requiredStyle}`);
}
for (const forbiddenStyle of ["semantic-overview", "inline-paper-detail", "--weighted-columns", "writing-mode"]) {
  assert.ok(!styles.includes(forbiddenStyle), `18C stylesheet must remain activation-only: ${forbiddenStyle}`);
}

assert.equal(Object.keys(report.viewports).length, 3, "18C browser report must cover three viewports.");
for (const [viewport, result] of Object.entries(report.viewports)) {
  assert.equal(result.maximumColumnDelta, 0, `18C ${viewport} column geometry must match parent 18.`);
  assert.equal(result.maximumCategoryDelta, 0, `18C ${viewport} category geometry must match parent 18.`);
  assert.equal(result.maximumProductDelta, 0, `18C ${viewport} Product geometry must match parent 18.`);
}
assert.equal(report.states.overview.headerCount, 6);
assert.equal(report.states.overview.headerTabStops, 6);
assert.equal(report.states.overview.productCount, 30);
assert.equal(report.states.overview.productTabStops, 0);
assert.equal(report.states.overview.inertProducts, 30);
assert.equal(report.states.overview.hiddenProducts, 30);
assert.equal(report.states.overview.pointerEvents, "none");
assert.equal(report.states.arrowReading.activeColumnIndex, 1);
assert.equal(report.states.categoryReading.headerTabStops, 0);
assert.equal(report.states.categoryReading.productTabStops, 6);
assert.equal(report.states.detailClose.focusReturned, true);
assert.equal(report.states.reset.headerTabStops, 6);
assert.equal(report.states.reset.productTabStops, 0);
assert.deepEqual(report.identity, { categoryCount: 6, productCount: 30, uniqueProductCount: 30 });

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("18C tap-to-read validation passed: six category entries, zero overview Product actions, unchanged parent geometry and no mechanism composition.");
