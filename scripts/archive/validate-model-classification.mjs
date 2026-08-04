import { designModels } from "../../research-history/catalog/presentation-models.mjs";
import { modelDiagramPresentations } from "../../research-history/catalog/model-diagram-presentations.mjs";

const modelById = new Map(designModels.map((model) => [model.id, model]));
const section = (modelId, sectionId) => {
  const model = modelById.get(modelId);
  if (!model) throw new Error(`Missing design model ${modelId}.`);
  const match = model.sections.find((candidate) => candidate.id === sectionId);
  if (!match) throw new Error(`Missing design model section ${modelId}/${sectionId}.`);
  return match;
};

const expectIds = (actual, expected, label) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} must contain ${expected.join(", ")}; received ${actual.join(", ")}.`);
  }
};

expectIds(
  section("horizontal-navigation", "weighted-strip").objectIds,
  ["17", "17A"],
  "Horizontal Navigation weighted strip",
);
expectIds(
  section("paper-field", "stopped-lenses").objectIds,
  ["13"],
  "Paper Field local lens",
);
expectIds(
  section("paper-field", "elastic-geometry").objectIds,
  ["15", "15A", "16", "16A"],
  "Paper Field elastic geometry",
);
expectIds(
  section("multiscale-focus", "folded-topology").objectIds,
  ["14"],
  "Multi-scale Focus folded topology",
);

const owners = new Map();
for (const model of designModels) {
  for (const candidate of model.sections) {
    for (const objectId of candidate.objectIds) {
      if (!["14", "17", "17A"].includes(objectId)) continue;
      const existing = owners.get(objectId);
      if (existing && existing !== model.id) {
        throw new Error(`${objectId} crosses model families: ${existing}, ${model.id}.`);
      }
      owners.set(objectId, model.id);
    }
  }
}
if (owners.get("14") !== "multiscale-focus") throw new Error("14 must belong to Multi-scale Focus.");
if (owners.get("17") !== "horizontal-navigation") throw new Error("17 must belong to Horizontal Navigation.");
if (owners.get("17A") !== "horizontal-navigation") throw new Error("17A must belong to Horizontal Navigation.");

const horizontalDiagram = modelDiagramPresentations["horizontal-navigation"];
const multiscaleDiagram = modelDiagramPresentations["multiscale-focus"];
if (!horizontalDiagram.sections["weighted-strip"]) {
  throw new Error("Horizontal Navigation diagram must expose the weighted-strip route.");
}
if (!multiscaleDiagram.sections["folded-topology"]) {
  throw new Error("Multi-scale Focus diagram must expose the folded-topology route.");
}
if (section("paper-field", "stopped-lenses").title.includes("停止")) {
  throw new Error("Paper Field section titles must describe mechanisms; disposition is object metadata.");
}

console.log("Model classification: 14 follows Multi-scale Focus; 17/17A follow Horizontal Navigation; Paper Field remains two-dimensional.");
