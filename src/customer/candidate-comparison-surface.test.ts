import type { Menu } from "../domain/menu-types.js";
import { createCandidateComparisonModel } from "./candidate-comparison.js";
import {
  createInitialMenuAppState,
  openCandidateComparison,
  openCandidateWorkspace,
  toggleAppCandidate,
} from "./menu-app-state.js";

const menu: Menu = {
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
const workspace = openCandidateWorkspace(state, menu);
const comparison = openCandidateComparison(workspace, menu);
if (comparison.surface.kind !== "comparison") {
  throw new Error("CMP1 must open from the Candidate workspace when at least two Candidates exist");
}
if (comparison.reading !== workspace.reading || comparison.candidates !== workspace.candidates) {
  throw new Error("CMP1 opening must preserve reading and Candidate references");
}

const externallyReduced = createCandidateComparisonModel(
  menu,
  { productIds: ["a"] },
  { productIds: ["a"] },
);
if (externallyReduced.guidance !== "至少需要 2 道考慮項目才能比較。") {
  throw new Error("CMP1 must prioritize Candidate shortage over one-selection guidance");
}
if (externallyReduced.dimensions.length !== 0) {
  throw new Error("CMP1 must not render comparison evidence with fewer than two Candidates");
}

console.log("✓ CMP1 surface origin and reduced-Candidate contract");
