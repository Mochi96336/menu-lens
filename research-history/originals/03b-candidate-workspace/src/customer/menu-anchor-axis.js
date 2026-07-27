import { resolveProductSemantics } from "../domain/menu-validation.js";
const isTrusted = (confidence) => confidence !== "low";
const portionLabels = {
    small: { short: "小份", full: "小份" },
    one_person: { short: "一人", full: "一人份" },
    two_to_three: { short: "2–3 人", full: "約二至三人" },
    large_shared: { short: "多人", full: "多人分享" },
};
const preparationLabels = {
    fast: "快",
    normal: "一般",
    slow: "慢",
};
export const semanticAxisValueFor = (menu, product, axis) => {
    const semantics = resolveProductSemantics(menu, product);
    if (axis === "portion") {
        const value = semantics.portionClass;
        if (!value || !isTrusted(value.confidence)) {
            return {
                axis,
                label: "未提供",
                accessibleLabel: "份量資訊未提供",
                status: "unknown",
            };
        }
        const label = portionLabels[value.value];
        return {
            axis,
            label: label.short,
            accessibleLabel: label.full,
            status: "known",
        };
    }
    const value = semantics.preparationClass;
    if (!value || !isTrusted(value.confidence)) {
        return {
            axis,
            label: "未提供",
            accessibleLabel: "準備資訊未提供",
            status: "unknown",
        };
    }
    const label = preparationLabels[value.value];
    return {
        axis,
        label,
        accessibleLabel: `準備節奏${label}`,
        status: "known",
    };
};
export const availableSemanticAxesFor = (menu, products) => {
    if (products.length < 3)
        return [];
    return ["portion", "preparation"].filter((axis) => {
        const visibleStates = new Set(products.map((product) => {
            const value = semanticAxisValueFor(menu, product, axis);
            return `${value.status}:${value.label}`;
        }));
        return visibleStates.size >= 2;
    });
};
const priceLabelFor = (anchor, target, formatPrice) => {
    const delta = target.price - anchor.price;
    if (delta === 0)
        return "同價";
    return delta < 0
        ? `少 ${formatPrice(Math.abs(delta))}`
        : `多 ${formatPrice(delta)}`;
};
export const anchorAxisRelationFor = (menu, anchor, target, axis, formatPrice) => {
    const semantic = semanticAxisValueFor(menu, target, axis);
    if (anchor.id === target.id) {
        return {
            kind: "anchor",
            priceLabel: "基準",
            semantic,
            label: `基準 · ${semantic.label}`,
            accessibleLabel: `「${target.name}」是比較基準，${semantic.accessibleLabel}`,
        };
    }
    const priceLabel = priceLabelFor(anchor, target, formatPrice);
    return {
        kind: "relative",
        priceLabel,
        semantic,
        label: `${priceLabel} · ${semantic.label}`,
        accessibleLabel: `相較於「${anchor.name}」，${priceLabel}，${semantic.accessibleLabel}`,
    };
};
