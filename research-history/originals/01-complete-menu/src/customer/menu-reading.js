import { hasCompleteComparisonSemantics, productRequiresConfiguration, resolveProductSemantics, } from "../domain/menu-validation.js";
const moneyFormatter = new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
});
const roleLabels = {
    personal_main: "個人主餐",
    shared_main: "分享主菜",
    side: "小食或配菜",
    staple: "飯麵主食",
    drink: "飲品",
    dessert: "甜點",
};
const portionLabels = {
    small: "小份",
    one_person: "一人份",
    two_to_three: "約 2–3 人分享",
    large_shared: "多人分享份量",
};
const preparationLabels = {
    fast: "出餐較快",
    normal: "一般準備節奏",
    slow: "需要較多準備時間",
};
const traitLabels = {
    light: "清爽",
    rich: "濃郁",
    spicy: "辣味",
    vegetarian: "素食",
};
const sourceLabels = {
    merchant_confirmed: "餐廳確認",
    category_default: "依類別提供",
};
const confidenceLabels = {
    high: "高可信度",
    medium: "一般可信度",
    low: "低可信度",
};
export const formatPrice = (price) => moneyFormatter.format(price);
const formatEvidence = (source, confidence) => `${sourceLabels[source]} · ${confidenceLabels[confidence]}`;
const productTraits = (menu, product) => (resolveProductSemantics(menu, product).traits?.value ?? []).map((trait) => traitLabels[trait]);
const categoryProducts = (menu, categoryId) => menu.products.filter((product) => product.categoryId === categoryId);
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
export const createInitialMenuReadingState = (menu) => ({
    expandedProductId: null,
    activeCategoryId: menu.categories[0]?.id ?? null,
});
export const openProduct = (state, productId) => ({
    ...state,
    expandedProductId: productId,
});
export const closeProduct = (state) => ({
    state: { ...state, expandedProductId: null },
    focusProductId: state.expandedProductId,
});
export const setActiveCategory = (state, categoryId) => ({ ...state, activeCategoryId: categoryId });
export const categoryScrollBehavior = (prefersReducedMotion) => prefersReducedMotion ? "auto" : "smooth";
export const isDetailCloseKey = (key) => key === "Escape";
export const createCompleteMenuModel = (menu) => ({
    restaurantName: menu.restaurant.name,
    restaurantDescription: menu.restaurant.description,
    productCount: menu.products.length,
    categoryCount: menu.categories.length,
    priceRange: priceRange(menu.products),
    categories: menu.categories.map((category) => {
        const products = categoryProducts(menu, category.id);
        return {
            id: category.id,
            name: category.name,
            description: category.description ?? null,
            productCount: products.length,
            priceRange: priceRange(products),
            products: products.map((product) => {
                const semantics = resolveProductSemantics(menu, product);
                return {
                    id: product.id,
                    categoryId: product.categoryId,
                    name: product.name,
                    description: product.description,
                    price: formatPrice(product.price),
                    availabilityLabel: product.availability === "sold_out" ? "已售完" : "供應中",
                    isSoldOut: product.availability === "sold_out",
                    traits: productTraits(menu, product),
                    metadataCompleteness: hasCompleteComparisonSemantics(semantics)
                        ? "complete"
                        : "partial",
                };
            }),
        };
    }),
});
export const createProductDetailModel = (menu, productId) => {
    const product = menu.products.find((entry) => entry.id === productId);
    if (!product)
        throw new Error(`Unknown ProductId: ${productId}`);
    const semantics = resolveProductSemantics(menu, product);
    const facts = [];
    if (semantics.mealRole) {
        facts.push({
            label: "餐點角色",
            value: roleLabels[semantics.mealRole.value],
            evidence: formatEvidence(semantics.mealRole.source, semantics.mealRole.confidence),
        });
    }
    if (semantics.portionClass) {
        facts.push({
            label: "份量",
            value: portionLabels[semantics.portionClass.value],
            evidence: formatEvidence(semantics.portionClass.source, semantics.portionClass.confidence),
        });
    }
    if (semantics.preparationClass) {
        facts.push({
            label: "準備方式",
            value: preparationLabels[semantics.preparationClass.value],
            evidence: formatEvidence(semantics.preparationClass.source, semantics.preparationClass.confidence),
        });
    }
    if (semantics.shareable) {
        facts.push({
            label: "分享方式",
            value: semantics.shareable.value ? "適合分享" : "較適合一人享用",
            evidence: formatEvidence(semantics.shareable.source, semantics.shareable.confidence),
        });
    }
    if (semantics.traits) {
        facts.push({
            label: "風味特徵",
            value: semantics.traits.value.map((trait) => traitLabels[trait]).join("、"),
            evidence: formatEvidence(semantics.traits.source, semantics.traits.confidence),
        });
    }
    const requiredGroups = menu.modifierGroups.filter((group) => group.required && product.modifierGroupIds?.includes(group.id));
    return {
        productId: product.id,
        title: product.name,
        description: product.description,
        price: formatPrice(product.price),
        availabilityLabel: product.availability === "sold_out" ? "已售完" : "供應中",
        facts,
        metadataNotice: hasCompleteComparisonSemantics(semantics)
            ? null
            : "部分份量或料理資訊未提供；未提供的內容不作推測。",
        configurationNotice: productRequiresConfiguration(menu, product)
            ? `正式決定點餐後，需要選擇：${requiredGroups.map((group) => group.name).join("、")}。`
            : null,
    };
};
