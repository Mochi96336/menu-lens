import type { Menu, ProductId } from "../domain/menu-types.js";
import {
  createEmptyCandidateComparisonState,
  sanitizeCandidateComparison,
  toggleCandidateComparison,
  type CandidateComparisonState,
} from "./candidate-comparison.js";
import {
  candidateCount,
  createEmptyCandidateState,
  isCandidate,
  removeCandidate,
  toggleCandidate,
  type CandidateState,
} from "./menu-candidates.js";
import {
  createInitialMenuReadingState,
  focusCategory,
  type MenuReadingState,
} from "./menu-reading.js";

export type MenuSurface =
  | Readonly<{ kind: "menu" }>
  | Readonly<{ kind: "candidates" }>
  | Readonly<{ kind: "comparison" }>;

export type MenuAppState = Readonly<{
  reading: MenuReadingState;
  candidates: CandidateState;
  comparison: CandidateComparisonState;
  surface: MenuSurface;
}>;

export const createInitialMenuAppState = (menu: Menu): MenuAppState => ({
  reading: createInitialMenuReadingState(menu),
  candidates: createEmptyCandidateState(),
  comparison: createEmptyCandidateComparisonState(),
  surface: { kind: "menu" },
});

export const updateAppReading = (
  state: MenuAppState,
  reading: MenuReadingState,
): MenuAppState =>
  reading === state.reading
    ? state
    : { ...state, reading };

export const toggleAppCandidate = (
  state: MenuAppState,
  menu: Menu,
  productId: ProductId,
): MenuAppState => {
  const candidates = toggleCandidate(state.candidates, menu, productId);
  if (candidates === state.candidates) return state;
  const comparison = sanitizeCandidateComparison(state.comparison, menu, candidates);
  return { ...state, candidates, comparison };
};

export const removeAppCandidate = (
  state: MenuAppState,
  productId: ProductId,
): MenuAppState => {
  const candidates = removeCandidate(state.candidates, productId);
  if (candidates === state.candidates) return state;
  return {
    ...state,
    candidates,
    comparison: sanitizeCandidateComparison(state.comparison, menuForStateSanitize(state, candidates), candidates),
  };
};

const menuForStateSanitize = (state: MenuAppState, candidates: CandidateState): Menu => {
  void state;
  void candidates;
  throw new Error("removeAppCandidate requires menu for comparison sanitation");
};

export const removeAppCandidateFromMenu = (
  state: MenuAppState,
  menu: Menu,
  productId: ProductId,
): MenuAppState => {
  const candidates = removeCandidate(state.candidates, productId);
  if (candidates === state.candidates) return state;
  return {
    ...state,
    candidates,
    comparison: sanitizeCandidateComparison(state.comparison, menu, candidates),
  };
};

export const openCandidateWorkspace = (
  state: MenuAppState,
  menu: Menu,
): MenuAppState =>
  state.surface.kind === "candidates" || candidateCount(menu, state.candidates) === 0
    ? state
    : { ...state, surface: { kind: "candidates" } };

export const closeCandidateWorkspace = (state: MenuAppState): MenuAppState =>
  state.surface.kind !== "candidates"
    ? state
    : { ...state, surface: { kind: "menu" } };

export const openCandidateComparison = (
  state: MenuAppState,
  menu: Menu,
): MenuAppState => {
  if (state.surface.kind !== "candidates" || candidateCount(menu, state.candidates) < 2) return state;
  const comparison = sanitizeCandidateComparison(state.comparison, menu, state.candidates);
  return {
    ...state,
    comparison,
    surface: { kind: "comparison" },
  };
};

export const closeCandidateComparison = (state: MenuAppState): MenuAppState =>
  state.surface.kind !== "comparison"
    ? state
    : { ...state, surface: { kind: "candidates" } };

export const toggleAppComparison = (
  state: MenuAppState,
  menu: Menu,
  productId: ProductId,
): MenuAppState => {
  const comparison = toggleCandidateComparison(
    state.comparison,
    menu,
    state.candidates,
    productId,
  );
  return comparison === state.comparison ? state : { ...state, comparison };
};

export const showCandidateInMenu = (
  state: MenuAppState,
  menu: Menu,
  productId: ProductId,
): MenuAppState => {
  if (!isCandidate(state.candidates, productId)) return state;
  const product = menu.products.find((entry) => entry.id === productId);
  if (!product) return state;
  return {
    ...state,
    reading: focusCategory(state.reading, menu, product.categoryId),
    surface: { kind: "menu" },
  };
};
