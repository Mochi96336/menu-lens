import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";
import { loadArchiveCatalog, root } from "../archive/load-catalog.mjs";

await import("../studies/validate-25p-s1.mjs");

const catalog = await loadArchiveCatalog();
const byId = new Map(catalog.objects.map((object) => [object.id, object]));
const archiveRoot = new URL("research-history/", root);
const read = (path) => readFile(new URL(path, archiveRoot), "utf8");

const a = byId.get("26A");
const c = byId.get("26C");
const study = byId.get("25P-S1");
assert.ok(a && c && study, "Depth intake requires 26A, 26C and 25P-S1.");

for (const [object, contract] of [
  [a, { parent: "26", pr: 16, commit: "b89e4bc8e4b21b38f95a6848adbdaf18031318f1", entrypoint: "phases/26a-transition-landmarks/index.html" }],
  [c, { parent: "26A", pr: 24, commit: "42e0b40c37db42af7bc7feedcd23ff33392be539", entrypoint: "phases/26c-flat-recovery/index.html" }],
]) {
  assert.equal(object.family, "depth");
  assert.equal(object.objectType, "prototype");
  assert.equal(object.researchParentId, contract.parent);
  assert.equal(object.disposition, "keep-controlled");
  assert.equal(object.evidenceState, "browser-verified");
  assert.equal(object.sourcePr, contract.pr);
  assert.equal(object.sourceCommit, contract.commit);
  assert.equal(object.entrypoint, contract.entrypoint);
  assert.ok(object.reviewDocument && object.evidencePath);
}
assert.deepEqual([...c.dependsOn], ["26A"]);
assert.deepEqual([...c.mechanismsFrom], ["26A"]);

const [fixtureSource, aHtml, aCss, aJs, aSmokeSource, cHtml, cCss, cJs, cSmokeSource] = await Promise.all([
  read("menu-fixture.js"),
  read("phases/26a-transition-landmarks/index.html"),
  read("parallax-transition-landmarks.css"),
  read("parallax-transition-landmarks.js"),
  read("review-assets/26a/runtime-smoke.json"),
  read("phases/26c-flat-recovery/index.html"),
  read("parallax-flat-recovery.css"),
  read("parallax-flat-recovery.js"),
  read("review-assets/26c/runtime-smoke.json"),
]);

const fixtureSandbox = { window: {} };
runInNewContext(fixtureSource, fixtureSandbox, { filename: "research-history/menu-fixture.js" });
const menu = fixtureSandbox.window.menuLensResearchMenu;
assert.equal(menu.categories.length, 6);
assert.equal(menu.products.length, 30);
assert.equal(new Set(menu.products.map((product) => product.id)).size, 30);

new Script(aJs, { filename: "research-history/parallax-transition-landmarks.js" });
for (const contract of [
  '<script src="../../parallax-menu-volume.js" defer></script>',
  '<script src="../../parallax-transition-landmarks.js" defer></script>',
  'id="parallax-transition-landmarks"',
  'data-landmark-role="origin"',
  'data-landmark-role="target"',
]) assert.ok(aHtml.includes(contract), `26A is missing ${contract}.`);
assert.doesNotMatch(aHtml, /<(button|a)\b[^>]*data-landmark-role=/i);
for (const contract of ["transitionOriginIndex", "renderTransitionLandmarks", "MutationObserver", 'dataset.visible = "true"', 'dataset.visible = "false"']) {
  assert.ok(aJs.includes(contract), `26A is missing ${contract}.`);
}
assert.ok(aCss.includes("pointer-events: none"));
assert.ok(aCss.includes("@media (max-width: 360px)"));
assert.ok(aCss.includes("@media (prefers-reduced-motion: reduce)"));
const aSmoke = JSON.parse(aSmokeSource);
for (const viewport of aSmoke.filter((item) => item.initial)) {
  assert.equal(viewport.initial.categories, 6);
  assert.equal(viewport.initial.products, 30);
  assert.equal(viewport.initial.horizontal_overflow, false);
  assert.equal(viewport.transition.landmark_buttons, 0);
  assert.equal(viewport.transition.landmark_links, 0);
}

new Script(cJs, { filename: "research-history/parallax-flat-recovery.js" });
for (const contract of [
  '<link rel="stylesheet" href="../../parallax-flat-recovery.css" />',
  '<script src="../../parallax-flat-recovery.js" defer></script>',
  'id="parallax-flat-range"',
  'min="0.02"',
  'max="1"',
  'step="0.01"',
  'value="0.58"',
]) assert.ok(cHtml.includes(contract), `26C is missing ${contract}.`);
for (const contract of [
  'document.querySelector("#parallax-flat-range")',
  'flatRange.addEventListener("input"',
  "state.spread = clamp(Number(flatRange.value), .02, 1)",
  'flatRange.setAttribute("aria-valuetext"',
]) assert.ok(cJs.includes(contract), `26C is missing ${contract}.`);
assert.ok(cCss.includes('input[type="range"]'));
assert.ok(cCss.includes("pointer-events: auto"));
assert.ok(cCss.includes("touch-action: pan-x"));
const cSmoke = JSON.parse(cSmokeSource);
assert.equal(cSmoke.initial.categories, 6);
assert.equal(cSmoke.initial.products, 30);
assert.equal(cSmoke.initial.range, .58);
assert.equal(cSmoke.flat.value, .02);
assert.equal(cSmoke.flat.orientationSame, true);
assert.equal(cSmoke.deep.value, 1);
assert.equal(cSmoke.rangeKeyboard.orientationSame, true);
assert.equal(cSmoke.reset.range, .58);
assert.equal(cSmoke.reset.landmarks, "false");
for (const viewport of cSmoke.viewports ?? []) {
  assert.equal(viewport.products, 30);
  assert.equal(viewport.width, viewport.client);
}

assert.equal(study.objectType, "study");
assert.equal(study.disposition, "study-only");
assert.equal(study.evidenceState, "participant-study-ready");
assert.deepEqual([...study.dependsOn], ["25P-L1"]);
assert.ok(!catalog.objects.some((object) => object.id === "25PA" || object.slug === "task-first-entry"), "25PA must remain blocked outside Archive v2 intake.");

console.log("Depth Archive v2 intake passed: 26A and 26C controlled mechanisms plus one canonical 25P-S1 study, with 25PA still blocked.");
