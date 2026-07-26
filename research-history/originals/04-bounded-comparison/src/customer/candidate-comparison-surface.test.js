import { createCandidateComparisonModel } from "./candidate-comparison.js";
import { closeCandidateComparison, createInitialMenuAppState, openCandidateComparison, openCandidateWorkspace, showCandidateInMenu, toggleAppCandidate, toggleAppComparison, } from "./menu-app-state.js";
const menu = {
    restaurant: { id: "cmp-surface", name: "比較", description: "", currency: "TWD" },
    categories: [{ id: "c", name: "分類" }],
    modifierGroups: [],
    products: [
        { id: "a", name: "甲", description: "", price: 100, categoryId: "c", availability: "available" },
        { id: "b", name: "乙", description: "", price: 120, categoryId: "c", availability: "available" },
    ],
};
let state = createInitialMenuAppState(menu);
state = toggleAppCandidate(state, menu, "a");
state = toggleAppCandidate(state, menu, "b");
if (openCandidateComparison(state, menu) !== state) {
    throw new Error("CMP1 must not bypass the Candidate workspace surface");
}
if (toggleAppComparison(state, menu, "a") !== state) {
    throw new Error("comparison selection must not change outside the comparison surface");
}
const workspace = openCandidateWorkspace(state, menu);
const comparison = openCandidateComparison(workspace, menu);
if (comparison.surface.kind !== "comparison") {
    throw new Error("CMP1 must open from the Candidate workspace when at least two Candidates exist");
}
if (comparison.reading !== workspace.reading || comparison.candidates !== workspace.candidates) {
    throw new Error("CMP1 opening must preserve reading and Candidate references");
}
if (openCandidateWorkspace(comparison, menu) !== comparison) {
    throw new Error("Candidate workspace opening must not bypass comparison Back");
}
if (showCandidateInMenu(comparison, menu, "a") !== comparison) {
    throw new Error("Candidate locator must not bypass comparison Back");
}
const selected = toggleAppComparison(comparison, menu, "a");
if (selected.comparison.productIds.join(",") !== "a") {
    throw new Error("comparison selection must change on the active comparison surface");
}
const returned = closeCandidateComparison(selected);
if (returned.surface.kind !== "candidates") {
    throw new Error("comparison Back must restore the Candidate workspace surface");
}
const externallyReduced = createCandidateComparisonModel(menu, { productIds: ["a"] }, { productIds: ["a"] });
if (externallyReduced.guidance !== "至少需要 2 道考慮項目才能比較。") {
    throw new Error("CMP1 must prioritize Candidate shortage over one-selection guidance");
}
if (externallyReduced.dimensions.length !== 0) {
    throw new Error("CMP1 must not render comparison evidence with fewer than two Candidates");
}
console.log("✓ CMP1 nested surface and reduced-Candidate contract");
