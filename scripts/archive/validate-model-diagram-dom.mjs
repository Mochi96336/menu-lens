import { readFile } from "node:fs/promises";
import { root } from "./load-catalog.mjs";

const html = await readFile(new URL("research-history/models/index.html", root), "utf8");
const overlayCss = await readFile(new URL("research-history/model-route-overlay.css", root), "utf8");
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
if (!html.includes('<details id="model-concept" class="model-concept" data-user-toggled="true" hidden open>')) {
  throw new Error("Concept preview must remain permanently open as the primary understanding layer.");
}
if (!html.includes('<summary id="model-concept-summary" class="model-concept__summary" aria-disabled="true">')) {
  throw new Error("The concept heading must not present itself as a disclosure control.");
}
if (html.indexOf('id="model-concept"') < html.indexOf('id="workbench"')) {
  throw new Error("Concept preview must remain inside the workbench rather than compete with the Hero.");
}
if (html.indexOf('id="section-summary"') < html.indexOf('id="model-concept"')
  || html.indexOf('id="section-summary"') > html.indexOf('id="model-section-panel"')) {
  throw new Error("Canonical section copy must remain inside the visible concept band.");
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
  throw new Error("Model page must load the concept-band stylesheet after diagram geometry.");
}
for (const contract of [
  "order: -1",
  'grid-template-columns: minmax(20rem, 30rem) minmax(0, 1fr)',
  '"vignette statement"',
  "pointer-events: none",
]) {
  if (!overlayCss.includes(contract)) throw new Error(`Visible concept-band CSS is missing: ${contract}`);
}
if (!html.includes('<script type="module" src="../model-page.mjs"')) {
  throw new Error("Model page must use the canonical model-page renderer.");
}

console.log(`Model diagram DOM: ${requiredIds.length} required nodes, always-visible concept band, full-width route, and compact object controls verified.`);
