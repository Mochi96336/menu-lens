import { readFile } from "node:fs/promises";
import { modelRouteContracts } from "../../research-history/catalog/model-route-contracts.mjs";
import {
  conceptRouteCases,
  modelRouteBrowserCases,
  routeGeometryCases,
} from "./model-route-browser-cases.mjs";
import { root } from "./load-catalog.mjs";

const canonicalModelIds = modelRouteContracts.map((contract) => contract.id);

for (const contract of modelRouteContracts) {
  const canonicalSectionIds = contract.model.sections.map((section) => section.id);
  const contractSectionIds = contract.sections.map((section) => section.id);
  const diagramSectionIds = Object.keys(contract.diagram.sections);
  if (JSON.stringify(contractSectionIds) !== JSON.stringify(canonicalSectionIds)
    || JSON.stringify(diagramSectionIds) !== JSON.stringify(canonicalSectionIds)) {
    throw new Error(`${contract.id} route sections diverge from canonical model sections.`);
  }

  for (const section of contract.sections) {
    if (section.modelSection !== contract.model.sections.find((candidate) => candidate.id === section.id)) {
      throw new Error(`${contract.id}/${section.id} must retain the canonical section object.`);
    }
    if (section.objectIds !== section.modelSection.objectIds) {
      throw new Error(`${contract.id}/${section.id} must reuse canonical objectIds by reference.`);
    }
    if (section.defaultObjectId !== section.modelSection.defaultObjectId) {
      throw new Error(`${contract.id}/${section.id} default object diverges from canonical membership.`);
    }
    if (section.diagram !== contract.diagram.sections[section.id]) {
      throw new Error(`${contract.id}/${section.id} must reuse its route presentation object.`);
    }
    if ("objectIds" in section.diagram || "defaultObjectId" in section.diagram) {
      throw new Error(`${contract.id}/${section.id} diagram metadata must not duplicate membership.`);
    }
  }
}

const verifyCoverage = (cases, label) => {
  const ids = cases.map((testCase) => testCase.model);
  if (JSON.stringify(ids) !== JSON.stringify(canonicalModelIds)) {
    throw new Error(`${label} must cover canonical models in order: ${canonicalModelIds.join(", ")}.`);
  }
  for (const testCase of cases) {
    const contract = modelRouteContracts.find((candidate) => candidate.id === testCase.model);
    if (!contract?.sectionById[testCase.section]) {
      throw new Error(`${label} references unknown route ${testCase.model}/${testCase.section}.`);
    }
  }
};

verifyCoverage(modelRouteBrowserCases, "Model route browser cases");
verifyCoverage(routeGeometryCases, "Route geometry cases");
verifyCoverage(conceptRouteCases, "Concept-route cases");

for (const testCase of modelRouteBrowserCases) {
  const contract = modelRouteContracts.find((candidate) => candidate.id === testCase.model);
  const section = contract.sectionById[testCase.section];
  if (testCase.title !== contract.title
    || testCase.kind !== contract.diagram.kind
    || testCase.nodeCount !== contract.sections.length
    || testCase.objectIds !== section.objectIds) {
    throw new Error(`${testCase.model} browser expectations must be derived from the route contract.`);
  }
}

const modelPage = await readFile(new URL("research-history/model-page.mjs", root), "utf8");
const routeBrowser = await readFile(new URL("scripts/archive/validate-model-route-browser.mjs", root), "utf8");
const geometryBrowser = await readFile(new URL("scripts/archive/validate-route-geometry-browser.mjs", root), "utf8");
const breakpointBrowser = await readFile(new URL("scripts/archive/validate-concept-route-breakpoints-browser.mjs", root), "utf8");

if (!modelPage.includes('modelRouteContractById') || modelPage.includes('modelDiagramPresentations')) {
  throw new Error("Model renderer must resolve diagram presentation through model route contracts.");
}
for (const [label, source, importName, forbidden] of [
  ["Model route browser", routeBrowser, "modelRouteBrowserCases", "const modelCases = Object.freeze(["],
  ["Route geometry browser", geometryBrowser, "routeGeometryCases", "const cases = Object.freeze(["],
  ["Concept-route browser", breakpointBrowser, "conceptRouteCases", "const cases = Object.freeze(["],
]) {
  if (!source.includes(importName)) throw new Error(`${label} must import shared route cases.`);
  if (source.includes(forbidden)) throw new Error(`${label} must not duplicate the model case table.`);
}

console.log(`Model route contracts: ${modelRouteContracts.length} canonical models drive renderer and browser coverage.`);
