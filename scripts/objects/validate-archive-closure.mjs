import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadArchiveCatalog, root } from "../archive/load-catalog.mjs";

const catalog = await loadArchiveCatalog();
const byId = new Map(catalog.objects.map((object) => [object.id, object]));
const synthesis = byId.get("ARCHIVE-V2");
const expectedEvidence = ["24A", "24B", "24C", "A-M3", "A-M4", "26A", "26C", "25P-S1"];

assert.ok(synthesis, "Archive v2 closure synthesis is missing.");
assert.equal(synthesis.objectType, "synthesis");
assert.equal(synthesis.disposition, "reference");
assert.equal(synthesis.evidenceState, "implementation-only");
assert.equal(synthesis.entrypoint, null);
assert.equal(synthesis.reviewDocument, "records/archive-v2-closure/index.html");
assert.deepEqual([...synthesis.evidenceFor], expectedEvidence);
for (const id of expectedEvidence) assert.ok(byId.has(id), `Archive v2 synthesis references missing intake ${id}.`);
assert.ok(synthesis.summary.includes("不選定產品方向"));
assert.ok(synthesis.nextGate.includes("new prototype creation remains frozen"));

const record = await readFile(new URL("research-history/records/archive-v2-closure/index.html", root), "utf8");
for (const phrase of [
  "foundation",
  "document",
  "horizontal",
  "matrix-paper",
  "Landscape Core",
  "Landscape Ablations",
  "Vertical Landscape",
  "Multi-scale",
  "Depth",
  "25PA Task-first Entry",
  "不選定產品方向",
  "不授權新增 prototype branch",
]) assert.ok(record.includes(phrase), `Archive v2 synthesis record is missing ${phrase}.`);

for (const id of ["24A", "24B", "24C"]) assert.equal(byId.get(id).evidenceState, "direct-review-pending");
for (const id of ["A-M3", "A-M4", "26A", "26C"]) assert.equal(byId.get(id).disposition, "keep-controlled");
assert.equal(byId.get("25P-S1").evidenceState, "participant-study-ready");
assert.ok(!catalog.objects.some((object) => object.id === "25PA"));
assert.ok(!catalog.objects.some((object) => object.objectType === "synthesis" && object.disposition === "substrate"), "Synthesis must not silently select a product substrate.");

console.log("Archive v2 closure synthesis passed: intake complete, product selection absent, direct-review and participant gates preserved.");
