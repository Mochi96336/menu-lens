import { readFile } from "node:fs/promises";
import { root } from "./load-catalog.mjs";

const html = await readFile(new URL("research-history/models/index.html", root), "utf8");
const requiredIds = [
  "model-concept",
  "model-concept-summary",
  "model-diagram-signature",
  "model-diagram-statement",
  "model-concept-vignette",
  "section-tabs",
  "model-section-panel",
  "section-current-label",
  "section-route-note",
  "section-summary",
  "model-object-title",
  "show-all",
  "viewport-select",
];

for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Model diagram DOM is missing #${id}.`);
}
if (!html.includes('<div class="model-route-layout">')) {
  throw new Error("Route and concept preview must share the route layout.");
}
if (!html.includes('<details id="model-concept" class="model-concept" data-user-toggled="true" hidden>')) {
  throw new Error("Concept preview must remain a default-collapsed details element.");
}
if (!html.includes('<summary id="model-concept-summary" class="model-concept__summary">')) {
  throw new Error("Concept disclosure must expose a stable summary control.");
}
if (html.indexOf('id="model-concept"') < html.indexOf('id="workbench"')) {
  throw new Error("Concept preview must not compete with the model Hero.");
}
if (html.indexOf('id="section-summary"') < html.indexOf('id="model-concept"')
  || html.indexOf('id="section-summary"') > html.indexOf('id="model-section-panel"')) {
  throw new Error("Canonical section copy must remain inside the optional concept disclosure.");
}
if (html.includes('class="model-section-copy"') || html.includes('class="model-toolbar"')) {
  throw new Error("The prototype reading path must not retain a duplicate section block or mode toolbar.");
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
if (!html.includes('<link rel="stylesheet" href="../model-route-overlay.css"')) {
  throw new Error("Model page must load the full-width route overlay stylesheet after diagram geometry.");
}
if (!html.includes('<script type="module" src="../model-page.mjs"')) {
  throw new Error("Model page must use the canonical model-page renderer.");
}

console.log(`Model diagram DOM: ${requiredIds.length} required nodes, full-width route overlay, optional section copy, and compact object controls verified.`);
