import { resolveProductSemantics } from "../domain/menu-validation.js";
const isTrusted = (confidence) => confidence !== "low";
const trustedPortion = (menu, product) => {
    const value = resolveProductSemantics(menu, product).portionClass;
    return value && isTrusted(value.confidence) ? value.value : null;
};
const trustedPreparation = (menu, product) => {
    const value = resolveProductSemantics(menu, product).preparationClass;
    return value && isTrusted(value.confidence) ? value.value : null;
};
const portionRank = {
    small: 0,
    one_person: 1,
    two_to_three: 2,
    large_shared: 3,
};
const preparationRank = {
    fast: 0,
    normal: 1,
    slow: 2,
};
export const priceRelationToken = (anchor, target, formatPrice) => {
    const delta = target.price - anchor.price;
    const label = delta === 0
        ? "同價"
        : delta < 0
            ? `少 ${formatPrice(Math.abs(delta))}`
            : `多 ${formatPrice(delta)}`;
    return {
        kind: "price",
        label,
        status: "known",
        accessibleLabel: label,
    };
};
export const portionRelationToken = (menu, anchor, target) => {
    const anchorValue = trustedPortion(menu, anchor);
    const targetValue = trustedPortion(menu, target);
    if (!anchorValue || !targetValue) {
        return {
            kind: "portion",
            label: "份量未知",
            status: "unknown",
            accessibleLabel: "份量資訊無法比較，因為其中一項缺少可信資料",
        };
    }
    const difference = portionRank[targetValue] - portionRank[anchorValue];
    const label = difference === 0 ? "同份量" : difference < 0 ? "份量較小" : "份量較大";
    return {
        kind: "portion",
        label,
        status: "known",
        accessibleLabel: label,
    };
};
export const preparationRelationToken = (menu, anchor, target) => {
    const anchorValue = trustedPreparation(menu, anchor);
    const targetValue = trustedPreparation(menu, target);
    if (!anchorValue || !targetValue) {
        return {
            kind: "preparation",
            label: "節奏未知",
            status: "unknown",
            accessibleLabel: "準備節奏無法比較，因為其中一項缺少可信資料",
        };
    }
    const difference = preparationRank[targetValue] - preparationRank[anchorValue];
    const label = difference === 0 ? "同節奏" : difference < 0 ? "較快" : "較久";
    return {
        kind: "preparation",
        label,
        status: "known",
        accessibleLabel: label,
    };
};
const portionDistance = (menu, anchor, target) => {
    const anchorValue = trustedPortion(menu, anchor);
    const targetValue = trustedPortion(menu, target);
    return anchorValue && targetValue
        ? Math.abs(portionRank[targetValue] - portionRank[anchorValue])
        : null;
};
const preparationDistance = (menu, anchor, target) => {
    const anchorValue = trustedPreparation(menu, anchor);
    const targetValue = trustedPreparation(menu, target);
    return anchorValue && targetValue
        ? Math.abs(preparationRank[targetValue] - preparationRank[anchorValue])
        : null;
};
const semanticTokenFor = (menu, anchor, target) => {
    const portion = portionRelationToken(menu, anchor, target);
    const preparation = preparationRelationToken(menu, anchor, target);
    const portionDelta = portionDistance(menu, anchor, target);
    const preparationDelta = preparationDistance(menu, anchor, target);
    if (portionDelta === null)
        return portion;
    if (portionDelta === 0 && preparationDelta === null)
        return preparation;
    if (portionDelta === 0 && (preparationDelta ?? 0) === 0)
        return null;
    if (preparationDelta !== null && preparationDelta > portionDelta)
        return preparation;
    return portion;
};
export const anchorRelationFor = (menu, anchor, target, formatPrice) => {
    if (anchor.id === target.id) {
        return {
            kind: "anchor",
            label: "比較基準",
            accessibleLabel: `「${target.name}」是目前的比較基準`,
        };
    }
    const price = priceRelationToken(anchor, target, formatPrice);
    const semantic = semanticTokenFor(menu, anchor, target);
    const tokens = semantic ? [price, semantic] : [price];
    return {
        kind: "relative",
        label: tokens.map((token) => token.label).join(" · "),
        accessibleLabel: `相較於「${anchor.name}」，${tokens.map((token) => token.accessibleLabel).join("，")}`,
        tokens,
    };
};
