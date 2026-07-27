import { hasCompleteComparisonSemantics, resolveProductSemantics, } from "../domain/menu-validation.js";
import { anchorAxisRelationFor, availableSemanticAxesFor, } from "./menu-anchor-axis.js";
import { coarseTraitLabels, mealRoleLabels, portionClassLabels, } from "./menu-semantic-labels.js";
const moneyFormatter = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
});
export const formatPrice = (price) => moneyFormatter.format(price);
const categoryProducts = (menu, categoryId) => menu.products.filter((product) => product.categoryId === categoryId);
export const defaultSemanticAxisFor = (menu, categoryId) => {
    if (!categoryId)
        return null;
    return availableSemanticAxesFor(menu, categoryProducts(menu, categoryId))[0] ?? null;
};
const priceRange = (products) => {
    if (products.length === 0)
        return "—";
    const prices = products.map((product) => product.price);
    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    return minimum === maximum
        ? formatPrice(minimum)
        : `${formatPrice(minimum)}–${formatPrice(maximum)}`;
};
const isTrusted = (confidence) => confidence !== "low";
const metadataCompleteness = (menu, product) => hasCompleteComparisonSemantics(resolveProductSemantics(menu, product)) ? "complete" : "partial";
const roleIsRedundantWithPortion = (role, portion) => (role === "personal_main" && portion === "one_person") ||
    (role === "shared_main" && (portion === "two_to_three" || portion === "large_shared"));
const productCues = (menu, product) => {
    const semantics = resolveProductSemantics(menu, product);
    const trustedPortion = semantics.portionClass && isTrusted(semantics.portionClass.confidence)
        ? semantics.portionClass.value
        : undefined;
    const trustedRole = semantics.mealRole && isTrusted(semantics.mealRole.confidence)
        ? semantics.mealRole.value
        : undefined;
    const trustedTrait = semantics.traits && isTrusted(semantics.traits.confidence)
        ? semantics.traits.value[0]
        : undefined;
    const portionCue = trustedPortion ? portionClassLabels[trustedPortion] : null;
    const roleCue = trustedRole ? mealRoleLabels[trustedRole] : null;
    const traitCue = trustedTrait ? coarseTraitLabels[trustedTrait] : null;
    const primaryCue = portionCue ?? roleCue ?? traitCue;
    if (traitCue && traitCue !== primaryCue)
        return { primaryCue, secondaryCue: traitCue };
    if (roleCue && roleCue !== primaryCue && !roleIsRedundantWithPortion(trustedRole, trustedPortion)) {
        return { primaryCue, secondaryCue: roleCue };
    }
    return { primaryCue, secondaryCue: null };
};
const dominantMealRole = (menu, products) => {
    const availableProducts = products.filter((product) => product.availability === "available");
    const counts = new Map();
    availableProducts.forEach((product) => {
        const mealRole = resolveProductSemantics(menu, product).mealRole;
        if (!mealRole || !isTrusted(mealRole.confidence))
            return;
        counts.set(mealRole.value, (counts.get(mealRole.value) ?? 0) + 1);
    });
    let strongestRole = null;
    let strongestCount = 0;
    for (const [role, count] of counts) {
        if (count > strongestCount) {
            strongestRole = role;
            strongestCount = count;
        }
    }
    if (!strongestRole || availableProducts.length === 0)
        return null;
    return strongestCount >= Math.ceil(availableProducts.length / 2) ? strongestRole : null;
};
const categoryStructuralSummary = (menu, category, products) => {
    const role = dominantMealRole(menu, products);
    if (role)
        return `以${mealRoleLabels[role]}為主`;
    if (category.description)
        return category.description;
    return `${products.filter((product) => product.availability === "available").length} 道目前供應`;
};
const createProductNodeModel = (menu, product) => ({
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    price: formatPrice(product.price),
    availabilityLabel: product.availability === "sold_out" ? "已售完" : "供應中",
    isSoldOut: product.availability === "sold_out",
    ...productCues(menu, product),
    metadataCompleteness: metadataCompleteness(menu, product),
});
const createAnchorAxisRelations = (menu, products, axes) => Object.fromEntries(products.map((anchor) => [
    anchor.id,
    Object.fromEntries(axes.map((axis) => [
        axis,
        Object.fromEntries(products.map((target) => [
            target.id,
            anchorAxisRelationFor(menu, anchor, target, axis, formatPrice),
        ])),
    ])),
]));
const idleAnchor = () => ({ kind: "idle" });
export const createInitialMenuReadingState = (menu) => {
    const activeCategoryId = menu.categories[0]?.id ?? null;
    return {
        activeCategoryId,
        expansion: { kind: "overview" },
        anchorReading: idleAnchor(),
        semanticAxis: defaultSemanticAxisFor(menu, activeCategoryId),
    };
};
export const focusCategory = (state, menu, categoryId) => {
    const eligibleAxes = availableSemanticAxesFor(menu, categoryProducts(menu, categoryId));
    const semanticAxis = state.activeCategoryId === categoryId &&
        state.semanticAxis !== null &&
        eligibleAxes.includes(state.semanticAxis)
        ? state.semanticAxis
        : eligibleAxes[0] ?? null;
    return {
        ...state,
        activeCategoryId: categoryId,
        expansion: { kind: "category", categoryId },
        anchorReading: idleAnchor(),
        semanticAxis,
    };
};
export const showMenuOverview = (state) => ({
    ...state,
    expansion: { kind: "overview" },
    anchorReading: idleAnchor(),
});
export const showAllCategories = (state) => ({
    ...state,
    expansion: { kind: "all" },
    anchorReading: idleAnchor(),
});
export const setActiveCategory = (state, menu, categoryId) => {
    if (state.activeCategoryId === categoryId)
        return state;
    return {
        ...state,
        activeCategoryId: categoryId,
        anchorReading: idleAnchor(),
        semanticAxis: defaultSemanticAxisFor(menu, categoryId),
    };
};
export const beginAnchorSelection = (state) => state.expansion.kind === "category" && state.semanticAxis !== null
    ? { ...state, anchorReading: { kind: "selecting" } }
    : { ...state, anchorReading: idleAnchor() };
export const cancelAnchorSelection = (state) => state.anchorReading.kind === "selecting"
    ? { ...state, anchorReading: idleAnchor() }
    : state;
export const selectAnchor = (state, menu, productId) => {
    if (state.expansion.kind !== "category" ||
        state.anchorReading.kind !== "selecting" ||
        state.semanticAxis === null)
        return state;
    const product = menu.products.find((entry) => entry.id === productId);
    if (!product || product.categoryId !== state.expansion.categoryId)
        return state;
    return { ...state, anchorReading: { kind: "active", productId } };
};
export const setSemanticAxis = (state, menu, semanticAxis) => {
    if (state.expansion.kind !== "category" || state.anchorReading.kind !== "active")
        return state;
    const eligibleAxes = availableSemanticAxesFor(menu, categoryProducts(menu, state.expansion.categoryId));
    if (!eligibleAxes.includes(semanticAxis) || state.semanticAxis === semanticAxis)
        return state;
    return { ...state, semanticAxis };
};
export const clearAnchor = (state) => state.anchorReading.kind === "idle"
    ? state
    : { ...state, anchorReading: idleAnchor() };
export const isAnchorSelectionCancelKey = (key) => key === "Escape";
export const categoryIsExpanded = (state, categoryId) => state.expansion.kind === "all" ||
    (state.expansion.kind === "category" && state.expansion.categoryId === categoryId);
export const categoryScrollBehavior = (prefersReducedMotion) => prefersReducedMotion ? "auto" : "smooth";
export const createCompleteMenuModel = (menu) => {
    const productCounts = menu.categories.map((category) => categoryProducts(menu, category.id).length);
    const maximumProductCount = Math.max(0, ...productCounts);
    const categories = menu.categories.map((category) => {
        const products = categoryProducts(menu, category.id);
        const productModels = products.map((product) => createProductNodeModel(menu, product));
        const availableCount = products.filter((product) => product.availability === "available").length;
        const semanticAxes = availableSemanticAxesFor(menu, products);
        return {
            id: category.id,
            name: category.name,
            productCount: products.length,
            availableCount,
            soldOutCount: products.length - availableCount,
            partialMetadataCount: products.filter((product) => metadataCompleteness(menu, product) === "partial").length,
            priceRange: priceRange(products),
            structuralSummary: categoryStructuralSummary(menu, category, products),
            relativeCount: maximumProductCount > 0 ? products.length / maximumProductCount : 0,
            previewProductNames: productModels
                .filter((product) => !product.isSoldOut)
                .slice(0, 2)
                .map((product) => product.name),
            products: productModels,
            semanticAxes,
            anchorAxisRelations: createAnchorAxisRelations(menu, products, semanticAxes),
        };
    });
    return {
        restaurantName: menu.restaurant.name,
        restaurantDescription: menu.restaurant.description,
        productCount: menu.products.length,
        categoryCount: menu.categories.length,
        priceRange: priceRange(menu.products),
        categories,
    };
};
