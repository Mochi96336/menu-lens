import assert from "node:assert/strict";
import { loadArchiveCatalog } from "../archive/load-catalog.mjs";

await import("../validate-22a-row-only.mjs");
await import("../validate-22b-column-only.mjs");
await import("../validate-22c-camera-only.mjs");
await import("../validate-22d-geometry-only.mjs");
await import("../validate-22e-typography-only.mjs");
await import("../validate-22f-padding-only.mjs");
await import("../validate-22g-collapse-only.mjs");

const catalog = await loadArchiveCatalog();
const byId = new Map(catalog.objects.map((object) => [object.id, object]));
assert.equal(byId.get("18")?.family, "landscape", "Landscape ablations require parent 18.");
assert.equal(byId.get("23")?.family, "landscape", "22G mechanism source 23 must remain available.");

const expected = new Map([
  ["22A", { slug: "row-only-weighted-focus", disposition: "keep-controlled", evidence: "browser-verified", pr: 9, commit: "d0e0d0b8ebcb5cf1e692d37b1bb88a29f469c6a9", mechanisms: [] }],
  ["22B", { slug: "column-only-focus", disposition: "keep-controlled", evidence: "browser-verified", pr: 12, commit: "c4b9c3db45b80659afb05ac2375156d20b618af0", mechanisms: [] }],
  ["22C", { slug: "camera-only-focus", disposition: "negative-evidence", evidence: "browser-verified", pr: 18, commit: "c099cea10f0eff018651e15fa4230770b4aeb68d", mechanisms: [] }],
  ["22D", { slug: "geometry-only-focus", disposition: "provisional", evidence: "direct-review-pending", pr: 20, commit: "4145a0c76dfaeac150339359af949d3e5d25738d", mechanisms: ["22A", "22B"] }],
  ["22E", { slug: "typography-only-focus", disposition: "provisional", evidence: "direct-review-pending", pr: 27, commit: "3a1c489e70a06ffc27b97410cce7643bebddb86f", mechanisms: [] }],
  ["22F", { slug: "padding-only-focus", disposition: "provisional", evidence: "direct-review-pending", pr: 33, commit: "223e8995fdcbf0ffe42baf13a06e9192bdd0e8e7", mechanisms: [] }],
  ["22G", { slug: "collapse-only-focus", disposition: "provisional", evidence: "direct-review-pending", pr: 38, commit: "3da7868547b9e0da538ee157db3dfbcf35dfd83f", mechanisms: ["23"] }],
]);

for (const [id, contract] of expected) {
  const object = byId.get(id);
  assert.ok(object, `Landscape ablation intake requires ${id}.`);
  assert.equal(object.family, "landscape");
  assert.equal(object.objectType, "prototype");
  assert.equal(object.researchParentId, "18", `${id} must remain a sibling rebuilt from parent 18.`);
  assert.equal(object.slug, contract.slug);
  assert.equal(object.disposition, contract.disposition);
  assert.equal(object.evidenceState, contract.evidence);
  assert.equal(object.sourcePr, contract.pr);
  assert.equal(object.sourceCommit, contract.commit);
  assert.deepEqual([...object.dependsOn], []);
  assert.deepEqual([...object.evidenceFor], []);
  assert.deepEqual([...object.mechanismsFrom], contract.mechanisms);
  assert.ok(object.entrypoint && object.reviewDocument && object.evidencePath, `${id} must publish executable, record and evidence paths.`);
}

assert.equal(byId.get("22C").nextGate, "Retain the negative result: camera positioning alone is insufficient as a reading improvement.");
assert.ok(byId.get("22D").summary.includes("22A") && byId.get("22D").summary.includes("22B"), "22D must identify its two approved geometry sources.");
assert.ok(byId.get("22G").summary.includes("不繼承 23"), "22G must isolate collapse from the rest of object 23.");

const ablationIds = new Set(expected.keys());
assert.ok(!catalog.objects.some((object) =>
  ["22ABCDEFG", "combined-landscape-ablations", "landscape-best-of"].includes(object.id)
  || object.slug === "combined-landscape-ablations"
  || (object.mechanismsFrom.length > 2 && object.mechanismsFrom.some((id) => ablationIds.has(id))),
), "Landscape ablation intake must not invent a combined product direction.");
assert.ok(!catalog.objects.some((object) => ablationIds.has(object.id) && object.evidenceState === "participant-evidence-complete"), "Landscape ablations contain no participant results.");

console.log("Landscape Ablations Archive v2 intake passed: seven parent-18 siblings, preserved camera negative evidence and pending direct-review boundaries.");
