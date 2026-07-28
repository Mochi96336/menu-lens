import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`${label}: missing ${text}`);
};
const rejectText = (source, text, label) => {
  if (source.includes(text)) throw new Error(`${label}: forbidden ${text}`);
};

const runnerPath = "research-history/studies/25p-task-evidence/index.html";
const observationPath = "docs/research-history/25p-task-evidence-observation-sheet.md";
const reviewPath = "docs/research-history/25p-task-evidence-study.md";
const protocolPath = "docs/research-history/25p-task-first-entry-protocol.md";
const projectionsPath = "research-history/phases/25-menu-depth/projections.html";

const [runner, observation, review, protocol, projections] = await Promise.all([
  read(runnerPath),
  read(observationPath),
  read(reviewPath),
  read(protocolPath),
  read(projectionsPath),
]);

for (const [text, label] of [
  ['data-study="25p-task-evidence"', "study identity"],
  ['const prototypeHref = "../../phases/25-menu-depth/projections.html";', "exact parent iframe"],
  ['id="prototype-frame"', "prototype iframe"],
  ['id="start-task"', "start control"],
  ['id="mark-first"', "first-correct milestone"],
  ['id="mark-complete"', "complete-set milestone"],
  ['id="end-task"', "end control"],
  ['data-viewport="320"', "320px viewport"],
  ['data-viewport="390"', "390px viewport"],
  ['data-viewport="1280"', "desktop viewport"],
  ['globalThis.__menuLens25PTaskEvidence', "browser-test contract"],
  ['session code and timing remain in memory only', "ephemeral-data statement"],
]) {
  requireText(runner, text, label);
}

const task = "你和兩位朋友要點一道分享料理。每道料理預算不超過 NT$500，而且不想選「較慢」的料理。";
requireText(runner, task, "participant task");
requireText(protocol, task, "parent protocol task");
requireText(observation, task, "observation task");

for (const answer of ["紹興奶油蝦", "蒜酥椒鹽軟殼蟹", "宮保杏鮑菇"]) {
  rejectText(runner, answer, "participant runner answer isolation");
  requireText(protocol, answer, "protocol answer key");
  requireText(observation, answer, "facilitator answer key");
}

for (const forbidden of [
  "<form",
  "<input",
  "<textarea",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "document.cookie",
  "fetch(",
  "XMLHttpRequest",
  "sendBeacon",
  'data-projection="',
  ".contentWindow.document.querySelector(\"[data-projection",
  ".contentWindow.postMessage",
]) {
  rejectText(runner, forbidden, "evidence-only runner boundary");
}

for (const parentAsset of [
  '<script src="../../menu-projections.js"></script>',
  '<link rel="stylesheet" href="../../menu-projection-band-labels.css" />',
  '<script src="../../menu-projection-band-labels.js"></script>',
  'data-projection="price-serving"',
  'data-projection="price-preparation"',
  'data-projection="serving-preparation"',
  'id="projection-band-summary"',
  'id="projection-volume-band-labels"',
]) {
  requireText(projections, parentAsset, "25P prerequisite parent");
}

for (const protocolBoundary of [
  "The participant may use any projection order.",
  "The facilitator must not tell them which of the three projection buttons to use.",
  "Do not collect names, contact details, account identifiers, or free-form personal data in the repository.",
  "If readers cannot perform the task after the band labels are visible",
  "a task wizard or questionnaire",
  "filtering, ranking, recommendation, or automatic projection selection",
  "any 25PA implementation on this branch",
]) {
  requireText(protocol, protocolBoundary, "parent evidence gate");
}

for (const sheetContract of [
  "Do not enter names, contact information, account identifiers, or other personal data.",
  "Time to first correct qualifying Product",
  "Time to complete three-Product set",
  "Number of projection changes",
  "treated `未標註` as `一般`",
  "Needed facilitator instruction about projection order",
  "Do not decide from one session alone.",
]) {
  requireText(observation, sheetContract, "observation sheet contract");
}

for (const reviewBoundary of [
  "Evidence-only Workstream F gate",
  "does not implement 25PA Task-first Entry",
  "The runner has no response field, form submission, storage, analytics, answer reveal, hidden scoring, recommendation, filter, or projection automation.",
  "If repeated sessions fail, stop the 25PA line.",
]) {
  requireText(review, reviewBoundary, "study review boundary");
}

console.log("25P task evidence runner validation passed.");
