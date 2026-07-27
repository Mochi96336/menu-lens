import { productRequiresConfiguration, resolveProductSemantics, } from "../domain/menu-validation.js";
import { formatPrice } from "./menu-reading.js";
import { coarseTraitLabels, coarseTraitOrder, mealRoleLabels, portionClassLabels, preparationClassLabels, shareabilityLabels, } from "./menu-semantic-labels.js";
const dimensionOrder = [
    "price", "portion", "meal_role", "preparation", "shareability", "traits", "required_customization",
];
const dimensionLabels = {
    price: "價格",
    portion: "份量",
    meal_role: "餐點角色",
    preparation: "準備節奏",
    shareability: "分享方式",
    traits: "特徵",
    required_customization: "必選規格",
};
export const createEmptyCandidateComparisonState = () => ({
    productIds: [],
});
export const isComparisonSelected = (state, productId) => state.productIds.includes(productId);
const canonicalCandidates = (menu, candidates) => {
    const membership = new Set(candidates.productIds);
    return menu.products.filter((product) => membership.has(product.id));
};
export const sanitizeCandidateComparison = (state, menu, candidates) => {
    const selected = new Set(state.productIds);
    const productIds = canonicalCandidates(menu, candidates)
        .filter((product) => selected.has(product.id))
        .slice(0, 3)
        .map((product) => product.id);
    if (productIds.length === state.productIds.length &&
        productIds.every((productId, index) => productId === state.productIds[index]))
        return state;
    return { productIds };
};
export const toggleCandidateComparison = (state, menu, candidates, productId) => {
    const isCurrentCandidate = canonicalCandidates(menu, candidates).some((product) => product.id === productId);
    if (!isCurrentCandidate)
        return state;
    const clean = sanitizeCandidateComparison(state, menu, candidates);
    if (isComparisonSelected(clean, productId)) {
        return { productIds: clean.productIds.filter((entry) => entry !== productId) };
    }
    if (clean.productIds.length >= 3)
        return clean;
    const selected = new Set([...clean.productIds, productId]);
    return {
        productIds: menu.products
            .filter((product) => selected.has(product.id))
            .map((product) => product.id),
    };
};
const evidenceFor = (value, labelFor) => {
    if (!value) {
        return { valueLabel: null, source: null, confidence: null, status: "missing" };
    }
    return {
        valueLabel: labelFor(value.value),
        source: value.source,
        confidence: value.confidence,
        status: value.confidence === "low" ? "low_confidence" : "known",
    };
};
const semanticEvidence = (menu, product) => {
    const semantics = resolveProductSemantics(menu, product);
    return {
        portion: evidenceFor(semantics.portionClass, (value) => portionClassLabels[value]),
        meal_role: evidenceFor(semantics.mealRole, (value) => mealRoleLabels[value]),
        preparation: evidenceFor(semantics.preparationClass, (value) => preparationClassLabels[value]),
        shareability: evidenceFor(semantics.shareable, (value) => shareabilityLabels[String(value)]),
        traits: evidenceFor(semantics.traits, (values) => coarseTraitOrder.filter((trait) => values.includes(trait)).map((trait) => coarseTraitLabels[trait]).join("、")),
    };
};
const shouldIncludeSemanticDimension = (values) => {
    if (!values.some((value) => value.evidence.valueLabel !== null))
        return false;
    const labels = new Set(values.map((value) => value.evidence.valueLabel));
    return labels.size > 1 || values.some((value) => value.evidence.status !== "known");
};
const semanticDimension = (menu, products, key) => {
    const values = products.map((product) => ({
        product,
        evidence: semanticEvidence(menu, product)[key],
    }));
    return shouldIncludeSemanticDimension(values)
        ? { key, label: dimensionLabels[key], values }
        : null;
};
const priceDimension = (products) => ({
    key: "price",
    label: dimensionLabels.price,
    values: products.map((product) => ({
        product,
        evidence: {
            valueLabel: formatPrice(product.price),
            source: null,
            confidence: null,
            status: "known",
        },
    })),
});
const requiredCustomizationDimension = (menu, products) => {
    const required = products.map((product) => productRequiresConfiguration(menu, product));
    if (new Set(required).size < 2)
        return null;
    return {
        key: "required_customization",
        label: dimensionLabels.required_customization,
        values: products.map((product, index) => ({
            product,
            evidence: {
                valueLabel: required[index] ? "有必選項目" : "無必選項目",
                source: null,
                confidence: null,
                status: "known",
            },
        })),
    };
};
export const createCandidateComparisonModel = (menu, candidates, comparison) => {
    const candidateProducts = canonicalCandidates(menu, candidates);
    const clean = sanitizeCandidateComparison(comparison, menu, candidates);
    const selectedSet = new Set(clean.productIds);
    const selectedProducts = candidateProducts.filter((product) => selectedSet.has(product.id));
    if (selectedProducts.length < 2) {
        const guidance = candidateProducts.length < 2
            ? "至少需要 2 道考慮項目才能比較。"
            : selectedProducts.length === 0
                ? "選擇 2–3 道考慮項目開始比較。"
                : "再選 1 道即可比較。";
        return {
            candidates: candidateProducts,
            selectedProducts,
            dimensions: [],
            guidance,
        };
    }
    const dimensions = dimensionOrder.flatMap((key) => {
        if (key === "price")
            return [priceDimension(selectedProducts)];
        if (key === "required_customization") {
            const dimension = requiredCustomizationDimension(menu, selectedProducts);
            return dimension ? [dimension] : [];
        }
        const dimension = semanticDimension(menu, selectedProducts, key);
        return dimension ? [dimension] : [];
    });
    return {
        candidates: candidateProducts,
        selectedProducts,
        dimensions,
        guidance: dimensions.length === 1 ? "目前資料沒有顯示其他可比較差異。" : null,
    };
};
