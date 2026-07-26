import { createEmptyCandidateState, toggleCandidate, } from "./menu-candidates.js";
import { createInitialMenuReadingState, } from "./menu-reading.js";
export const createInitialMenuAppState = (menu) => ({
    reading: createInitialMenuReadingState(menu),
    candidates: createEmptyCandidateState(),
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
