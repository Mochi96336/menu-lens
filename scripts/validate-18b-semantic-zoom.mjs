import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/18b-semantic-zoom/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("semantic-landscape-overview.css", archiveRoot), "utf8");
const report = JSON.parse(await readFile(new URL("review-assets/18b/browser-report.json", archiveRoot), "utf8"));

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../semantic-landscape-overview.css" />',
  '<script src="../../spatial-drag.js"></script>',
  'class="landscape-sheet landscape-sheet--equal-columns"',
  'column.style.setProperty("--column-count", 1)',
  'column.style.setProperty("--column-rows", `${firstCount}fr ${secondCount}fr`)',
  'overview.className = "semantic-overview"',
  'overview.dataset.overviewSummary = categoryData.id',
  'copy.textContent = categoryData.summary',
  'scope.textContent = `完整 ${products.length} 道料理 · 放大後閱讀`',
  'viewport.dataset.scale = scale',
  'window.enableMenuLensHorizontalDrag',
]) {
  assert.ok(html.includes(required), `18B is missing its semantic-overview contract: ${required}`);
}
for (const forbidden of [
  'data-activation="category-entry"',
  'data-detail-placement="inline"',
  'data-tap-entry',
  'inline-paper-detail',
  'button.after(detail)',
  '--weighted-columns',
  '--weighted-rows',
]) {
  assert.ok(!html.includes(forbidden), `18B must not inherit activation, inline-detail or weighting behavior: ${forbidden}`);
}
for (const requiredStyle of [
  '.semantic-overview',
  '[data-scale="overview"] .paper-product',
  '[data-scale="reading"] .semantic-overview',
]) {
  assert.ok(styles.includes(requiredStyle), `18B is missing semantic-overview styling: ${requiredStyle}`);
}
for (const forbiddenStyle of ["data-tap-entry", "inline-paper-detail", "--weighted-columns", "writing-mode"]) {
  assert.ok(!styles.includes(forbiddenStyle), `18B stylesheet must remain information-only: ${forbiddenStyle}`);
}

assert.equal(Object.keys(report.viewports).length, 3, "18B browser report must cover three viewports.");
for (const [viewport, result] of Object.entries(report.viewports)) {
  assert.equal(result.maximumColumnDelta, 0, `18B ${viewport} column geometry must match parent 18.`);
  assert.equal(result.maximumCategoryDelta, 0, `18B ${viewport} category geometry must match parent 18.`);
  assert.equal(result.child.summaries.length, 6, `18B ${viewport} must expose six fixture-backed summaries.`);
  assert.equal(result.child.firstProductOpacity, "0", `18B ${viewport} overview Product text must be visually replaced.`);
  assert.equal(result.parent.productIds.length, 30, `18B ${viewport} parent must retain 30 Products.`);
  assert.deepEqual(result.child.productIds, result.parent.productIds, `18B ${viewport} Product identity drifted.`);
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("18B semantic landscape validation passed: fixture-backed overview summaries, unchanged parent geometry and no activation/detail composition.");
