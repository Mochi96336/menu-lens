import { designModels } from "../../research-history/catalog/presentation-models.mjs";
import {
  modelDiagramKinds,
  modelDiagramMotifs,
  modelDiagramPresentations,
  modelVignetteTypes,
} from "../../research-history/catalog/model-diagram-presentations.mjs";

const modelById = new Map(designModels.map((model) => [model.id, model]));
const allowedModelFields = new Set(["kind", "signature", "statement", "motif", "sections"]);
const allowedSectionFields = new Set(["label", "conceptLabel", "note", "vignette"]);
const allowedVignetteFields = new Set(["type", "activeIndex", "expansion", "falloff"]);

const requireString = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
};

for (const [modelId, presentation] of Object.entries(modelDiagramPresentations)) {
  const model = modelById.get(modelId);
  if (!model) throw new Error(`Diagram presentation references unknown model ${modelId}.`);

  for (const field of Object.keys(presentation)) {
    if (!allowedModelFields.has(field)) throw new Error(`${modelId} diagram has unsupported field ${field}.`);
  }
  if (!modelDiagramKinds.includes(presentation.kind)) {
    throw new Error(`${modelId} diagram kind ${presentation.kind} is not supported.`);
  }
  if (!modelDiagramMotifs.includes(presentation.motif)) {
    throw new Error(`${modelId} diagram motif ${presentation.motif} is not supported.`);
  }
  requireString(presentation.signature, `${modelId}.signature`);
  requireString(presentation.statement, `${modelId}.statement`);
  if (!presentation.sections || typeof presentation.sections !== "object" || Array.isArray(presentation.sections)) {
    throw new Error(`${modelId}.sections must be an object keyed by canonical section ID.`);
  }

  const canonicalIds = model.sections.map((section) => section.id);
  const presentationIds = Object.keys(presentation.sections);
  if (JSON.stringify(presentationIds) !== JSON.stringify(canonicalIds)) {
    throw new Error(`${modelId} diagram sections must preserve canonical section order: ${canonicalIds.join(", ")}.`);
  }

  for (const section of model.sections) {
    const sectionPresentation = presentation.sections[section.id];
    if (!sectionPresentation) throw new Error(`${modelId}/${section.id} is missing diagram presentation metadata.`);
    for (const field of Object.keys(sectionPresentation)) {
      if (!allowedSectionFields.has(field)) {
        throw new Error(`${modelId}/${section.id} has unsupported presentation field ${field}.`);
      }
    }
    requireString(sectionPresentation.label, `${modelId}/${section.id}.label`);
    requireString(sectionPresentation.conceptLabel, `${modelId}/${section.id}.conceptLabel`);
    requireString(sectionPresentation.note, `${modelId}/${section.id}.note`);
    if ("objectIds" in sectionPresentation || "defaultObjectId" in sectionPresentation) {
      throw new Error(`${modelId}/${section.id} presentation must not override canonical object membership.`);
    }

    const vignette = sectionPresentation.vignette;
    if (!vignette || typeof vignette !== "object" || Array.isArray(vignette)) {
      throw new Error(`${modelId}/${section.id}.vignette must be an object.`);
    }
    for (const field of Object.keys(vignette)) {
      if (!allowedVignetteFields.has(field)) {
        throw new Error(`${modelId}/${section.id}.vignette has unsupported field ${field}.`);
      }
    }
    if (!modelVignetteTypes.includes(vignette.type)) {
      throw new Error(`${modelId}/${section.id} vignette type ${vignette.type} is not supported.`);
    }
    for (const numericField of ["activeIndex", "expansion", "falloff"]) {
      if (numericField in vignette && !Number.isFinite(vignette[numericField])) {
        throw new Error(`${modelId}/${section.id}.vignette.${numericField} must be finite.`);
      }
    }
  }
}

console.log(`Model diagram presentations: ${Object.keys(modelDiagramPresentations).length} configured model contract verified.`);
