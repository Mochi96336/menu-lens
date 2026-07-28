import { loadArchiveCatalog } from "./load-catalog.mjs";

const catalog = await loadArchiveCatalog();
if (catalog.schemaVersion !== 2) throw new Error("Archive catalog must expose schemaVersion 2.");
if (catalog.migrationSourceSchemaVersion !== 1) throw new Error("Archive catalog must record schema-v1 migration source.");

const requireString = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
};

const requireRelativeArchivePath = (value, label) => {
  requireString(value, label);
  const segments = value.split("/");
  if (value.startsWith("/") || value.includes("\\") || segments.includes("..") || segments.includes(".")) {
    throw new Error(`${label} must be relative to research-history without dot segments: ${value}`);
  }
};

const familyIds = new Set();
for (const family of catalog.families) {
  requireString(family.id, "Family id");
  requireString(family.title, `Family ${family.id} title`);
  requireString(family.summary, `Family ${family.id} summary`);
  requireString(family.question, `Family ${family.id} question`);
  if (familyIds.has(family.id)) throw new Error(`Duplicate archive family id: ${family.id}`);
  familyIds.add(family.id);
}

const objectIds = new Set();
const slugs = new Set();
const entrypoints = new Set();
for (const object of catalog.objects) {
  requireString(object.id, "Archive object id");
  requireString(object.slug, `Archive object ${object.id} slug`);
  requireString(object.title, `Archive object ${object.id} title`);
  requireString(object.family, `Archive object ${object.id} family`);
  requireString(object.summary, `Archive object ${object.id} summary`);

  if (objectIds.has(object.id)) throw new Error(`Duplicate archive object id: ${object.id}`);
  if (slugs.has(object.slug)) throw new Error(`Duplicate archive object slug: ${object.slug}`);
  if (!familyIds.has(object.family)) throw new Error(`${object.id} references unknown family ${object.family}.`);
  if (!catalog.objectTypes.includes(object.objectType)) throw new Error(`${object.id} has invalid objectType ${object.objectType}.`);
  if (!catalog.dispositions.includes(object.disposition)) throw new Error(`${object.id} has invalid disposition ${object.disposition}.`);
  if (!catalog.evidenceStates.includes(object.evidenceState)) throw new Error(`${object.id} has invalid evidenceState ${object.evidenceState}.`);

  for (const [name, relation] of [
    ["dependsOn", object.dependsOn],
    ["evidenceFor", object.evidenceFor],
    ["mechanismsFrom", object.mechanismsFrom],
  ]) {
    if (!Array.isArray(relation)) throw new Error(`${object.id}.${name} must be an array.`);
    for (const reference of relation) requireString(reference, `${object.id}.${name} reference`);
    if (new Set(relation).size !== relation.length) throw new Error(`${object.id}.${name} contains a duplicate relation.`);
    if (relation.includes(object.id)) throw new Error(`${object.id}.${name} must not reference itself.`);
  }

  if (!object.assets || !Array.isArray(object.assets.styles) || !Array.isArray(object.assets.scripts)) {
    throw new Error(`${object.id}.assets must expose styles and scripts arrays.`);
  }
  for (const asset of [...object.assets.styles, ...object.assets.scripts]) {
    requireRelativeArchivePath(asset, `${object.id} asset`);
  }

  if (object.entrypoint) {
    requireRelativeArchivePath(object.entrypoint, `${object.id} entrypoint`);
    if (entrypoints.has(object.entrypoint)) throw new Error(`Duplicate archive entrypoint: ${object.entrypoint}`);
    entrypoints.add(object.entrypoint);
  }
  if (object.reviewDocument) requireRelativeArchivePath(object.reviewDocument, `${object.id} reviewDocument`);
  if (object.evidencePath) requireRelativeArchivePath(object.evidencePath, `${object.id} evidencePath`);
  if (object.sourcePr !== null && (!Number.isInteger(object.sourcePr) || object.sourcePr <= 0)) {
    throw new Error(`${object.id}.sourcePr must be a positive integer or null.`);
  }
  if (object.sourceCommit !== null) requireString(object.sourceCommit, `${object.id}.sourceCommit`);

  objectIds.add(object.id);
  slugs.add(object.slug);
}

for (const object of catalog.objects) {
  const references = [
    object.researchParentId,
    ...object.dependsOn,
    ...object.evidenceFor,
    ...object.mechanismsFrom,
  ].filter(Boolean);
  for (const reference of references) {
    if (!objectIds.has(reference)) throw new Error(`${object.id} references unknown object ${reference}.`);
  }
  if (object.researchParentId === object.id) throw new Error(`${object.id} must not be its own research parent.`);
}

const objectById = new Map(catalog.objects.map((object) => [object.id, object]));
const assertAcyclic = (relationName, relatedIds) => {
  const visiting = new Set();
  const visited = new Set();
  const visit = (id, path) => {
    if (visiting.has(id)) throw new Error(`${relationName} cycle: ${[...path, id].join(" -> ")}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const relatedId of relatedIds(objectById.get(id))) visit(relatedId, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of objectIds) visit(id, []);
};

assertAcyclic("researchParentId", (object) => object.researchParentId ? [object.researchParentId] : []);
assertAcyclic("dependsOn", (object) => object.dependsOn);

console.log(`Archive catalog v2: ${catalog.objects.length} objects across ${catalog.families.length} families.`);
