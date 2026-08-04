import { modelDiagramPresentations } from "./model-diagram-presentations.mjs";
import { designModels } from "./presentation-models.mjs";

const canonicalModelIds = designModels.map((model) => model.id);
const diagramModelIds = Object.keys(modelDiagramPresentations);
if (JSON.stringify(diagramModelIds) !== JSON.stringify(canonicalModelIds)) {
  throw new Error(`Model route diagrams must cover canonical models in order: ${canonicalModelIds.join(", ")}.`);
}

const objectModelOwners = new Map();

const freezeSectionContract = ({ model, section, diagram }) => Object.freeze({
  id: section.id,
  title: section.title,
  summary: section.summary,
  defaultObjectId: section.defaultObjectId,
  objectIds: section.objectIds,
  modelSection: section,
  diagram,
});

const freezeModelContract = (model) => {
  const diagram = modelDiagramPresentations[model.id];
  if (!diagram) throw new Error(`Missing route diagram for ${model.id}.`);

  const canonicalSectionIds = model.sections.map((section) => section.id);
  const diagramSectionIds = Object.keys(diagram.sections);
  if (JSON.stringify(diagramSectionIds) !== JSON.stringify(canonicalSectionIds)) {
    throw new Error(`${model.id} route diagram must preserve canonical section order: ${canonicalSectionIds.join(", ")}.`);
  }

  const sections = Object.freeze(model.sections.map((section) => {
    if (!section.objectIds.includes(section.defaultObjectId)) {
      throw new Error(`${model.id}/${section.id} default object ${section.defaultObjectId} is not in its canonical objectIds.`);
    }

    for (const objectId of section.objectIds) {
      const existingOwner = objectModelOwners.get(objectId);
      if (existingOwner && existingOwner !== model.id) {
        throw new Error(`${objectId} crosses model families: ${existingOwner}, ${model.id}.`);
      }
      objectModelOwners.set(objectId, model.id);
    }

    const sectionDiagram = diagram.sections[section.id];
    if (!sectionDiagram) throw new Error(`${model.id}/${section.id} is missing route presentation metadata.`);
    if ("objectIds" in sectionDiagram || "defaultObjectId" in sectionDiagram) {
      throw new Error(`${model.id}/${section.id} route metadata must not redefine canonical membership.`);
    }
    return freezeSectionContract({ model, section, diagram: sectionDiagram });
  }));

  return Object.freeze({
    id: model.id,
    title: model.title,
    model,
    diagram,
    sections,
    sectionById: Object.freeze(Object.fromEntries(sections.map((section) => [section.id, section]))),
  });
};

export const modelRouteContracts = Object.freeze(designModels.map(freezeModelContract));

export const modelRouteContractById = Object.freeze(Object.fromEntries(
  modelRouteContracts.map((contract) => [contract.id, contract]),
));

export const getModelRouteContract = (modelId) => {
  const contract = modelRouteContractById[modelId];
  if (!contract) throw new Error(`Unknown model route contract ${modelId}.`);
  return contract;
};

export const getModelRouteSectionContract = (modelId, sectionId) => {
  const contract = getModelRouteContract(modelId);
  const section = contract.sectionById[sectionId];
  if (!section) throw new Error(`Unknown model route section ${modelId}/${sectionId}.`);
  return section;
};
