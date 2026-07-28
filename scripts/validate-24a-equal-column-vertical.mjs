import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const path = "phases/24a-equal-column-vertical/index.html";
const html = await readFile(new URL(path, archiveRoot), "utf8");
const verticalStyles = await readFile(new URL("vertical-landscape.css", archiveRoot), "utf8");
const landscapeStyles = await readFile(new URL("landscape-paper.css", archiveRoot), "utf8");

for (const required of [
  '<link rel="stylesheet" href="../../landscape-paper.css" />',
  '<link rel="stylesheet" href="../../vertical-landscape.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../paper-menu-field-renderer.js"></script>',
  '<script src="../../paper-landscape-core.js"></script>',
  '<script src="../../spatial-drag.js"></script>',
  'class="landscape-sheet landscape-sheet--equal-columns vertical-sheet"',
  'columnWeight: () => 1',
  'category.style.setProperty("--product-count"',
  'core.createDishDetail({',
  'window.enableMenuLensHorizontalDrag(viewport',
  '外欄 1:1:1',
]) {
  if (!html.includes(required)) throw new Error(`24A is missing its equal-column vertical contract: ${required}`);
}

for (const forbidden of [
  'columnWeight: ({ firstCount, secondCount }) => firstCount + secondCount',
  'columnCounts.join(":")',
  '--column-count',
  '--column-rows',
  '1.65',
  'focusFactor',
  'data-collapsed',
  'trackColumn',
  'trackingTimer',
  'semantic-summary',
  '選這道',
  '加入購物車',
]) {
  if (html.includes(forbidden)) throw new Error(`24A must not inherit another focus or transaction mechanism: ${forbidden}`);
}

for (const requiredStyle of [
  ".vertical-sheet {",
  "width: 46rem;",
  ".vertical-viewport[data-scale=\"reading\"] .vertical-sheet",
  "width: 64rem;",
  "grid-template-columns: repeat(var(--product-count), minmax(1.7rem, 1fr));",
  "direction: rtl;",
  "writing-mode: vertical-rl;",
  "text-combine-upright: all;",
  "font-size: .72rem;",
  "font-size: .9rem;",
]) {
  if (!verticalStyles.includes(requiredStyle)) throw new Error(`24A must reuse 24 vertical presentation unchanged: ${requiredStyle}`);
}

if (!landscapeStyles.includes(".landscape-sheet--equal-columns > .landscape-column { flex: 1 1 0; }")) {
  throw new Error("24A requires the shared equal-column landscape contract.");
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1].trim())
  .filter(Boolean);
inlineScripts.forEach((source, index) => new Script(source, { filename: `${path}#inline-${index + 1}` }));

console.log("24A validation passed: 24 vertical type and interaction retained with equal 1:1:1 outer columns only.");
