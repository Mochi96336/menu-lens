import { candidateCount, createEmptyCandidateState, isCandidate, removeCandidate, toggleCandidate, } from "./menu-candidates.js";
import { createInitialMenuReadingState, focusCategory, } from "./menu-reading.js";
export const createInitialMenuAppState = (menu) => ({
    reading: createInitialMenuReadingState(menu),
    candidates: createEmptyCandidateState(),
    surface: { kind: "menu" },
});
export const updateAppReading = (state, reading) => reading === state.reading
    ? state
    : { ...state, reading };
export const toggleAppCandidate = (state, menu, productId) => {
    const candidates = toggleCandidate(state.candidates, menu, productId);
    return candidates === state.candidates
        ? state
        : { ...state, candidates };
};
export const removeAppCandidate = (state, productId) => {
    const candidates = removeCandidate(state.candidates, productId);
    return candidates === state.candidates
        ? state
        : { ...state, candidates };
};
export const openCandidateWorkspace = (state, menu) => state.surface.kind === "candidates" || candidateCount(menu, state.candidates) === 0
    ? state
    : { ...state, surface: { kind: "candidates" } };
export const closeCandidateWorkspace = (state) => state.surface.kind === "menu"
    ? state
    : { ...state, surface: { kind: "menu" } };
export const showCandidateInMenu = (state, menu, productId) => {
    if (!isCandidate(state.candidates, productId))
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
