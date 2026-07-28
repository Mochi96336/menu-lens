import assert from "node:assert/strict";
import { loadArchiveCatalog } from "../archive/load-catalog.mjs";
import { archiveLegacyOverrides } from "../../research-history/catalog/legacy-overrides.mjs";

await import("../validate-07-horizontal-menu-atlas.mjs");
await import("../validate-08a-compressed-truth-cue.mjs");
await import("../validate-09a-direct-minimap-scrub.mjs");
await import("../validate-local-fisheye.mjs");

const catalog = await loadArchiveCatalog();
const byId = new Map(catalog.objects.map((object) => [object.id, object]));
const horizontalOverrideIds = Object.keys(archiveLegacyOverrides)
  .filter((id) => byId.get(id)?.family === "horizontal")
  .sort();
assert.deepEqual(horizontalOverrideIds, ["07"], "Horizontal intake must override only existing horizontal object 07.");
for (const [id, parent] of [["07", null], ["08", "07"], ["08A", "08"], ["09", "08"], ["09A", "09"], ["10", "09"], ["10A", "10"]]) {
  const object = byId.get(id);
  assert.ok(object, `Horizontal intake requires object ${id}.`);
  assert.equal(object.family, "horizontal", `${id} must remain in the horizontal family.`);
  assert.equal(object.researchParentId, parent, `${id} research parent drifted.`);
}
for (const id of ["08A", "09A", "10A"]) {
  const object = byId.get(id);
  assert.equal(object.objectType, "prototype");
  assert.equal(object.disposition, "keep-controlled");
  assert.equal(object.evidenceState, "implementation-only");
  assert.deepEqual([...object.dependsOn], []);
  assert.deepEqual([...object.evidenceFor], []);
  assert.deepEqual([...object.mechanismsFrom], []);
  assert.ok(object.sourcePr && /^[0-9a-f]{40}$/.test(object.sourceCommit), `${id} must retain exact source provenance.`);
  assert.ok(object.entrypoint && object.reviewDocument && object.evidencePath, `${id} must publish executable, record and evidence paths.`);
}
assert.equal(byId.get("07").disposition, "reference");
assert.equal(byId.get("07").evidenceState, "implementation-only");
assert.ok(!catalog.objects.some((object) => ["08A09A10A", "horizontal-combination", "combined-horizontal"].includes(object.id) || object.slug === "combined-horizontal"), "Horizontal intake must not invent a combined sibling mechanism.");

console.log("Horizontal-family Archive v2 intake passed: executable reference 07 and three independent implementation-only controlled children.");
