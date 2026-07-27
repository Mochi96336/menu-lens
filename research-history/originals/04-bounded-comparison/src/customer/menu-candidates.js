export const createEmptyCandidateState = () => ({ productIds: [] });
export const isCandidate = (state, productId) => state.productIds.includes(productId);
export const candidateCount = (menu, state) => {
    const membership = new Set(state.productIds);
    return menu.products.filter((product) => membership.has(product.id)).length;
};
const availableProductExists = (menu, productId) => menu.products.some((product) => product.id === productId && product.availability === "available");
export const addCandidate = (state, menu, productId) => {
    if (isCandidate(state, productId) || !availableProductExists(menu, productId))
        return state;
    return { productIds: [...state.productIds, productId] };
};
export const removeCandidate = (state, productId) => {
    if (!isCandidate(state, productId))
        return state;
    return { productIds: state.productIds.filter((entry) => entry !== productId) };
};
export const toggleCandidate = (state, menu, productId) => isCandidate(state, productId)
    ? removeCandidate(state, productId)
    : addCandidate(state, menu, productId);
