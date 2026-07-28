import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archive = new URL("research-history/", root);
const html = await readFile(new URL("phases/25pa-task-first-entry/index.html", archive), "utf8");
const styles = await readFile(new URL("task-first-projection-entry.css", archive), "utf8");
const controller = await readFile(new URL("task-first-projection-entry.js", archive), "utf8");
const fixtureSource = await readFile(new URL("menu-fixture.js", archive), "utf8");
const parentHtml = await readFile(new URL("phases/25-menu-depth/projections.html", archive), "utf8");

new Script(controller, { filename: "research-history/task-first-projection-entry.js" });

assert.match(html, /<!doctype html>/i, "25PA must be a standalone HTML page.");
assert.match(html, /<html lang="zh-Hant">/, "25PA must retain Traditional Chinese document language.");
assert.match(html, /25PA · task first, projection unchanged/, "25PA identity must be explicit.");

for (const asset of [
  "../../history.css",
  "../../menu-projections.css",
  "../../menu-projection-band-labels.css",
  "../../task-first-projection-entry.css",
  "../../menu-fixture.js",
  "../../menu-projections.js",
  "../../menu-projection-band-labels.js",
  "../../task-first-projection-entry.js",
]) {
  assert.ok(html.includes(asset), `25PA is missing inherited or child asset ${asset}.`);
}

for (const taskContract of [
  "找出所有符合條件的分享料理",
  "份量是「分享」",
  "每道不超過 NT$500",
  "只接受「較快」或「一般」",
  "「較慢」與「未標註」都不算符合",
  "若優先最快會選哪一道；若優先最低價會選哪一道",
  "三個 projection 可用任何順序",
]) {
  assert.ok(html.includes(taskContract), `25PA task contract is missing: ${taskContract}`);
}

for (const parentContract of [
  'data-projection="price-serving" aria-pressed="true"',
  'data-projection="price-preparation" aria-pressed="false"',
  'data-projection="serving-preparation" aria-pressed="false"',
  'id="projection-node-layer"',
  'id="projection-focus-card"',
  'id="projection-volume-band-labels"',
  'id="projection-band-summary"',
]) {
  assert.ok(html.includes(parentContract), `25PA must retain the 25P contract: ${parentContract}`);
  assert.ok(parentHtml.includes(parentContract), `25P parent contract drifted: ${parentContract}`);
}

assert.match(html, /id="task-first-workspace" class="task-first-workspace" hidden/, "Projection workspace must be hidden before the explicit entry action.");
assert.match(html, /id="enter-projection" type="button">進入投影/, "25PA must provide one explicit entry action.");
assert.match(html, /id="show-task" type="button"/, "The fixed task must remain recallable.");
assert.match(controller, /workspace\.hidden = false/, "Entry action must reveal the unchanged workspace.");
assert.match(controller, /entry\.hidden = false/, "Task recall must be reversible.");
assert.match(controller, /activeProjectionControl\(\)\?\.focus/, "Entry must move focus without changing the active projection.");
assert.match(controller, /stopImmediatePropagation/, "Escape from recalled task must return without clearing hidden projection state.");
assert.match(controller, /__menuLens25PA/, "25PA must expose bounded test-only state inspection.");

assert.doesNotMatch(controller, /\.click\s*\(/, "25PA must not programmatically choose a projection or Product.");
assert.doesNotMatch(controller, /setAttribute\(\s*["']aria-pressed/, "25PA must not rewrite projection selection.");
assert.doesNotMatch(controller, /localStorage|sessionStorage|indexedDB|fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/, "25PA must not persist or transmit state.");

for (const forbidden of [
  "紹興奶油蝦",
  "蒜酥椒鹽軟殼蟹",
  "宮保杏鮑菇",
  "季節時蔬豆腐煲",
  "Candidate",
  "comparison workspace",
  "cart",
  "checkout",
  "order action",
  "automatic projection",
]) {
  assert.ok(!html.includes(forbidden) && !controller.includes(forbidden), `25PA leaks or adds forbidden behavior: ${forbidden}`);
}

assert.doesNotMatch(html, /<form|<input|<select|<textarea/, "25PA is not a questionnaire, answer form, or scoring surface.");
assert.doesNotMatch(controller, /filter\s*\(|sort\s*\(|recommend|score/i, "25PA controller must not filter, rank, recommend, or score Products.");

for (const styleContract of [
  ".task-first-entry",
  ".task-first-workspace",
  ".task-first-reminder",
  "grid-template-columns: 2.1rem minmax(0, 1fr)",
  "overflow-y: auto",
  "@media (max-width: 360px)",
]) {
  assert.ok(styles.includes(styleContract), `25PA stylesheet is missing layout contract: ${styleContract}`);
}

const fixtureSandbox = { window: {} };
runInNewContext(fixtureSource, fixtureSandbox, { filename: "research-history/menu-fixture.js" });
const menu = fixtureSandbox.window.menuLensResearchMenu;
assert.equal(menu.categories.length, 6, "25PA must inherit all six categories.");
assert.equal(menu.products.length, 30, "25PA must inherit all 30 Products.");
assert.equal(new Set(menu.products.map((product) => product.id)).size, 30, "25PA Product IDs must remain unique.");

console.log("25PA Task-first Entry validation passed.");
console.log("- fixed task briefing before the unchanged 25P workspace");
console.log("- no programmatic projection choice, filtering, ranking, recommendation, scoring, or persistence");
console.log("- 6 categories and 30 unique Products retained");
