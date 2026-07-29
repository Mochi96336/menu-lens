import assert from "node:assert/strict";
import { loadArchiveCatalog } from "../archive/load-catalog.mjs";

await import("../validate-multiscale-return.mjs");
await import("../validate-multiscale-retained-truth.mjs");

const catalog = await loadArchiveCatalog();
const byId = new Map(catalog.objects.map((object) => [object.id, object]));
const parent = byId.get("06");
const returnCorrection = byId.get("A-M3");
const truthCorrection = byId.get("A-M4");

assert.ok(parent, "Multi-scale intake requires parent 06.");
assert.equal(parent.family, "relational");
assert.equal(parent.entrypoint, "phases/06-multiscale-menu-map/index.html");
assert.equal(parent.evidenceState, "browser-verified");
assert.ok(parent.assets.styles.includes("multiscale-return.css"));
assert.ok(parent.assets.scripts.includes("multiscale-menu-controller.js"));
assert.ok(parent.summary.includes("A-M3") && parent.summary.includes("A-M4"));

assert.ok(returnCorrection, "Multi-scale intake requires A-M3.");
assert.equal(returnCorrection.objectType, "correction");
assert.equal(returnCorrection.researchParentId, "06");
assert.equal(returnCorrection.disposition, "keep-controlled");
assert.equal(returnCorrection.evidenceState, "browser-verified");
assert.equal(returnCorrection.entrypoint, null);
assert.equal(returnCorrection.sourcePr, 36);
assert.equal(returnCorrection.sourceCommit, "54e4fa61f5a11d793345ee09a0b0ab3b57c8f99f");
assert.deepEqual([...returnCorrection.dependsOn], []);
assert.deepEqual([...returnCorrection.evidenceFor], ["06"]);

assert.ok(truthCorrection, "Multi-scale intake requires A-M4.");
assert.equal(truthCorrection.objectType, "correction");
assert.equal(truthCorrection.researchParentId, "06");
assert.equal(truthCorrection.disposition, "keep-controlled");
assert.equal(truthCorrection.evidenceState, "browser-verified");
assert.equal(truthCorrection.entrypoint, null);
assert.equal(truthCorrection.sourcePr, 39);
assert.equal(truthCorrection.sourceCommit, "69ef6f6e0247dc6362ae727adc533d23a8c45ff2");
assert.deepEqual([...truthCorrection.dependsOn], ["A-M3"]);
assert.deepEqual([...truthCorrection.evidenceFor], ["06"]);
assert.ok(truthCorrection.nextGate.includes("stop the 06 line"));

assert.ok(!catalog.objects.some((object) => object.id === "06A" || object.slug === "product-bearing-landmarks"), "Archive v2 must not intake 06A.");
assert.ok(!catalog.objects.some((object) => ["A-M3", "A-M4"].includes(object.id) && object.evidenceState === "participant-evidence-complete"));

console.log("Multi-scale Archive v2 intake passed: corrected 06 snapshot, A-M3 continuity and A-M4 truth wording preserved without claiming reader trust.");
