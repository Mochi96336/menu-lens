import { readFile } from "node:fs/promises";
import { root } from "./load-catalog.mjs";

const html = await readFile(new URL("research-history/models/index.html", root), "utf8");
const requiredIds = [
  "model-concept",
  "model-diagram-signature",
  "model-diagram-statement",
  "model-concept-vignette",
  "section-tabs",
  "model-section-panel",
  "section-current-label",
  "section-route-note",
  "section-summary",
];

for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Model diagram DOM is missing #${id}.`);
}
if (!html.includes('id="section-tabs" class="model-section-tabs" role="tablist"')) {
  throw new Error("Model route must remain an explicit tablist.");
}
if (!html.includes('id="model-section-panel" class="model-section-panel" role="tabpanel"')) {
  throw new Error("Model route must control one explicit tabpanel.");
}
if (!html.includes('id="model-concept-vignette" class="model-concept-vignette" aria-hidden="true"')) {
  throw new Error("Programmatic concept geometry must remain presentation-only for assistive technology.");
}
if (!html.includes('<link rel="stylesheet" href="../model-route-diagram.css"')) {
  throw new Error("Model page must load the diagram stylesheet after the workbench stylesheet.");
}
if (!html.includes('<script type="module" src="../model-page.mjs"')) {
  throw new Error("Model page must use the canonical model-page renderer.");
}

console.log(`Model diagram DOM: ${requiredIds.length} required nodes and tab semantics verified.`);
