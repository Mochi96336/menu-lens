import { readFileSync } from "node:fs";

const normalized = (path) => readFileSync(new URL(path, import.meta.url), "utf8")
  .replace(/\s+/g, " ")
  .trim();

const appSource = normalized("../src/app/App.ts");
const workspaceSource = normalized("../src/app/candidate-workspace.ts");
const comparisonSource = normalized("../src/app/candidate-comparison.ts");
const comparisonDomainSource = normalized("../src/customer/candidate-comparison.ts");
const comparisonCss = normalized("../src/styles/candidate-comparison.css");
const indexSource = normalized("../index.html");

const assertIncludes = (source, fragment, message) => {
  if (!source.includes(fragment.replace(/\s+/g, " ").trim())) throw new Error(message);
};

if (indexSource.includes('<main id="app">')) {
  throw new Error("the mount root must not create a main landmark around the active surface main");
}

assertIncludes(indexSource, '<div id="app"></div>', "the application mount root must remain a neutral container");
assertIncludes(workspaceSource, '"比較考慮項目"', "Candidate workspace must expose one bounded comparison entry");
assertIncludes(workspaceSource, "focusComparisonEntry:", "comparison Back needs a stable workspace focus target");
assertIncludes(comparisonSource, 'const root = element("main", "candidate-comparison");', "CMP1 must be a sibling document main");
assertIncludes(comparisonSource, '"回到考慮項目"', "comparison must expose explicit Candidate-workspace Back");
assertIncludes(comparisonSource, 'element("button", "candidate-comparison__selector-action", "比較")', "selectors need stable visible labels");
assertIncludes(comparisonSource, 'button.setAttribute("aria-pressed", String(selected));', "selectors must express selection through aria-pressed");
assertIncludes(comparisonSource, "const selectorButtons = new Map<ProductId, HTMLButtonElement>();", "selector DOM nodes must persist across selection updates");
assertIncludes(comparisonSource, 'status.setAttribute("aria-live", "polite");', "CMP1 needs one bounded selection live region");
assertIncludes(comparisonSource, 'className = "candidate-comparison__dimension"', "comparison must use vertical dimension blocks");
assertIncludes(comparisonSource, "resetStatus(renderedCandidates, renderedComparison);", "transient selection-limit status must reset while comparison is hidden");
assertIncludes(comparisonDomainSource, 'const dimensionOrder: ReadonlyArray<ComparisonDimensionKey> = [', "dimension order must be fixed and explicit");
assertIncludes(comparisonDomainSource, '"price", "portion", "meal_role", "preparation", "shareability", "traits", "required_customization"', "CMP1 dimensions must remain bounded");
assertIncludes(appSource, 'candidateComparison.element.hidden = state.surface.kind !== "comparison";', "exactly one of three main surfaces must be active");
assertIncludes(appSource, 'candidateComparison.element.setAttribute("inert", "");', "hidden comparison surface must be inert");
assertIncludes(appSource, "const returnContext = comparisonReturnContext;", "comparison Back must read its own browser return context");
assertIncludes(appSource, 'window.scrollTo({ top: returnContext.scrollY, behavior: "instant" });', "comparison Back must restore workspace scroll instantly");
assertIncludes(appSource, "workspace.append(overview.element, candidateWorkspace.element, candidateComparison.element);", "all three sibling surfaces must remain mounted");
assertIncludes(comparisonCss, ".candidate-comparison__dimension-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(6.8rem, 42%);", "mobile dimension rows need bounded readable columns");
assertIncludes(comparisonCss, ".candidate-comparison__selector-action { inline-size: 3.5rem; block-size: 1.7rem;", "pressed and unpressed selectors must share fixed dimensions");
assertIncludes(indexSource, "./src/styles/candidate-comparison.css", "static page must load CMP1 styles");

[
  "dialog",
  "showModal",
  "comparison-matrix",
  "overflow-x: auto",
  "position: fixed",
  "carousel",
  "決定點這道",
  "加入訂單",
  "quantity",
  "checkout",
  "winner",
  "best-value",
  "recommendation",
].forEach((forbidden) => {
  if (comparisonSource.includes(forbidden) || comparisonDomainSource.includes(forbidden) || comparisonCss.includes(forbidden)) {
    throw new Error(`CMP1 must not contain ${forbidden}`);
  }
});

console.log("✓ CMP1 structure, accessibility, continuity, and mobile grammar contract");
