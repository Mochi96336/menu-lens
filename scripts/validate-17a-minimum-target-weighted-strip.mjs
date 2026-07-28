import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/17a-minimum-target-weighted-strip/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("minimum-target-weighted-strip.css", archiveRoot), "utf8");
const parentStyles = await readFile(new URL("weighted-horizontal-strip.css", archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../weighted-horizontal-strip.css" />',
  '<link rel="stylesheet" href="../../minimum-target-weighted-strip.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  'class="weighted-strip minimum-target-strip"',
  "const focusFactor = 4",
  'const minimumTargetWidth = "2.5rem"',
  'categoryCounts[index] * (focused ? focusFactor : 1)',
  'category.style.setProperty("--strip-weight", weight)',
  'category.style.setProperty("--minimum-target-width", minimumTargetWidth)',
  "document.elementFromPoint(clientX, clientY)",
  "window.renderMenuLensPaperField(menu)",
  'aria-label="上一個分類"',
  'aria-label="下一個分類"',
]) {
  if (!html.includes(required)) throw new Error(`17A is missing its minimum-target contract: ${required}`);
}

for (const requiredStyle of [
  ".minimum-target-strip .paper-category",
  "min-width: var(--minimum-target-width, 2.5rem);",
]) {
  if (!styles.includes(requiredStyle)) throw new Error(`17A is missing its target-floor style: ${requiredStyle}`);
}

for (const inheritedStyle of [
  "display: flex;",
  "flex: var(--strip-weight, 1) 1 0;",
  "overflow: hidden;",
]) {
  if (!parentStyles.includes(inheritedStyle)) throw new Error(`17A must inherit 17's strip geometry: ${inheritedStyle}`);
}

for (const forbidden of [
  "categoryFromStablePointer",
  "baseCumulative",
  "focusFactor = 1.8",
  "72fr 28fr",
  "28fr 72fr",
  "scrollTo(",
  "scrollLeft",
  "snapTo",
  "trackColumn",
  "data-collapsed",
  "category.dataset.collapsed",
]) {
  if (html.includes(forbidden)) throw new Error(`17A must not inherit another variant's mechanism: ${forbidden}`);
}

if (styles.includes("overflow-x") || styles.includes("transform:")) {
  throw new Error("17A must remain a single non-scrolling strip without camera transforms.");
}

if (html.includes("選這道") || html.includes("加入購物車")) {
  throw new Error("17A must remain a menu-reading study without an order action.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("17A validation passed: 17 weighting and ×4 focus preserved, six 2.5rem target floors added, no stable mapping or camera behavior.");
