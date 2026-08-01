import { designModels } from "../../research-history/catalog/presentation-models.mjs";
import {
  modelDiagramKinds,
  modelDiagramMotifs,
  modelDiagramPresentations,
  modelVignetteTypes,
  modelVignetteVariants,
} from "../../research-history/catalog/model-diagram-presentations.mjs";

const modelById = new Map(designModels.map((model) => [model.id, model]));
const allowedModelFields = new Set(["kind", "signature", "statement", "motif", "edges", "sections"]);
const allowedSectionFields = new Set(["label", "conceptLabel", "note", "position", "vignette"]);
const allowedPositionFields = new Set(["x", "y"]);
const allowedVignetteFields = new Set(["type", "variant", "activeIndex", "expansion", "falloff"]);

const requireString = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
};

const requireFiniteRange = (value, label, minimum, maximum) => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be finite and between ${minimum} and ${maximum}.`);
  }
};

const presentationIds = Object.keys(modelDiagramPresentations);
const canonicalModelIds = designModels.map((model) => model.id);
if (JSON.stringify(presentationIds) !== JSON.stringify(canonicalModelIds)) {
  throw new Error(`Diagram presentations must cover every design model in canonical order: ${canonicalModelIds.join(", ")}.`);
}

for (const [modelId, presentation] of Object.entries(modelDiagramPresentations)) {
  const model = modelById.get(modelId);
  if (!model) throw new Error(`Diagram presentation references unknown model ${modelId}.`);

  for (const field of Object.keys(presentation)) {
    if (!allowedModelFields.has(field)) throw new Error(`${modelId} diagram has unsupported field ${field}.`);
  }
  if (!modelDiagramKinds.includes(presentation.kind)) {
    throw new Error(`${modelId} diagram kind ${presentation.kind} is not implemented.`);
  }
  if (!modelDiagramMotifs.includes(presentation.motif)) {
    throw new Error(`${modelId} diagram motif ${presentation.motif} is not implemented.`);
  }
  requireString(presentation.signature, `${modelId}.signature`);
  requireString(presentation.statement, `${modelId}.statement`);

  if (!Array.isArray(presentation.edges)) throw new Error(`${modelId}.edges must be an array.`);
  if (!presentation.sections || typeof presentation.sections !== "object" || Array.isArray(presentation.sections)) {
    throw new Error(`${modelId}.sections must be an object keyed by canonical section ID.`);
  }

  const canonicalSectionIds = model.sections.map((section) => section.id);
  const presentedSectionIds = Object.keys(presentation.sections);
  if (JSON.stringify(presentedSectionIds) !== JSON.stringify(canonicalSectionIds)) {
    throw new Error(`${modelId} diagram sections must preserve canonical section order: ${canonicalSectionIds.join(", ")}.`);
  }

  const seenEdges = new Set();
  for (const [index, edge] of presentation.edges.entries()) {
    if (!Array.isArray(edge) || edge.length !== 2) throw new Error(`${modelId}.edges[${index}] must contain two section IDs.`);
    const [from, to] = edge;
    if (!canonicalSectionIds.includes(from) || !canonicalSectionIds.includes(to)) {
      throw new Error(`${modelId}.edges[${index}] references unknown section ${from} → ${to}.`);
    }
    if (from === to) throw new Error(`${modelId}.edges[${index}] must connect distinct sections.`);
    const key = `${from}->${to}`;
    if (seenEdges.has(key)) throw new Error(`${modelId} repeats edge ${key}.`);
    seenEdges.add(key);
  }

  if (presentation.kind === "sequence" && presentation.edges.length !== Math.max(0, model.sections.length - 1)) {
    throw new Error(`${modelId} sequence must connect every adjacent canonical section exactly once.`);
  }
  if (presentation.kind === "branch" && presentation.edges.length !== model.sections.length - 1) {
    throw new Error(`${modelId} branch must connect one root to every branch section.`);
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
    if (sectionPresentation.note.length > 22) {
      throw new Error(`${modelId}/${section.id}.note must remain a compact diagram caption.`);
    }
    if ("objectIds" in sectionPresentation || "defaultObjectId" in sectionPresentation) {
      throw new Error(`${modelId}/${section.id} presentation must not override canonical object membership.`);
    }

    const position = sectionPresentation.position;
    if (!position || typeof position !== "object" || Array.isArray(position)) {
      throw new Error(`${modelId}/${section.id}.position must be an object.`);
    }
    for (const field of Object.keys(position)) {
      if (!allowedPositionFields.has(field)) throw new Error(`${modelId}/${section.id}.position has unsupported field ${field}.`);
    }
    requireFiniteRange(position.x, `${modelId}/${section.id}.position.x`, 5, 95);
    requireFiniteRange(position.y, `${modelId}/${section.id}.position.y`, 10, 90);

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
      throw new Error(`${modelId}/${section.id} vignette type ${vignette.type} is not implemented.`);
    }
    if (!modelVignetteVariants[vignette.type].includes(vignette.variant)) {
      throw new Error(`${modelId}/${section.id} vignette variant ${vignette.variant} is not valid for ${vignette.type}.`);
    }
    if ("activeIndex" in vignette) requireFiniteRange(vignette.activeIndex, `${modelId}/${section.id}.vignette.activeIndex`, 0, 12);
    if ("expansion" in vignette) requireFiniteRange(vignette.expansion, `${modelId}/${section.id}.vignette.expansion`, 1, 3);
    if ("falloff" in vignette) requireFiniteRange(vignette.falloff, `${modelId}/${section.id}.vignette.falloff`, .2, .95);
    if ("expansion" in vignette && !(vignette.type === "horizontal" && vignette.variant === "spread")) {
      throw new Error(`${modelId}/${section.id}.vignette.expansion is only valid for horizontal/spread.`);
    }
    if ("falloff" in vignette && !(vignette.type === "horizontal" && vignette.variant === "fisheye")) {
      throw new Error(`${modelId}/${section.id}.vignette.falloff is only valid for horizontal/fisheye.`);
    }
  }
}

console.log(`Model diagram presentations: ${presentationIds.length} complete model contracts verified.`);
