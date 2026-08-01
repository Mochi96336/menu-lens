import { designModels } from "../../research-history/catalog/presentation-models.mjs";
import {
  modelDiagramKinds,
  modelDiagramMotifs,
  modelDiagramPresentations,
  modelVignetteTypes,
  modelVignetteVariants,
} from "../../research-history/catalog/model-diagram-presentations.mjs";

const modelById = new Map(designModels.map((model) => [model.id, model]));
const allowedModelFields = new Set(["kind", "signature", "statement", "motif", "routeLayout", "edges", "sections"]);
const allowedRouteLayoutFields = new Set(["type", "rootId", "railY", "maxWidth"]);
const allowedSectionFields = new Set(["label", "conceptLabel", "note", "position", "vignette"]);
const allowedPositionFields = new Set(["x", "y"]);
const allowedVignetteFields = new Set(["type", "variant", "activeIndex", "expansion", "falloff"]);
const allowedRouteLayoutTypes = new Set(["compact-sequence", "balanced-rail", "parallel-rail"]);

const requireString = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
};

const requireFiniteRange = (value, label, minimum, maximum) => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be finite and between ${minimum} and ${maximum}.`);
  }
};

const requireIncreasing = (values, minimumGap, label) => {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] - values[index - 1] < minimumGap) {
      throw new Error(`${label} must preserve order with at least ${minimumGap} units of separation.`);
    }
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

  const routeLayout = presentation.routeLayout;
  if (!routeLayout || typeof routeLayout !== "object" || Array.isArray(routeLayout)) {
    throw new Error(`${modelId} requires explicit routeLayout metadata.`);
  }
  for (const field of Object.keys(routeLayout)) {
    if (!allowedRouteLayoutFields.has(field)) {
      throw new Error(`${modelId}.routeLayout has unsupported field ${field}.`);
    }
  }
  if (!allowedRouteLayoutTypes.has(routeLayout.type)) {
    throw new Error(`${modelId}.routeLayout.type ${routeLayout.type} is not implemented.`);
  }
  requireFiniteRange(routeLayout.maxWidth, `${modelId}.routeLayout.maxWidth`, 28, 72);

  const positions = canonicalSectionIds.map((id) => presentation.sections[id]?.position);

  if (routeLayout.type === "compact-sequence") {
    if (presentation.kind !== "sequence") {
      throw new Error(`${modelId} compact-sequence layout requires sequence kind.`);
    }
    if ("rootId" in routeLayout || "railY" in routeLayout) {
      throw new Error(`${modelId} compact-sequence must not declare rootId or railY.`);
    }
  }

  if (routeLayout.type === "balanced-rail") {
    if (!(presentation.kind === "branch" || presentation.kind === "field")) {
      throw new Error(`${modelId} balanced-rail layout requires branch or field kind.`);
    }
    if (!canonicalSectionIds.includes(routeLayout.rootId)) {
      throw new Error(`${modelId}.routeLayout.rootId references unknown section ${routeLayout.rootId}.`);
    }
    if (routeLayout.rootId !== canonicalSectionIds[0]) {
      throw new Error(`${modelId}.routeLayout.rootId must be the first canonical section.`);
    }
    requireFiniteRange(routeLayout.railY, `${modelId}.routeLayout.railY`, 25, 65);

    const sources = new Set(presentation.edges.map(([from]) => from));
    if (sources.size !== 1 || !sources.has(routeLayout.rootId)) {
      throw new Error(`${modelId} balanced-rail edges must share routeLayout.rootId as their source.`);
    }

    const targets = presentation.edges.map(([, to]) => to);
    const expectedTargets = canonicalSectionIds.filter((id) => id !== routeLayout.rootId);
    if (JSON.stringify(targets) !== JSON.stringify(expectedTargets)) {
      throw new Error(`${modelId} balanced-rail must connect its root to every peer in canonical order.`);
    }

    const root = presentation.sections[routeLayout.rootId]?.position;
    const targetPositions = expectedTargets.map((id) => presentation.sections[id]?.position);
    if (!root || root.y >= routeLayout.railY - 8) {
      throw new Error(`${modelId} balanced-rail root must remain above the shared rail.`);
    }
    if (targetPositions.some((position) => !position || position.y <= routeLayout.railY + 8)) {
      throw new Error(`${modelId} balanced-rail peers must remain below the shared rail.`);
    }

    const targetXs = targetPositions.map(({ x }) => x);
    const targetYs = targetPositions.map(({ y }) => y);
    if (Math.max(...targetYs) - Math.min(...targetYs) > 1) {
      throw new Error(`${modelId} balanced-rail peers must share one horizontal axis.`);
    }
    requireIncreasing(targetXs, presentation.kind === "branch" ? 16 : 20, `${modelId} balanced-rail peer x positions`);
    const peerCenter = (targetXs[0] + targetXs[targetXs.length - 1]) / 2;
    if (Math.abs(root.x - peerCenter) > 1) {
      throw new Error(`${modelId} balanced-rail root must remain centered above its peers.`);
    }
  }

  if (routeLayout.type === "parallel-rail") {
    if (presentation.kind !== "parallel") {
      throw new Error(`${modelId} parallel-rail layout requires parallel kind.`);
    }
    if (presentation.edges.length !== 0) {
      throw new Error(`${modelId} parallel-rail must not encode sequential edges.`);
    }
    if ("rootId" in routeLayout) {
      throw new Error(`${modelId} parallel-rail must not declare a rootId.`);
    }
    requireFiniteRange(routeLayout.railY, `${modelId}.routeLayout.railY`, 20, 55);
    if (positions.some((position) => !position || position.y <= routeLayout.railY + 8)) {
      throw new Error(`${modelId} parallel-rail nodes must remain below the shared grouping rail.`);
    }
    const xs = positions.map(({ x }) => x);
    const ys = positions.map(({ y }) => y);
    if (Math.max(...ys) - Math.min(...ys) > 1) {
      throw new Error(`${modelId} parallel-rail nodes must share one horizontal axis.`);
    }
    requireIncreasing(xs, 20, `${modelId} parallel-rail x positions`);
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
