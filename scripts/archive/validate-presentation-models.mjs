import { loadArchiveCatalog } from "./load-catalog.mjs";
import { designModels, presentationNotes } from "../../research-history/catalog/presentation-models.mjs";

const catalog = await loadArchiveCatalog();
const objectById = new Map(catalog.objects.map((object) => [object.id, object]));

const requireString = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
};

const canonicalOnlyFields = new Set([
  "objectType",
  "researchParentId",
  "dependsOn",
  "evidenceFor",
  "mechanismsFrom",
  "disposition",
  "evidenceState",
  "entrypoint",
  "validationProfile",
  "assets",
  "nextGate",
  "reviewDocument",
  "evidencePath",
  "sourcePr",
  "sourceCommit",
  "legacy",
]);

const assertPresentationOnly = (value, label) => {
  for (const key of Object.keys(value)) {
    if (canonicalOnlyFields.has(key)) {
      throw new Error(`${label} must not duplicate canonical catalog field ${key}.`);
    }
  }
};

if (!Array.isArray(designModels) || designModels.length === 0) {
  throw new Error("Design models must be a non-empty array.");
}

const modelIds = new Set();
const primaryOwners = new Map();
for (const model of designModels) {
  assertPresentationOnly(model, `Design model ${model.id ?? "unknown"}`);
  requireString(model.id, "Design model id");
  requireString(model.title, `Design model ${model.id} title`);
  requireString(model.eyebrow, `Design model ${model.id} eyebrow`);
  requireString(model.summary, `Design model ${model.id} summary`);
  requireString(model.substrate, `Design model ${model.id} substrate`);
  requireString(model.retains, `Design model ${model.id} retains`);
  requireString(model.varies, `Design model ${model.id} varies`);
  requireString(model.question, `Design model ${model.id} question`);
  requireString(model.featuredObjectId, `Design model ${model.id} featuredObjectId`);

  if (modelIds.has(model.id)) throw new Error(`Duplicate design model id: ${model.id}`);
  modelIds.add(model.id);
  if (!Array.isArray(model.sections) || model.sections.length === 0) {
    throw new Error(`Design model ${model.id} must contain at least one section.`);
  }

  const sectionIds = new Set();
  const modelObjectIds = new Set();
  for (const section of model.sections) {
    assertPresentationOnly(section, `Design model ${model.id} section ${section.id ?? "unknown"}`);
    requireString(section.id, `Design model ${model.id} section id`);
    requireString(section.title, `Design model ${model.id} section ${section.id} title`);
    requireString(section.summary, `Design model ${model.id} section ${section.id} summary`);
    requireString(section.defaultObjectId, `Design model ${model.id} section ${section.id} defaultObjectId`);

    if (sectionIds.has(section.id)) throw new Error(`Duplicate section ${model.id}/${section.id}.`);
    sectionIds.add(section.id);
    if (!Array.isArray(section.objectIds) || section.objectIds.length === 0) {
      throw new Error(`Design model ${model.id} section ${section.id} must contain objectIds.`);
    }
    if (new Set(section.objectIds).size !== section.objectIds.length) {
      throw new Error(`Design model ${model.id} section ${section.id} contains duplicate object IDs.`);
    }
    if (!section.objectIds.includes(section.defaultObjectId)) {
      throw new Error(`Design model ${model.id} section ${section.id} default object must appear in objectIds.`);
    }

    for (const objectId of section.objectIds) {
      if (!objectById.has(objectId)) {
        throw new Error(`Design model ${model.id} section ${section.id} references unknown object ${objectId}.`);
      }
      modelObjectIds.add(objectId);
    }
  }

  if (!modelObjectIds.has(model.featuredObjectId)) {
    throw new Error(`Design model ${model.id} featured object must appear in one of its sections.`);
  }
  const featured = objectById.get(model.featuredObjectId);
  if (["negative-evidence", "rejected", "superseded"].includes(featured.disposition)) {
    throw new Error(`Design model ${model.id} cannot feature stopped object ${featured.id}.`);
  }

  for (const objectId of modelObjectIds) {
    const previousOwner = primaryOwners.get(objectId);
    if (previousOwner && previousOwner !== model.id) {
      throw new Error(`Object ${objectId} appears in multiple design models: ${previousOwner}, ${model.id}.`);
    }
    primaryOwners.set(objectId, model.id);
  }
}

const intentionallyUngrouped = new Set(["02", "03", "04", "ARCHIVE-V2"]);
const ungrouped = catalog.objects
  .map((object) => object.id)
  .filter((id) => !primaryOwners.has(id));
for (const id of ungrouped) {
  if (!intentionallyUngrouped.has(id)) {
    throw new Error(`Archive object ${id} is unexpectedly absent from design models.`);
  }
}
for (const id of intentionallyUngrouped) {
  if (!ungrouped.includes(id)) throw new Error(`Intentionally ungrouped object ${id} is now grouped; update the boundary explicitly.`);
}

const allowedNoteFields = new Set(["shortLabel", "variable", "before", "after", "unchanged"]);
for (const [objectId, note] of Object.entries(presentationNotes)) {
  if (!objectById.has(objectId)) throw new Error(`Presentation note references unknown object ${objectId}.`);
  if (!primaryOwners.has(objectId)) throw new Error(`Presentation note ${objectId} must belong to a design model.`);
  assertPresentationOnly(note, `Presentation note ${objectId}`);
  for (const key of Object.keys(note)) {
    if (!allowedNoteFields.has(key)) throw new Error(`Presentation note ${objectId} has unsupported field ${key}.`);
  }
  for (const field of allowedNoteFields) {
    requireString(note[field], `Presentation note ${objectId}.${field}`);
  }
  const object = objectById.get(objectId);
  if (object.objectType !== "prototype") {
    throw new Error(`Presentation note ${objectId} describes an isolated design change but the object type is ${object.objectType}.`);
  }
}

console.log(
  `Design models: ${designModels.length} models, ${primaryOwners.size} grouped objects, `
  + `${ungrouped.length} intentional archive-only objects, ${Object.keys(presentationNotes).length} isolated notes.`,
);
