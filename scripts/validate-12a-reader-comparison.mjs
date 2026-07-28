import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { Script } from "node:vm";
import { loadArchiveCatalog, root } from "./archive/load-catalog.mjs";

const archive = new URL("research-history/", root);
const [catalog, runner, protocol, observation, evidenceIndex] = await Promise.all([
  loadArchiveCatalog(),
  readFile(new URL("studies/12a-reader-comparison/index.html", archive), "utf8"),
  readFile(new URL("docs/research-history/12a-reader-comparison-protocol.md", root), "utf8"),
  readFile(new URL("docs/research-history/12a-reader-comparison-observation-sheet.md", root), "utf8"),
  readFile(new URL("review-assets/12a-reader-comparison/README.md", archive), "utf8"),
]);
await access(new URL("records/12a-s1/index.html", archive));

const study = catalog.objects.find((entry) => entry.id === "12A-S1");
assert.ok(study, "Archive v2 catalog must contain 12A-S1.");
for (const [field, expected] of Object.entries({
  family: "matrix-paper",
  objectType: "study",
  researchParentId: "12A",
  disposition: "study-only",
  evidenceState: "participant-study-ready",
  entrypoint: "studies/12a-reader-comparison/index.html",
  validationProfile: "12a-reader-comparison",
  reviewDocument: "records/12a-s1/index.html",
  evidencePath: "review-assets/12a-reader-comparison/README.md",
  sourcePr: 11,
  sourceCommit: "cb0035a728dfc058a87f3f4a64b4fa1365e537c8",
})) assert.equal(study[field], expected, `12A-S1.${field} drifted.`);
assert.deepEqual([...study.dependsOn], ["12A"]);
assert.deepEqual([...study.evidenceFor], ["12", "12A"]);
assert.ok(catalog.objects.some((entry) => entry.id === "12A"));

const script = runner.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1] ?? "";
assert.ok(script, "12A-S1 runner must contain one controller.");
new Script(script, { filename: "studies/12a-reader-comparison/index.html:inline" });
for (const contract of [
  '{ key: "parent-12", href: "../../phases/12-paper-menu-field/" }',
  '{ key: "child-12a", href: "../../phases/12a-semantic-paper-field/" }',
  "randomBit()",
  "[...conditions].reverse()",
  'currentIndex === 0 ? "條件 A" : "條件 B"',
  'frame.src = order[currentIndex].href',
  'frame.src = "about:blank"',
  "revealButton.disabled = false",
  "blindPrototypeChrome",
  'data-viewport="320"',
  'data-viewport="390"',
  'data-viewport="1280"',
]) assert.ok(runner.includes(contract), `12A-S1 runner is missing ${contract}.`);
assert.equal((runner.match(/<iframe\b/g) ?? []).length, 1, "12A-S1 must present one condition at a time.");
for (const forbidden of [/\blocalStorage\b/, /\bsessionStorage\b/, /\bindexedDB\b/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bsendBeacon\b/, /\bfetch\s*\(/]) {
  assert.doesNotMatch(script, forbidden, `12A-S1 must not persist or submit responses: ${forbidden}`);
}
for (const phrase of [
  "randomizes parent／child order",
  "labels them only as Condition A and Condition B",
  "presents one condition at a time",
  "stores no response, identifier, analytics, or local state",
  "Use an initial qualitative gate of five readers",
  "Preference alone is not a success criterion",
  "Make 15A eligible for a separate proposal",
  "Do not infer 16A from this comparison",
]) assert.ok(protocol.includes(phrase), `12A-S1 protocol is missing ${phrase}.`);
for (const phrase of [
  "Session code:",
  "Condition order before reveal",
  "Do not record names",
  "Whole-sheet overview",
  "Near category",
  "Recalled 個人主餐 location",
  "15A evidence contribution",
  "16A evidence contribution",
]) assert.ok(observation.includes(phrase), `12A-S1 observation sheet is missing ${phrase}.`);
assert.doesNotMatch(observation, /Participant name:|Email:|Phone:|IP address:/i);
const evidenceIndexLower = evidenceIndex.toLowerCase();
for (const phrase of ["participant-study-ready", "no participant results", "protocol", "observation sheet"]) {
  assert.ok(evidenceIndexLower.includes(phrase), `12A-S1 evidence index is missing ${phrase}.`);
}
assert.ok(!catalog.objects.some((entry) => entry.id === "15A-S1" || entry.slug === "elastic-study-result"), "Study intake must not fabricate participant results or elastic approval.");

console.log("12A-S1 validation passed: blinded sequential runner, protocol gate, anonymous observation and zero persisted results.");
