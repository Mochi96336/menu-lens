import assert from "node:assert/strict";
import { loadArchiveCatalog } from "../archive/load-catalog.mjs";
import { archiveLegacyOverrides } from "../../research-history/catalog/legacy-overrides.mjs";

await import("../validate-18b-semantic-zoom.mjs");
await import("../validate-18c-tap-to-read.mjs");
await import("../validate-18d-inline-detail.mjs");

const catalog = await loadArchiveCatalog();
const byId = new Map(catalog.objects.map((object) => [object.id, object]));
const landscapeOverrideIds = Object.keys(archiveLegacyOverrides)
  .filter((id) => byId.get(id)?.family === "landscape")
  .sort();
assert.deepEqual(landscapeOverrideIds, ["18"], "Landscape Core intake must override only existing landscape object 18.");

const parent = byId.get("18");
assert.ok(parent, "Landscape Core intake requires parent object 18.");
assert.equal(parent.family, "landscape");
assert.equal(parent.researchParentId, "16");
assert.equal(parent.objectType, "prototype");
assert.equal(parent.disposition, "substrate");
assert.equal(parent.evidenceState, "browser-verified");
assert.equal(parent.entrypoint, "phases/18-landscape-paper/index.html");
assert.equal(parent.reviewDocument, "records/18/index.html");
assert.deepEqual(parent.assets.styles, ["history.css", "paper-menu-field.css", "landscape-paper.css"]);
assert.deepEqual(parent.assets.scripts, ["menu-fixture.js", "paper-menu-field-renderer.js", "spatial-drag.js"]);

const expected = new Map([
  ["18B", { slug: "semantic-landscape-overview", profile: "landscape-semantic-zoom", sourcePr: 14, sourceCommit: "1be394890fe6150ba17d853360d06591b56a767f" }],
  ["18C", { slug: "tap-to-read-landscape", profile: "landscape-tap-to-read", sourcePr: 21, sourceCommit: "e5ab9983e94d4a2b0a4b1433b5ae3a99ed7b7781" }],
  ["18D", { slug: "inline-detail-landscape", profile: "landscape-inline-detail", sourcePr: 26, sourceCommit: "ee2ed12ffda79e583e27d473f461e293a9713d27" }],
]);
for (const [id, contract] of expected) {
  const object = byId.get(id);
  assert.ok(object, `Landscape Core intake requires child ${id}.`);
  assert.equal(object.family, "landscape");
  assert.equal(object.objectType, "prototype");
  assert.equal(object.researchParentId, "18");
  assert.equal(object.slug, contract.slug);
  assert.equal(object.validationProfile, contract.profile);
  assert.equal(object.disposition, "keep-controlled");
  assert.equal(object.evidenceState, "browser-verified");
  assert.deepEqual([...object.dependsOn], []);
  assert.deepEqual([...object.evidenceFor], []);
  assert.deepEqual([...object.mechanismsFrom], []);
  assert.equal(object.sourcePr, contract.sourcePr);
  assert.equal(object.sourceCommit, contract.sourceCommit);
  assert.ok(object.entrypoint && object.reviewDocument && object.evidencePath, `${id} must publish executable, record and evidence paths.`);
}

const forbiddenIds = new Set(["18BCD", "18B+C+D", "landscape-core-combined", "combined-landscape-core"]);
assert.ok(!catalog.objects.some((object) => forbiddenIds.has(object.id) || object.slug === "combined-landscape-core"), "Landscape Core intake must not combine 18B, 18C and 18D.");
for (const id of ["22A", "22B", "22C", "22D", "22E", "22F", "22G"]) {
  const object = byId.get(id);
  if (object?.sourcePr) throw new Error(`Landscape Core intake must not import ablation child ${id}.`);
}

console.log("Landscape Core Archive v2 intake passed: browser-verified substrate 18 and three independent browser-verified controlled children.");
