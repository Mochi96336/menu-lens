import assert from "node:assert/strict";
import { loadArchiveCatalog } from "../archive/load-catalog.mjs";

await import("../validate-minimal-ledger.mjs");
await import("../validate-editorial-ledger.mjs");
await import("../validate-narrow-column-collapse.mjs");

const catalog = await loadArchiveCatalog();
const expected = [
  {
    id: "05A",
    slug: "05a-minimal-ledger-row",
    validationProfile: "minimal-ledger",
    entrypoint: "phases/05a-minimal-ledger/index.html",
    reviewDocument: "records/05a/index.html",
    evidencePath: "review-assets/05a/browser-checks.json",
    sourcePr: 17,
    sourceCommit: "b13526d9033cca9b55a9e8a6c77127a807907f39",
    styles: ["minimal-ledger.css"],
    scripts: ["minimal-ledger.js"],
  },
  {
    id: "05B",
    slug: "05b-editorial-ledger-rhythm",
    validationProfile: "editorial-ledger",
    entrypoint: "phases/05b-editorial-rhythm/index.html",
    reviewDocument: "records/05b/index.html",
    evidencePath: "review-assets/05b/browser-checks.json",
    sourcePr: 22,
    sourceCommit: "6da8ec775e7e05067789dd86b356f1841d7d568c",
    styles: ["editorial-ledger.css"],
    scripts: ["editorial-ledger.js"],
  },
  {
    id: "05C",
    slug: "05c-narrow-column-collapse",
    validationProfile: "narrow-column-collapse",
    entrypoint: "phases/05c-narrow-column-collapse/index.html",
    reviewDocument: "records/05c/index.html",
    evidencePath: "review-assets/05c/browser-checks.json",
    sourcePr: 28,
    sourceCommit: "04f948197c7dcfb4a06480d571da76c16013794b",
    styles: ["narrow-column-collapse.css"],
    scripts: ["narrow-column-collapse.js"],
  },
];

for (const contract of expected) {
  const object = catalog.objects.find((entry) => entry.id === contract.id);
  assert.ok(object, `Archive catalog must register ${contract.id}.`);
  for (const [field, value] of Object.entries({
    slug: contract.slug,
    family: "document",
    objectType: "prototype",
    researchParentId: "05",
    disposition: "provisional",
    evidenceState: "browser-verified",
    validationProfile: contract.validationProfile,
    entrypoint: contract.entrypoint,
    reviewDocument: contract.reviewDocument,
    evidencePath: contract.evidencePath,
    sourcePr: contract.sourcePr,
    sourceCommit: contract.sourceCommit,
  })) {
    assert.equal(object[field], value, `${contract.id}.${field} drifted.`);
  }
  assert.deepEqual([...object.dependsOn], [], `${contract.id} must remain an independent sibling of 05.`);
  assert.deepEqual([...object.evidenceFor], []);
  assert.deepEqual([...object.mechanismsFrom], []);
  assert.deepEqual([...object.assets.styles], contract.styles);
  assert.deepEqual([...object.assets.scripts], contract.scripts);
  assert.ok(object.nextGate, `${contract.id} must keep a direct-review next gate.`);
}

const documentChildren = catalog.objects.filter((entry) => ["05A", "05B", "05C"].includes(entry.id));
assert.equal(documentChildren.length, 3, "Document intake must contain exactly 05A, 05B and 05C.");
assert.equal(new Set(documentChildren.map((entry) => entry.entrypoint)).size, 3, "Document children must retain distinct entrypoints.");
assert.ok(!catalog.objects.some((entry) => entry.id === "05ABC" || entry.slug === "combined-ledger"), "Intake must not invent a combined fourth prototype.");

console.log("Document-family Archive v2 intake passed: three independent browser-verified provisional children of 05.");
