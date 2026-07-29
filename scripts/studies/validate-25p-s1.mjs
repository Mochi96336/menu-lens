import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import { loadArchiveCatalog, root } from "../archive/load-catalog.mjs";

const read = (path) => readFile(new URL(path, root), "utf8");
const [
  catalog,
  runner,
  protocol,
  observation,
  layoutReview,
  layoutReportSource,
  consolidation,
  publicRecord,
  browserHarness,
  workflow,
] = await Promise.all([
  loadArchiveCatalog(),
  read("research-history/studies/25p-reader-task/index.html"),
  read("docs/research-history/25p-reader-task-study-protocol.md"),
  read("docs/research-history/25p-s1-observation-sheet.md"),
  read("docs/research-history/25p-reader-task-study-layout-review.md"),
  read("research-history/review-assets/25p-reader-task/layout-report.json"),
  read("docs/research-history/25p-s1-consolidation.md"),
  read("research-history/records/25p-s1/index.html"),
  read("scripts/studies/25p-s1-browser.mjs"),
  read(".github/workflows/25p-s1-browser-validation.yml"),
]);
const layoutReport = JSON.parse(layoutReportSource);

const study = catalog.objects.find((object) => object.id === "25P-S1");
assert.ok(study, "Archive catalog must register 25P-S1.");
for (const [field, expected] of Object.entries({
  family: "depth",
  objectType: "study",
  researchParentId: "25P",
  disposition: "study-only",
  evidenceState: "participant-study-ready",
  entrypoint: "studies/25p-reader-task/index.html",
  reviewDocument: "records/25p-s1/index.html",
  evidencePath: "review-assets/25p-reader-task/layout-report.json",
  sourcePr: 34,
  sourceCommit: "360c1947092363b72a545265ae3c0555e49de143",
})) {
  assert.equal(study[field], expected, `25P-S1 ${field} drifted.`);
}
assert.deepEqual([...study.dependsOn], ["25P-L1"]);
assert.deepEqual([...study.evidenceFor], ["25P", "25P-L1"]);
assert.ok(catalog.objects.some((object) => object.id === "25P-L1"), "25P-S1 requires 25P-L1.");
assert.ok(!catalog.objects.some((object) => object.id === "25PA" || object.slug === "task-first-entry"), "Study branch must not register 25PA.");

const script = runner.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
assert.ok(script, "Study runner must contain one inline controller.");
new Script(script, { filename: "research-history/studies/25p-reader-task/index.html:inline" });

const task = "你和兩位朋友要點一道分享料理。每道料理預算不超過 NT$500，而且不想選「較慢」的料理。請找出所有符合條件的料理。接著回答：若優先最快，會選哪一道；若優先最低價，會選哪一道？";
assert.match(runner, /<!doctype html>/i);
assert.match(runner, /lang="zh-Hant"/);
assert.ok(runner.includes(task), "Runner must present the approved task exactly.");
assert.ok(protocol.includes(task), "Protocol must preserve the approved task exactly.");
assert.ok(runner.includes("../../phases/25-menu-depth/projections.html"), "Runner must embed the canonical 25P entrypoint.");

for (const width of [320, 390, 1280]) assert.ok(runner.includes(`data-viewport="${width}"`), `Runner must expose ${width}px.`);
for (const key of ["price-serving", "price-preparation", "serving-preparation"]) {
  assert.ok(runner.includes(key), `Runner must support ${key}.`);
  assert.ok(protocol.includes(`start=${key}`), `Protocol must counterbalance ${key}.`);
}
for (const contract of [
  "URLSearchParams",
  "crypto?.getRandomValues",
  "projectionSequence",
  "productSequence",
  "performance.now",
  "navigator.clipboard.writeText",
  ".projection-intent, .projection-notes",
  'studyGrid.dataset.state = "active"',
  'studyGrid.dataset.state = "finished"',
  'study.classList.toggle("study--desktop-active", sessionStarted && viewport === 1280)',
]) assert.ok(script.includes(contract), `Runner is missing controller contract: ${contract}`);

for (const forbidden of [/\blocalStorage\b/, /\bsessionStorage\b/, /\bindexedDB\b/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bsendBeacon\b/, /\bfetch\s*\(/]) {
  assert.doesNotMatch(script, forbidden, `Runner must not persist or submit responses: ${forbidden}`);
}
for (const answer of ["紹興奶油蝦", "蒜酥椒鹽軟殼蟹", "宮保杏鮑菇", "季節時蔬豆腐煲"]) {
  assert.ok(!runner.includes(answer), `Runner leaked answer-key Product ${answer}.`);
  assert.ok(protocol.includes(answer), `Protocol is missing answer-key Product ${answer}.`);
  assert.ok(observation.includes(answer), `Observation sheet is missing answer-key Product ${answer}.`);
}

for (const phrase of [
  "six unfamiliar readers",
  "2 × 3",
  "At least five of six readers identify the exact three-Product qualifying set",
  "At least five of six correctly exclude `未標註` as unknown",
  "three or more of the first six readers fail",
  "STOP 25PA LINE",
  "does not implement `25PA Task-first Entry`",
  "wizard, filter, ranking, recommendation, or automatic projection selection",
]) assert.ok(protocol.includes(phrase), `Protocol is missing gate: ${phrase}`);

for (const phrase of [
  "Participant's uncorrected answers",
  "Required a projection-order hint",
  "Used visible preparation band labels",
  "Exact-set pass: 0 / 1",
  "Do not record names, email addresses, phone numbers",
]) assert.ok(observation.includes(phrase), `Observation sheet is missing: ${phrase}`);
assert.doesNotMatch(observation, /Participant name:|Email:|Phone:|Contact:|IP address:/i);

for (const phrase of [
  "PASS as evidence infrastructure layout",
  "does not report participant evidence",
  "25PA Task-first Entry` remains blocked",
]) assert.ok(layoutReview.includes(phrase), `Layout review is missing: ${phrase}`);
assert.equal(layoutReport.cases.length, 11);
for (const key of [
  "all-cases-no-document-overflow",
  "active-session-hides-facilitator-column",
  "mobile-frame-overflow-contained-inside-frame-wrapper",
  "desktop-1280-frame-fully-visible-at-1280",
  "desktop-1280-frame-centered-at-wider-viewports",
  "finished-state-restores-observer-column",
]) assert.equal(layoutReport.checks[key], true, `Layout report failed ${key}.`);
for (const item of layoutReport.cases) assert.equal(item.documentOverflow, false, `Layout overflowed in ${item.state} at ${item.outerViewport}px.`);

for (const phrase of [
  "PR #34",
  "PR #35",
  "one canonical study object",
  "zero localStorage and sessionStorage keys",
  "second PR #35 participant runner",
]) assert.ok(consolidation.includes(phrase), `Consolidation record is missing: ${phrase}`);
for (const phrase of ["25P-S1", "participant study ready", "25PA ELIGIBLE", "25PA STILL BLOCKED", "STOP 25PA LINE"]) {
  assert.ok(publicRecord.includes(phrase), `Published study record is missing: ${phrase}`);
}

for (const phrase of [
  'from "playwright"',
  "studies/25p-reader-task/",
  "/phases/25-menu-depth/projections.html",
  "nodeCount !== 30",
  "new Set(frameState.nodeIds).size !== 30",
  "projectionCount !== 3",
  "localStorageKeys",
  "sessionStorageKeys",
  "context.cookies()",
  "unexpectedRequests",
  "runner did not return to its ephemeral setup state",
]) assert.ok(browserHarness.includes(phrase), `Browser harness is missing: ${phrase}`);
for (const phrase of [
  "playwright@1.54.2",
  "playwright install --with-deps chromium",
  "node scripts/studies/25p-s1-browser.mjs",
  "actions/upload-artifact@v4",
  "25p-s1-browser-report",
]) assert.ok(workflow.includes(phrase), `Browser workflow is missing: ${phrase}`);
assert.ok(!workflow.includes("git push"), "Browser workflow must not modify the PR branch.");

console.log("25P-S1 validation passed: one canonical runner, counterbalanced protocol, anonymous observation, executable browser gate, and no 25PA implementation.");
