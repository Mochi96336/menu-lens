import { createEmptyCandidateComparisonState, sanitizeCandidateComparison, toggleCandidateComparison, } from "./candidate-comparison.js";
import { candidateCount, createEmptyCandidateState, isCandidate, removeCandidate, toggleCandidate, } from "./menu-candidates.js";
import { createInitialMenuReadingState, focusCategory, } from "./menu-reading.js";
export const createInitialMenuAppState = (menu) => ({
    reading: createInitialMenuReadingState(menu),
    candidates: createEmptyCandidateState(),
    comparison: createEmptyCandidateComparisonState(),
    surface: { kind: "menu" },
});
export const updateAppReading = (state, reading) => reading === state.reading
    ? state
    : { ...state, reading };
export const toggleAppCandidate = (state, menu, productId) => {
    const candidates = toggleCandidate(state.candidates, menu, productId);
    if (candidates === state.candidates)
        return state;
    return {
        ...state,
        candidates,
        comparison: sanitizeCandidateComparison(state.comparison, menu, candidates),
    };
};
export const removeAppCandidate = (state, productId) => {
    const candidates = removeCandidate(state.candidates, productId);
    if (candidates === state.candidates)
        return state;
    const productIds = state.comparison.productIds.filter((entry) => entry !== productId);
    return {
        ...state,
        candidates,
        comparison: productIds.length === state.comparison.productIds.length
            ? state.comparison
            : { productIds },
    };
};
export const openCandidateWorkspace = (state, menu) => state.surface.kind !== "menu" || candidateCount(menu, state.candidates) === 0
    ? state
    : { ...state, surface: { kind: "candidates" } };
export const closeCandidateWorkspace = (state) => state.surface.kind !== "candidates"
    ? state
    : { ...state, surface: { kind: "menu" } };
export const openCandidateComparison = (state, menu) => {
    if (state.surface.kind !== "candidates" || candidateCount(menu, state.candidates) < 2)
        return state;
    return {
        ...state,
        comparison: sanitizeCandidateComparison(state.comparison, menu, state.candidates),
        surface: { kind: "comparison" },
    };
};
export const closeCandidateComparison = (state) => state.surface.kind !== "comparison"
    ? state
    : { ...state, surface: { kind: "candidates" } };
export const toggleAppComparison = (state, menu, productId) => {
    if (state.surface.kind !== "comparison")
        return state;
    const comparison = toggleCandidateComparison(state.comparison, menu, state.candidates, productId);
    return comparison === state.comparison ? state : { ...state, comparison };
};
export const showCandidateInMenu = (state, menu, productId) => {
    if (state.surface.kind !== "candidates" || !isCandidate(state.candidates, productId))
        return state;
    const product = menu.products.find((entry) => entry.id === productId);
    if (!product)
        return state;
    return {
        ...state,
        reading: focusCategory(state.reading, menu, product.categoryId),
        surface: { kind: "menu" },
    };
};
