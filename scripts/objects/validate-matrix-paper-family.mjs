import assert from "node:assert/strict";
import { loadArchiveCatalog } from "../archive/load-catalog.mjs";

await import("../validate-12a-semantic-paper-field.mjs");
await import("../validate-12a-reader-comparison.mjs");
await import("../validate-15a-pair-local-elastic.mjs");
await import("../validate-16a-stable-weighted-drag.mjs");
await import("../validate-17a-minimum-target-weighted-strip.mjs");

const catalog = await loadArchiveCatalog();
const byId = new Map(catalog.objects.map((object) => [object.id, object]));
for (const [id, parent] of [
  ["12", null], ["12A", "12"], ["12A-S1", "12A"],
  ["15", null], ["15A", "15"],
  ["16", "15"], ["16A", "16"],
  ["17", "16"], ["17A", "17"],
]) {
  const object = byId.get(id);
  assert.ok(object, `Matrix-paper intake requires object ${id}.`);
  assert.equal(object.family, "matrix-paper", `${id} must remain in matrix-paper.`);
  assert.equal(object.researchParentId, parent, `${id} research parent drifted.`);
}

for (const [id, disposition, evidence] of [
  ["12A", "keep-controlled", "browser-verified"],
  ["15A", "provisional", "implementation-only"],
  ["16A", "provisional", "implementation-only"],
  ["17A", "provisional", "implementation-only"],
]) {
  const object = byId.get(id);
  assert.equal(object.objectType, "prototype");
  assert.equal(object.disposition, disposition);
  assert.equal(object.evidenceState, evidence);
  assert.deepEqual([...object.dependsOn], []);
  assert.ok(object.entrypoint && object.reviewDocument, `${id} must publish executable and record paths.`);
  assert.ok(object.sourcePr && /^[0-9a-f]{40}$/.test(object.sourceCommit), `${id} must retain exact source provenance.`);
}

const study = byId.get("12A-S1");
assert.equal(study.objectType, "study");
assert.equal(study.disposition, "study-only");
assert.equal(study.evidenceState, "participant-study-ready");
assert.deepEqual([...study.dependsOn], ["12A"]);
assert.deepEqual([...study.evidenceFor], ["12", "12A"]);

assert.ok(!catalog.objects.some((object) => ["15A16A17A", "combined-elastic-paper", "elastic-best-of"].includes(object.id) || object.slug === "combined-elastic-paper"), "Matrix-paper intake must not invent a combined elastic prototype.");
assert.ok(!catalog.objects.some((object) => object.evidenceState === "participant-evidence-complete" && ["12A", "12A-S1", "15A", "16A", "17A"].includes(object.id)), "Phase M contains no participant results.");

console.log("Matrix-paper Archive v2 intake passed: semantic fixed-paper evidence gate plus three independent elastic children, with no combined mechanism or participant result.");
