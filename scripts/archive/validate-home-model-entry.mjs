import { readFile } from "node:fs/promises";
import { root } from "./load-catalog.mjs";

const html = await readFile(new URL("research-history/index.html", root), "utf8");

const requiredModelLinks = [
  "complete-document",
  "horizontal-navigation",
  "paper-field",
  "landscape-paper",
  "multiscale-focus",
  "depth-projection",
];

if (!html.includes('href="./archive-home.css"')) {
  throw new Error("Archive homepage is missing its model-first stylesheet.");
}

const modelSectionIndex = html.indexOf('id="start"');
const notesSectionIndex = html.indexOf('id="notes"');
if (modelSectionIndex === -1 || notesSectionIndex === -1 || modelSectionIndex > notesSectionIndex) {
  throw new Error("Design models must remain before archive notes on the homepage.");
}

const priorityCardCount = (html.match(/class="archive-priority-card"/g) ?? []).length;
if (priorityCardCount !== 3) {
  throw new Error(`Archive homepage exposes ${priorityCardCount} priority entries; expected 3.`);
}

const modelCardCount = (html.match(/class="archive-model-card"/g) ?? []).length;
if (modelCardCount !== requiredModelLinks.length) {
  throw new Error(`Archive homepage exposes ${modelCardCount} model cards; expected ${requiredModelLinks.length}.`);
}

for (const modelId of requiredModelLinks) {
  if (!html.includes(`href="./models/?model=${modelId}"`)) {
    throw new Error(`Archive homepage is missing the direct ${modelId} model link.`);
  }
}

if (!html.includes("archive-hero__spotlight") || !html.includes("archive-hero__action")) {
  throw new Error("Archive hero must retain a direct model spotlight and primary model action.");
}

console.log("Archive homepage: model-first order, active entries, and six direct model links verified.");
