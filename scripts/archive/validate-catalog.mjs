import { loadArchiveCatalog } from "./load-catalog.mjs";

const catalog = await loadArchiveCatalog();
if (catalog.schemaVersion !== 2) throw new Error("Archive catalog must expose schemaVersion 2.");

const familyIds = new Set(catalog.families.map((family) => family.id));
const objectIds = new Set();
const slugs = new Set();
const entrypoints = new Set();

for (const object of catalog.objects) {
  if (objectIds.has(object.id)) throw new Error(`Duplicate archive object id: ${object.id}`);
  if (slugs.has(object.slug)) throw new Error(`Duplicate archive object slug: ${object.slug}`);
  if (!familyIds.has(object.family)) throw new Error(`${object.id} references unknown family ${object.family}.`);
  if (!catalog.objectTypes.includes(object.objectType)) throw new Error(`${object.id} has invalid objectType ${object.objectType}.`);
  if (!catalog.dispositions.includes(object.disposition)) throw new Error(`${object.id} has invalid disposition ${object.disposition}.`);
  if (!catalog.evidenceStates.includes(object.evidenceState)) throw new Error(`${object.id} has invalid evidenceState ${object.evidenceState}.`);
  if (object.entrypoint) {
    if (entrypoints.has(object.entrypoint)) throw new Error(`Duplicate archive entrypoint: ${object.entrypoint}`);
    entrypoints.add(object.entrypoint);
  }
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
  for (const relation of [object.dependsOn, object.evidenceFor, object.mechanismsFrom]) {
    if (new Set(relation).size !== relation.length) throw new Error(`${object.id} contains a duplicate relation.`);
  }
}

console.log(`Archive catalog v2: ${catalog.objects.length} objects across ${catalog.families.length} families.`);
