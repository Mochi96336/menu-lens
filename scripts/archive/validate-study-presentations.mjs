import { loadArchiveCatalog } from "./load-catalog.mjs";
import { studyPresentations } from "../../research-history/catalog/study-presentations.mjs";

const catalog = await loadArchiveCatalog();
const objectById = new Map(catalog.objects.map((object) => [object.id, object]));
const studies = catalog.objects.filter((object) => object.objectType === "study");
const studyIds = new Set(studies.map((object) => object.id));

const allowedFields = new Set([
  "method",
  "subjectLabel",
  "subjectIds",
  "prerequisiteIds",
  "boundaryLabel",
  "boundary",
]);

const requireString = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
};

const requireReferenceIds = (value, label, { allowEmpty = false } = {}) => {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be ${allowEmpty ? "an array" : "a non-empty array"}.`);
  }
  if (new Set(value).size !== value.length) {
    throw new Error(`${label} must not contain duplicate object IDs.`);
  }
  for (const id of value) {
    requireString(id, `${label} entry`);
    if (!objectById.has(id)) throw new Error(`${label} references unknown object ${id}.`);
  }
};

for (const study of studies) {
  const presentation = studyPresentations[study.id];
  if (!presentation) {
    throw new Error(`Study ${study.id} is missing explicit presentation metadata.`);
  }

  for (const key of Object.keys(presentation)) {
    if (!allowedFields.has(key)) {
      throw new Error(`Study presentation ${study.id} has unsupported field ${key}.`);
    }
  }
  for (const identityField of ["title", "cardMeta"]) {
    if (Object.prototype.hasOwnProperty.call(presentation, identityField)) {
      throw new Error(
        `Study presentation ${study.id} must not duplicate derived or canonical field ${identityField}.`,
      );
    }
  }

  requireString(presentation.method, `Study presentation ${study.id}.method`);
  requireString(presentation.subjectLabel, `Study presentation ${study.id}.subjectLabel`);
  requireReferenceIds(presentation.subjectIds, `Study presentation ${study.id}.subjectIds`);
  requireReferenceIds(
    presentation.prerequisiteIds,
    `Study presentation ${study.id}.prerequisiteIds`,
    { allowEmpty: true },
  );
  requireString(presentation.boundaryLabel, `Study presentation ${study.id}.boundaryLabel`);
  requireString(presentation.boundary, `Study presentation ${study.id}.boundary`);

  const overlap = presentation.subjectIds.filter((id) => presentation.prerequisiteIds.includes(id));
  if (overlap.length) {
    throw new Error(
      `Study presentation ${study.id} cannot treat ${overlap.join(", ")} as both subject and prerequisite.`,
    );
  }
  for (const prerequisiteId of presentation.prerequisiteIds) {
    if (!study.dependsOn.includes(prerequisiteId)) {
      throw new Error(
        `Study presentation ${study.id} prerequisite ${prerequisiteId} must appear in canonical dependsOn.`,
      );
    }
  }
}

for (const objectId of Object.keys(studyPresentations)) {
  if (!studyIds.has(objectId)) {
    throw new Error(`Study presentation ${objectId} does not correspond to a canonical Study object.`);
  }
}

console.log(
  `Study presentations: ${studies.length} Study objects with explicit protocol contracts and valid references.`,
);
