import { readFile } from "node:fs/promises";
import { root } from "./load-catalog.mjs";

const html = await readFile(new URL("research-history/models/index.html", root), "utf8");
const overlayCss = await readFile(new URL("research-history/model-route-overlay.css", root), "utf8");
const routeRenderer = await readFile(new URL("research-history/model-route-diagram.mjs", root), "utf8");
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
  throw new Error("Route and core concept must share the route layout.");
}
if (!html.includes('<details id="model-concept" class="model-concept" data-user-toggled="true" hidden open>')) {
  throw new Error("Core concept must remain permanently open as the primary understanding layer.");
}
if (!html.includes('<summary id="model-concept-summary" class="model-concept__summary" aria-disabled="true" tabindex="-1">')) {
  throw new Error("The core concept heading must not behave like a disclosure control.");
}
if (!html.includes('<span class="model-concept__summary-label">核心概念</span>')) {
  throw new Error("The primary understanding layer must identify itself as 核心概念.");
}
if (html.indexOf('id="model-concept"') < html.indexOf('id="workbench"')) {
  throw new Error("Core concept must remain inside the workbench rather than compete with the Hero.");
}
if (html.indexOf('id="model-concept"') > html.indexOf('id="section-tabs"')) {
  throw new Error("Core concept must precede Research Route in semantic reading order.");
}
if (html.indexOf('id="section-summary"') < html.indexOf('id="model-concept"')
  || html.indexOf('id="section-summary"') > html.indexOf('id="model-section-panel"')) {
  throw new Error("Canonical section copy must remain inside the core concept region.");
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
  throw new Error("Model page must load the route/concept composition stylesheet after diagram geometry.");
}
for (const contract of [
  "grid-template-columns: minmax(0, 1fr) minmax(34rem, 40rem)",
  'grid-template-areas: "concept route"',
  "grid-area: route",
  "grid-area: concept",
  'grid-template-columns: minmax(20rem, 30rem) minmax(0, 1fr)',
  '"vignette statement"',
  "border-inline-start: 1px solid",
  '[data-route-count="2"]',
  ".model-section-strip .model-route__canvas--layout-balanced-rail > button",
  "width: 7rem",
  '"concept"\n      "route"',
  ".model-concept__section-summary",
  "display: none",
  "box-shadow: none",
  "pointer-events: none",
  'button:not([aria-selected="true"])',
  ".model-route__canvas--layout-compact-sequence .model-route__marker",
  ".model-route__canvas--layout-compact-sequence .model-route__label",
  "background: transparent",
]) {
  if (!overlayCss.includes(contract)) throw new Error(`Route/core-concept CSS is missing: ${contract}`);
}
for (const contract of [
  "root.dataset.routeModel = model.id",
  "root.dataset.routeCount = String(model.sections.length)",
]) {
  if (!routeRenderer.includes(contract)) throw new Error(`Route renderer is missing responsive identity: ${contract}`);
}
if (!html.includes('<script type="module" src="../model-page.mjs"')) {
  throw new Error("Model page must use the canonical model-page renderer.");
}

console.log(`Model diagram DOM: ${requiredIds.length} required nodes, large concept-first desktop pairing, adaptive right-column routes, responsive stacking, marker-centred sequence axes, visibly connected open route nodes, mobile copy deduplication, and compact object controls verified.`);
