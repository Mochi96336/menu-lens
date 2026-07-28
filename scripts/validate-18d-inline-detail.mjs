import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/18d-inline-detail/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("inline-detail-landscape.css", archiveRoot), "utf8");
const report = JSON.parse(await readFile(new URL("review-assets/18d/browser-report.json", archiveRoot), "utf8"));

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../inline-detail-landscape.css" />',
  'data-detail-placement="inline"',
  'class="paper-detail inline-paper-detail"',
  'data-placement="inline"',
  'const detailHome = document.createComment("inline-detail-home")',
  'detail.before(detailHome)',
  'button.setAttribute("aria-controls", "landscape-detail")',
  'button.setAttribute("aria-expanded", "false")',
  'detailHome.after(detail)',
  'button.after(detail)',
  'productContainer.dataset.inlineDetailOpen = "true"',
  'detail.dataset.open = "true"',
  'window.createSpatialDragController',
]) {
  assert.ok(html.includes(required), `18D is missing its inline-detail contract: ${required}`);
}
for (const forbidden of [
  'semantic-overview',
  'data-activation="category-entry"',
  'data-tap-entry',
  '--weighted-columns',
  '--weighted-rows',
]) {
  assert.ok(!html.includes(forbidden), `18D must not inherit semantic, activation or weighting behavior: ${forbidden}`);
}
for (const requiredStyle of [
  '#landscape-detail.inline-paper-detail',
  'position: static',
  'grid-column: 1 / -1',
  '[data-inline-detail-open="true"]',
  'overflow-y: auto',
  '.paper-product[aria-expanded="true"]',
]) {
  assert.ok(styles.includes(requiredStyle), `18D is missing inline-detail styling: ${requiredStyle}`);
}
for (const forbiddenStyle of ["semantic-overview", "data-tap-entry", "--weighted-columns", "writing-mode"]) {
  assert.ok(!styles.includes(forbiddenStyle), `18D stylesheet must remain detail-placement-only: ${forbiddenStyle}`);
}

assert.equal(Object.keys(report.viewports).length, 3, "18D browser report must cover three viewports.");
for (const [viewport, result] of Object.entries(report.viewports)) {
  assert.equal(result.maximumColumnDelta, 0, `18D ${viewport} closed column geometry must match parent 18.`);
  assert.equal(result.maximumCategoryDelta, 0, `18D ${viewport} closed category geometry must match parent 18.`);
  assert.equal(result.maximumProductDelta, 0, `18D ${viewport} closed Product geometry must match parent 18.`);
  assert.equal(result.childOpenColumnDelta, 0, `18D ${viewport} open column geometry must match parent reading state.`);
  assert.equal(result.childOpenCategoryDelta, 0, `18D ${viewport} open category geometry must match parent reading state.`);
  assert.equal(result.childOpen.detailPlacement.placement, "inline");
  assert.equal(result.childOpen.detailPlacement.position, "static");
  assert.equal(result.childOpen.detailPlacement.adjacentToSource, true);
  assert.equal(result.childOpen.detailPlacement.containedByCategory, true);
  assert.equal(result.childOpen.detailPlacement.visibleRatio, 1);
  assert.equal(result.childOpen.detailPlacement.siblingOverlaps, 0);
  assert.equal(result.childOpen.detailPlacement.sourceGap, 0);
}
assert.equal(report.states.firstActivation.scale, "reading");
assert.equal(report.states.firstActivation.detailOpen, "false");
assert.equal(report.states.firstOpen.adjacentToSource, true);
assert.equal(report.states.firstOpen.siblingOverlaps, 0);
assert.equal(report.states.firstOpen.sourceGap, 0);
assert.equal(report.states.movedDetail.selectedCount, 1);
assert.equal(report.states.movedDetail.expandedCount, 1);
assert.equal(report.states.close.focusReturned, true);
assert.equal(report.states.escapeClose.scale, "reading");
assert.equal(report.states.escapeClose.focusReturned, true);
assert.equal(report.states.columnChange.open, "false");
assert.equal(report.states.reset.scale, "overview");
assert.equal(report.states.reset.selectedCount, 0);
assert.deepEqual(report.identity, { categoryCount: 6, productCount: 30, uniqueProductCount: 30 });

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("18D inline-detail validation passed: source-adjacent contained disclosure, zero sibling overlap, unchanged parent geometry and no mechanism composition.");
