import assert from "node:assert/strict";
import { loadArchiveCatalog } from "../archive/load-catalog.mjs";

await import("../validate-24a-equal-column-vertical.mjs");
await import("../validate-24b-horizontal-price-labels.mjs");
await import("../validate-24c-fixed-type-reading.mjs");

const catalog = await loadArchiveCatalog();
const byId = new Map(catalog.objects.map((object) => [object.id, object]));
const expected = new Map([
  ["24A", { slug: "equal-column-vertical-type", pr: 30, commit: "8f60a970afd7ae56b985fb77fd42556d7537b386", entrypoint: "phases/24a-equal-column-vertical/index.html" }],
  ["24B", { slug: "horizontal-price-labels", pr: 32, commit: "637967b0179bcaffc3c4e2847201161e41680796", entrypoint: "phases/24b-horizontal-price-labels/index.html" }],
  ["24C", { slug: "fixed-type-reading-scale", pr: 37, commit: "ec55fdde84a24a9755d1768cf75d2f3b313fbd48", entrypoint: "phases/24c-fixed-type-reading/index.html" }],
]);

assert.equal(byId.get("24")?.family, "landscape", "Vertical intake requires parent 24.");
for (const [id, contract] of expected) {
  const object = byId.get(id);
  assert.ok(object, `Vertical Landscape intake requires ${id}.`);
  assert.equal(object.family, "landscape");
  assert.equal(object.objectType, "prototype");
  assert.equal(object.researchParentId, "24");
  assert.equal(object.slug, contract.slug);
  assert.equal(object.disposition, "provisional");
  assert.equal(object.evidenceState, "direct-review-pending");
  assert.equal(object.sourcePr, contract.pr);
  assert.equal(object.sourceCommit, contract.commit);
  assert.equal(object.entrypoint, contract.entrypoint);
  assert.ok(object.reviewDocument);
  assert.equal(object.evidencePath, null);
  assert.deepEqual([...object.dependsOn], []);
  assert.deepEqual([...object.evidenceFor], []);
  assert.deepEqual([...object.mechanismsFrom], []);
}
assert.ok(!catalog.objects.some((object) => expected.has(object.id) && object.evidenceState === "participant-evidence-complete"));
assert.ok(!catalog.objects.some((object) => object.slug === "vertical-landscape-combined" || object.id === "24ABC"));

console.log("Vertical Landscape Archive v2 intake passed: 24A, 24B and 24C remain independent parent-24 siblings with direct review pending.");
