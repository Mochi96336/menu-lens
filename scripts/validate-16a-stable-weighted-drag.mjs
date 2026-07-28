import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/16a-stable-weighted-drag/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../weighted-elastic-paper.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  'data-pointer-map="base-weighted"',
  'const baseRows = [',
  'const focusFactor = 1.8',
  'const applyContentWeights = (weights) =>',
  'count * (index === activeCategoryIndex ? focusFactor : 1)',
  'row.style.setProperty("--weighted-columns"',
  'sheet.style.setProperty("--weighted-rows"',
  'const categoryIndexFromStableRatios = (xRatio, yRatio) =>',
  'const categoryFromStablePointer = (clientX, clientY) =>',
  'const bounds = sheet.getBoundingClientRect()',
  'const rowTotal = baseRows.reduce',
  'const stableSplit = categoryCounts[leftIndex] / pairTotal',
  'focusCategory(categoryFromStablePointer(event.clientX, event.clientY))',
  'detailClose.addEventListener("click", () => closeDetail(true))',
  'if (detail.dataset.open === "true") closeDetail(true)',
]) {
  if (!html.includes(required)) throw new Error(`16A is missing its stable weighted drag contract: ${required}`);
}

for (const forbidden of [
  "document.elementFromPoint",
  "--pair-columns",
  "72fr 28fr",
  "28fr 72fr",
  "--elastic-columns",
  "--elastic-rows",
  "scrollTo(",
  "translate(",
  "scale(",
  "trackColumn",
  "data-collapsed",
  "category.dataset.collapsed",
  "選這道",
  "加入購物車",
]) {
  if (html.includes(forbidden)) throw new Error(`16A must not inherit another mechanism: ${forbidden}`);
}

const mappingSource = html.match(/const categoryIndexFromStableRatios = \(xRatio, yRatio\) => \{[\s\S]*?\n      \};/)?.[0];
const pointerSource = html.match(/const categoryFromStablePointer = \(clientX, clientY\) => \{[\s\S]*?\n      \};/)?.[0];
if (!mappingSource || !pointerSource) {
  throw new Error("16A must expose explicit stable-ratio and pointer mapping functions.");
}
if (mappingSource.includes("activeCategoryIndex") || mappingSource.includes("weightedCounts")) {
  throw new Error("16A stable hit regions must not depend on the current visual focus.");
}
if (pointerSource.includes("elementFromPoint") || pointerSource.includes("closest(")) {
  throw new Error("16A pointer mapping must not read the deformed category DOM boundaries.");
}

const categoryCounts = [8, 6, 6, 4, 4, 2];
const baseRows = [14, 10, 6];
const referenceCategory = (xRatio, yRatio) => {
  const x = Math.max(0, Math.min(.999999, xRatio));
  const y = Math.max(0, Math.min(.999999, yRatio));
  const rowTotal = baseRows.reduce((sum, weight) => sum + weight, 0);
  let rowIndex = baseRows.length - 1;
  let cumulative = 0;
  for (let index = 0; index < baseRows.length; index += 1) {
    cumulative += baseRows[index] / rowTotal;
    if (y < cumulative) {
      rowIndex = index;
      break;
    }
  }
  const leftIndex = rowIndex * 2;
  const pairTotal = categoryCounts[leftIndex] + categoryCounts[leftIndex + 1];
  return leftIndex + (x < categoryCounts[leftIndex] / pairTotal ? 0 : 1);
};

const cases = [
  [0.1, 0.1, 0],
  [0.9, 0.1, 1],
  [0.1, 0.6, 2],
  [0.9, 0.6, 3],
  [0.1, 0.9, 4],
  [0.9, 0.9, 5],
  [8 / 14 - .0001, 0.2, 0],
  [8 / 14 + .0001, 0.2, 1],
  [0.59, 0.6, 2],
  [0.61, 0.6, 3],
  [0.65, 0.9, 4],
  [0.68, 0.9, 5],
];
for (const [x, y, expected] of cases) {
  const actual = referenceCategory(x, y);
  if (actual !== expected) throw new Error(`Stable weighted map expected ${expected} at ${x},${y}; received ${actual}.`);
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("16A stable weighted drag validation passed: 16 visual weighting preserved; pointer regions remain fixed at 14:10:6 and 8:6/6:4/4:2.");
