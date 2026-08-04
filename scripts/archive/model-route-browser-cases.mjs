import {
  getModelRouteContract,
  getModelRouteSectionContract,
} from "../../research-history/catalog/model-route-contracts.mjs";

const representativeSpecs = Object.freeze([
  {
    model: "complete-document",
    section: "baseline",
    variant: "01",
    vignetteType: "document",
    vignetteVariant: "baseline",
    mobileSection: "ledger-density",
    desktopMaxWidth: 620,
  },
  {
    model: "horizontal-navigation",
    section: "spread",
    variant: "08",
    vignetteType: "horizontal",
    vignetteVariant: "spread",
    mobileSection: "weighted-strip",
    desktopMaxWidth: 1160,
  },
  {
    model: "paper-field",
    section: "semantic-information",
    variant: "12A",
    vignetteType: "paper-field",
    vignetteVariant: "semantic",
    mobileSection: "elastic-geometry",
    desktopMaxWidth: 720,
  },
  {
    model: "landscape-paper",
    section: "core",
    variant: "18",
    vignetteType: "landscape",
    vignetteVariant: "core",
    mobileSection: "stopped-routes",
    desktopMaxWidth: 1100,
  },
  {
    model: "multiscale-focus",
    section: "model",
    variant: "06",
    vignetteType: "scale",
    vignetteVariant: "focus",
    mobileSection: "folded-topology",
    desktopMaxWidth: 720,
  },
  {
    model: "depth-projection",
    section: "projection-lens",
    variant: "25P",
    vignetteType: "depth",
    vignetteVariant: "projection",
    mobileSection: "parallax-volume",
    desktopMaxWidth: 780,
  },
]);

const enrichRepresentative = (spec) => {
  const contract = getModelRouteContract(spec.model);
  const section = getModelRouteSectionContract(spec.model, spec.section);
  if (!section.objectIds.includes(spec.variant)) {
    throw new Error(`${spec.model}/${spec.section} representative ${spec.variant} is not a canonical section object.`);
  }
  if (!contract.sectionById[spec.mobileSection]) {
    throw new Error(`${spec.model} mobile representative section ${spec.mobileSection} is not canonical.`);
  }
  return Object.freeze({
    ...spec,
    title: contract.title,
    kind: contract.diagram.kind,
    nodeCount: contract.sections.length,
    objectIds: section.objectIds,
  });
};

export const modelRouteBrowserCases = Object.freeze(representativeSpecs.map(enrichRepresentative));

export const routeGeometryCases = Object.freeze(modelRouteBrowserCases.map((testCase) => {
  const contract = getModelRouteContract(testCase.model);
  const layout = contract.diagram.routeLayout.type;
  const routeCount = layout === "parallel-rail"
    ? contract.sections.length
    : contract.diagram.edges.length;
  return Object.freeze({
    model: testCase.model,
    section: testCase.section,
    mobileSection: testCase.mobileSection,
    layout,
    desktopMaxWidth: testCase.desktopMaxWidth,
    ...(layout === "compact-sequence"
      ? { directLines: routeCount }
      : { drops: routeCount }),
  });
}));

export const conceptRouteCases = Object.freeze(modelRouteBrowserCases.map(({ model, section }) => Object.freeze({
  model,
  section,
})));
