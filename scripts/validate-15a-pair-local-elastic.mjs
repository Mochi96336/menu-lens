import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/15a-pair-local-elastic/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const styles = await readFile(new URL("pair-local-elastic.css", archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../paper-menu-field.css" />',
  '<link rel="stylesheet" href="../../pair-local-elastic.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  'row.className = "pair-local-row"',
  'row.style.setProperty("--pair-columns", "1fr 1fr")',
  'activeSide === 0 ? "72fr 28fr" : "28fr 72fr"',
  'const resetPairWidths = () =>',
  'Math.floor(activeCategoryIndex / 2)',
  'window.renderMenuLensPaperField(menu)',
  'focusCategory(activeCategoryIndex - 1)',
  'focusCategory(activeCategoryIndex + 1)',
]) {
  if (!html.includes(required)) throw new Error(`15A is missing its pair-local contract: ${required}`);
}

for (const forbidden of [
  '--elastic-columns',
  '--elastic-rows',
  '62fr',
  '19fr',
  'focusFactor',
  'weightedCounts',
  '--weighted-columns',
  '--weighted-rows',
  'scrollTo(',
  'translate(',
  'scale(',
  'trackColumn',
  'data-collapsed',
]) {
  if (html.includes(forbidden)) throw new Error(`15A must not inherit global, weighted, camera, or collapse behavior: ${forbidden}`);
}

for (const requiredStyle of [
  'grid-template-rows: repeat(3, minmax(0, 1fr));',
  'grid-template-columns: var(--pair-columns, 1fr 1fr);',
  'transition: grid-template-columns 220ms',
  '.pair-local-viewport.is-dragging .pair-local-row { transition: none; }',
  '@media (prefers-reduced-motion: reduce)',
]) {
  if (!styles.includes(requiredStyle)) throw new Error(`15A is missing its fixed-row presentation contract: ${requiredStyle}`);
}

for (const forbiddenStyle of [
  'grid-template-columns: var(--elastic-columns',
  'grid-template-rows: var(--elastic-rows',
  'grid-template-rows: var(--weighted-rows',
  'flex-grow',
  'transform: scale',
]) {
  if (styles.includes(forbiddenStyle)) throw new Error(`15A must not change whole-sheet geometry or use visual scaling: ${forbiddenStyle}`);
}

const focusCategorySource = html.match(/const focusCategory = \(nextIndex\) => \{[\s\S]*?\n      \};/)?.[0];
const resetPairWidthsSource = html.match(/const resetPairWidths = \(\) => \{[\s\S]*?\n      \};/)?.[0];
const showOverviewSource = html.match(/const showOverview = \(\) => \{[\s\S]*?\n      \};/)?.[0];
if (!focusCategorySource || !resetPairWidthsSource || !showOverviewSource) {
  throw new Error("15A must expose explicit focus, pair reset, and overview functions for validation.");
}
if (focusCategorySource.includes("sheet.style") || focusCategorySource.includes("grid-template-rows")) {
  throw new Error("15A focus must not rewrite whole-sheet columns or row heights.");
}
if (!focusCategorySource.includes('rows[activeRowIndex].style.setProperty(')) {
  throw new Error("15A focus must write only the active row's pair width.");
}
if (!resetPairWidthsSource.includes('rows.forEach((row) =>') || !resetPairWidthsSource.includes('"1fr 1fr"')) {
  throw new Error("15A must restore every row to an equal pair before applying a new focus.");
}
if (!showOverviewSource.includes("resetPairWidths()")) {
  throw new Error("15A overview must restore all pair boundaries.");
}

if (html.includes("選這道") || html.includes("加入購物車") || html.includes("Candidate")) {
  throw new Error("15A must remain a menu-reading study without decision or order state.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("15A pair-local validation passed: fixed three rows, one active 72:28 pair, no global grid or camera movement.");
