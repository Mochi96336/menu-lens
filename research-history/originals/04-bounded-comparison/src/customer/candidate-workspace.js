export const createCandidateWorkspaceModel = (menu, state) => {
    const membership = new Set(state.productIds);
    const groups = menu.categories.map((category) => {
        const products = menu.products.filter((product) => product.categoryId === category.id && membership.has(product.id));
        return { category, products };
    }).filter((group) => group.products.length > 0);
    return {
        groups,
        count: groups.reduce((total, group) => total + group.products.length, 0),
    };
};
