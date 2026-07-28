import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

const runnerPath = "research-history/studies/25p-reader-task/index.html";
const protocolPath = "docs/research-history/25p-reader-task-study-protocol.md";
const observationPath = "docs/research-history/25p-reader-task-study-observation-sheet.md";
const workflowPath = ".github/workflows/25p-reader-task-study-validation.yml";
const layoutReportPath = "research-history/review-assets/25p-reader-task/layout-report.json";

const runner = read(runnerPath);
const protocol = read(protocolPath);
const observation = read(observationPath);
const workflow = read(workflowPath);
const layoutReport = JSON.parse(read(layoutReportPath));
const script = runner.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";

const task = "你和兩位朋友要點一道分享料理。每道料理預算不超過 NT$500，而且不想選「較慢」的料理。請找出所有符合條件的料理。接著回答：若優先最快，會選哪一道；若優先最低價，會選哪一道？";

assert.match(runner, /<!doctype html>/i, "Study runner must be standalone HTML.");
assert.match(runner, /lang="zh-Hant"/, "Study runner must use Traditional Chinese document language.");
assert.ok(runner.includes(task), "Study runner must present the exact approved participant task.");
assert.ok(protocol.includes(task), "Protocol must preserve the exact participant task.");
assert.ok(runner.includes("../../phases/25-menu-depth/projections.html"), "Runner must embed the existing 25P prototype.");

for (const width of [320, 390, 1280]) {
  assert.ok(runner.includes(`data-viewport="${width}"`), `Runner must expose the ${width}px frame.`);
}

for (const key of ["price-serving", "price-preparation", "serving-preparation"]) {
  assert.ok(runner.includes(key), `Runner must support starting projection ${key}.`);
  assert.ok(protocol.includes(`start=${key}`), `Protocol must counterbalance starting projection ${key}.`);
}

assert.match(script, /URLSearchParams/, "Runner must support protocol-assigned viewport and starting projection parameters.");
assert.match(script, /crypto\?\.getRandomValues/, "Runner must randomize an unassigned starting projection without persistence.");
assert.match(script, /projectionSequence/, "Runner must record projection sequence in memory.");
assert.match(script, /productSequence/, "Runner must record opened Product IDs in memory.");
assert.match(script, /performance\.now/, "Runner must provide a bounded in-memory timer.");
assert.match(script, /navigator\.clipboard\.writeText/, "Anonymous summary export must require an explicit clipboard action.");
assert.match(script, /\.projection-intent, \.projection-notes/, "Runner must blind research chrome while preserving the prototype.");
assert.match(runner, /no answer scoring/, "Runner must state that it does not score answers.");

for (const forbidden of [
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
  /\bfetch\s*\(/,
]) {
  assert.doesNotMatch(script, forbidden, `Runner script must not use persistence or network collection: ${forbidden}`);
}

for (const answer of ["紹興奶油蝦", "蒜酥椒鹽軟殼蟹", "宮保杏鮑菇", "季節時蔬豆腐煲"]) {
  assert.ok(!runner.includes(answer), `Participant runner must not reveal answer-key Product ${answer}.`);
  assert.ok(protocol.includes(answer), `Facilitator protocol must include answer-key Product ${answer}.`);
  assert.ok(observation.includes(answer), `Observation sheet must include answer-key Product ${answer} after response capture.`);
}

assert.match(protocol, /six unfamiliar readers/, "Protocol must define the six-session initial gate.");
assert.match(protocol, /2 × 3/, "Protocol must explain viewport-by-starting-projection counterbalancing.");
assert.match(protocol, /At least five of six readers identify the exact three-Product qualifying set/, "Protocol must define a falsifiable exact-set eligibility threshold.");
assert.match(protocol, /At least five of six correctly exclude `未標註` as unknown/, "Protocol must define the missing-data eligibility threshold.");
assert.match(protocol, /three or more of the first six readers fail/, "Protocol must define the stop condition.");
assert.match(protocol, /STOP 25PA LINE/, "Protocol must retain an explicit negative disposition.");
assert.match(protocol, /does not implement `25PA Task-first Entry`/, "Protocol must state that 25PA is not implemented.");

assert.match(observation, /Participant's uncorrected answers/, "Observation sheet must record answers before scoring.");
assert.match(observation, /Required a projection-order hint/, "Observation sheet must record projection-order assistance.");
assert.match(observation, /Used visible preparation band labels/, "Observation sheet must record band-label use.");
assert.match(observation, /Exact-set pass: 0 \/ 1/, "Observation sheet must support anonymized aggregate tallying.");
assert.match(observation, /Do not record names, email addresses, phone numbers/, "Observation sheet must state the privacy boundary.");
assert.doesNotMatch(observation, /Participant name:|Email:|Phone:|Contact:|IP address:/i, "Observation sheet must not request identifying fields.");

assert.match(
  protocol,
  /wizard, filter, ranking, recommendation, or automatic projection selection/,
  "Protocol must retain the full prohibited-rescue stop boundary.",
);

for (const layoutContract of [
  'data-state="setup"',
  '.study-grid[data-state="active"] .facilitator-panel',
  'grid-template-columns: minmax(0, 1fr)',
  '#study.study--desktop-active',
  'overflow: hidden; padding: 0; border-right: 0; border-left: 0',
  'studyGrid.dataset.state = "active"',
  'studyGrid.dataset.state = "finished"',
  'study.classList.toggle("study--desktop-active", sessionStarted && viewport === 1280)',
]) {
  assert.ok(runner.includes(layoutContract), `Runner layout repair is missing: ${layoutContract}`);
}

assert.equal(layoutReport.cases.length, 11, "Runner layout report must cover setup, active, and finished states.");
assert.equal(layoutReport.checks["all-cases-no-document-overflow"], true);
assert.equal(layoutReport.checks["active-session-hides-facilitator-column"], true);
assert.equal(layoutReport.checks["mobile-frame-overflow-contained-inside-frame-wrapper"], true);
assert.equal(layoutReport.checks["desktop-1280-frame-fully-visible-at-1280"], true);
assert.equal(layoutReport.checks["desktop-1280-frame-centered-at-wider-viewports"], true);
assert.equal(layoutReport.checks["finished-state-restores-observer-column"], true);
for (const item of layoutReport.cases) {
  assert.equal(item.documentOverflow, false, `Runner layout overflowed in ${item.state} at ${item.outerViewport}px.`);
}

assert.match(workflow, /node scripts\/validate-25p-reader-task-study\.mjs/, "Study workflow must invoke the dedicated validator.");
assert.match(workflow, /npm run typecheck/, "Study workflow must typecheck the repository.");
assert.match(workflow, /npm test/, "Study workflow must run repository tests.");
assert.match(workflow, /npm run build/, "Study workflow must build the repository.");

console.log("25P reader task study validation passed.");
console.log("- one unchanged 25P condition");
console.log("- 320px / 390px / 1280px frames");
console.log("- active-session facilitator column removed and desktop frame fully visible");
console.log("- three counterbalanced starting projections");
console.log("- no answer key, persistence, analytics, or automated scoring in participant runner");
console.log("- six-session eligibility and stop gates recorded");
