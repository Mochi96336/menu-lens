import { categoryScrollBehavior, closeProduct, createCompleteMenuModel, createInitialMenuReadingState, createProductDetailModel, isDetailCloseKey, openProduct, setActiveCategory, } from "../customer/menu-reading.js";
const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
};
const visuallyHiddenText = (text) => {
    const span = element("span", "visually-hidden", text);
    return span;
};
export const mountMenuApp = (root, menu) => {
    const model = createCompleteMenuModel(menu);
    let state = createInitialMenuReadingState(menu);
    let openDetailPanel = null;
    let openTrigger = null;
    const categoryButtons = new Map();
    const categorySections = new Map();
    const updateActiveCategory = (categoryId) => {
        state = setActiveCategory(state, categoryId);
        categoryButtons.forEach((button, id) => {
            if (id === categoryId) {
                button.setAttribute("aria-current", "true");
            }
            else {
                button.removeAttribute("aria-current");
            }
        });
    };
    const closeDetail = (restoreFocus) => {
        if (!state.expandedProductId)
            return;
        const result = closeProduct(state);
        state = result.state;
        openDetailPanel?.remove();
        openDetailPanel = null;
        if (openTrigger) {
            openTrigger.setAttribute("aria-expanded", "false");
            if (restoreFocus) {
                openTrigger.focus({ preventScroll: true });
                const bounds = openTrigger.getBoundingClientRect();
                if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
                    openTrigger.scrollIntoView({ block: "nearest" });
                }
            }
        }
        openTrigger = null;
    };
    const createDetailPanel = (productId) => {
        const detail = createProductDetailModel(menu, productId);
        const panel = element("section", "product-detail");
        panel.id = `detail-${productId}`;
        panel.setAttribute("aria-labelledby", `detail-title-${productId}`);
        const headingRow = element("div", "product-detail__heading-row");
        const headingGroup = element("div");
        const eyebrow = element("p", "eyebrow", "商品詳情");
        const heading = element("h3", "product-detail__title", detail.title);
        heading.id = `detail-title-${productId}`;
        headingGroup.append(eyebrow, heading);
        const closeButton = element("button", "detail-close", "關閉");
        closeButton.type = "button";
        closeButton.setAttribute("aria-label", `關閉「${detail.title}」詳情`);
        closeButton.addEventListener("click", () => closeDetail(true));
        headingRow.append(headingGroup, closeButton);
        const statusLine = element("div", "product-detail__status");
        statusLine.append(element("strong", "detail-price", detail.price), element("span", detail.availabilityLabel === "已售完" ? "status status--sold-out" : "status", detail.availabilityLabel));
        const description = element("p", "product-detail__description", detail.description);
        panel.append(headingRow, statusLine, description);
        if (detail.facts.length > 0) {
            const facts = element("dl", "detail-facts");
            detail.facts.forEach((fact) => {
                const item = element("div", "detail-fact");
                const term = element("dt", "detail-fact__label", fact.label);
                const value = element("dd", "detail-fact__value");
                value.append(document.createTextNode(fact.value), element("span", "detail-fact__evidence", fact.evidence));
                item.append(term, value);
                facts.append(item);
            });
            panel.append(facts);
        }
        if (detail.metadataNotice) {
            panel.append(element("p", "detail-note", detail.metadataNotice));
        }
        if (detail.configurationNotice) {
            panel.append(element("p", "detail-note detail-note--configuration", detail.configurationNotice));
        }
        panel.addEventListener("keydown", (event) => {
            if (isDetailCloseKey(event.key)) {
                event.preventDefault();
                closeDetail(true);
            }
        });
        queueMicrotask(() => closeButton.focus({ preventScroll: true }));
        return panel;
    };
    const openDetail = (product, trigger) => {
        if (state.expandedProductId === product.id) {
            closeDetail(true);
            return;
        }
        const anchorTop = trigger.getBoundingClientRect().top;
        closeDetail(false);
        state = openProduct(state, product.id);
        openTrigger = trigger;
        trigger.setAttribute("aria-expanded", "true");
        const row = trigger.closest(".product-row");
        if (!(row instanceof HTMLElement))
            return;
        openDetailPanel = createDetailPanel(product.id);
        row.append(openDetailPanel);
        const shiftedTop = trigger.getBoundingClientRect().top;
        if (Math.abs(shiftedTop - anchorTop) > 1) {
            window.scrollBy({ top: shiftedTop - anchorTop, behavior: "instant" });
        }
    };
    const shell = element("div", "menu-shell");
    const header = element("header", "restaurant-summary");
    const headerInner = element("div", "restaurant-summary__inner");
    const eyebrow = element("p", "eyebrow", "完整菜單 · 所有品項都在這一頁");
    const title = element("h1", "restaurant-title", model.restaurantName);
    const description = element("p", "restaurant-description", model.restaurantDescription);
    const metrics = element("dl", "menu-metrics");
    const metricValues = [
        ["菜單品項", `${model.productCount} 道`],
        ["分類", `${model.categoryCount} 類`],
        ["價格範圍", model.priceRange],
    ];
    metricValues.forEach(([label, value]) => {
        const item = element("div", "menu-metric");
        item.append(element("dt", "menu-metric__label", label), element("dd", "menu-metric__value", value));
        metrics.append(item);
    });
    headerInner.append(eyebrow, title, description, metrics);
    header.append(headerInner);
    const layout = element("div", "menu-layout");
    const directory = element("nav", "category-directory");
    directory.setAttribute("aria-label", "菜單分類導覽");
    directory.append(element("p", "category-directory__label", "分類導覽"), element("p", "category-directory__hint", "移動到同一份完整菜單中的分類，不會隱藏其他品項。"));
    const directoryList = element("div", "category-directory__list");
    const menuDocument = element("div", "complete-menu");
    menuDocument.id = "complete-menu";
    menuDocument.setAttribute("tabindex", "-1");
    const menuHeading = element("div", "complete-menu__heading");
    menuHeading.append(element("p", "eyebrow", "完整菜單"), element("h2", "complete-menu__title", `${model.productCount} 道料理，依固定分類排列`));
    menuDocument.append(menuHeading);
    model.categories.forEach((category) => {
        const categoryButton = element("button", "category-link");
        categoryButton.type = "button";
        categoryButton.setAttribute("aria-controls", `category-${category.id}`);
        categoryButton.append(element("span", "category-link__name", category.name), element("span", "category-link__meta", `${category.productCount} 道 · ${category.priceRange}`));
        categoryButton.addEventListener("click", () => {
            const section = categorySections.get(category.id);
            if (!section)
                return;
            updateActiveCategory(category.id);
            const prefersReducedMotion = typeof window.matchMedia === "function" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const behavior = categoryScrollBehavior(prefersReducedMotion);
            section.focus({ preventScroll: true });
            section.scrollIntoView({ block: "start", behavior });
        });
        categoryButtons.set(category.id, categoryButton);
        directoryList.append(categoryButton);
        const section = element("section", "menu-category");
        section.id = `category-${category.id}`;
        section.setAttribute("tabindex", "-1");
        section.setAttribute("aria-labelledby", `category-title-${category.id}`);
        categorySections.set(category.id, section);
        const categoryHeader = element("div", "menu-category__header");
        const categoryTitleGroup = element("div");
        const categoryTitle = element("h2", "menu-category__title", category.name);
        categoryTitle.id = `category-title-${category.id}`;
        categoryTitleGroup.append(categoryTitle);
        if (category.description) {
            categoryTitleGroup.append(element("p", "menu-category__description", category.description));
        }
        categoryHeader.append(categoryTitleGroup, element("p", "menu-category__summary", `${category.productCount} 道 · ${category.priceRange}`));
        section.append(categoryHeader);
        const productList = element("ul", "product-list");
        category.products.forEach((product) => {
            const item = element("li", product.isSoldOut ? "product-row product-row--sold-out" : "product-row");
            item.dataset.productId = product.id;
            const button = element("button", "product-button");
            button.type = "button";
            button.id = `product-${product.id}`;
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-controls", `detail-${product.id}`);
            const main = element("span", "product-button__main");
            const titleRow = element("span", "product-button__title-row");
            titleRow.append(element("span", "product-button__name", product.name), product.isSoldOut
                ? element("span", "status status--sold-out", product.availabilityLabel)
                : visuallyHiddenText(product.availabilityLabel));
            const descriptionLine = element("span", "product-button__description", product.description);
            const traits = element("span", "product-button__traits");
            product.traits.slice(0, 2).forEach((trait) => traits.append(element("span", "trait", trait)));
            if (product.metadataCompleteness === "partial") {
                traits.append(element("span", "trait trait--muted", "部分資訊"));
            }
            main.append(titleRow, descriptionLine, traits);
            const price = element("span", "product-button__price", product.price);
            price.append(visuallyHiddenText("，開啟詳情"));
            button.append(main, price);
            button.addEventListener("click", () => openDetail(product, button));
            item.append(button);
            productList.append(item);
        });
        section.append(productList);
        menuDocument.append(section);
    });
    directory.append(directoryList);
    layout.append(directory, menuDocument);
    shell.append(header, layout);
    root.replaceChildren(shell);
    updateActiveCategory(state.activeCategoryId ?? model.categories[0]?.id ?? "");
    let categoryScrollFrame = null;
    const syncActiveCategoryToScroll = () => {
        categoryScrollFrame = null;
        const marker = window.innerHeight * 0.28;
        let activeCategoryId = model.categories[0]?.id ?? null;
        categorySections.forEach((section, categoryId) => {
            if (section.getBoundingClientRect().top <= marker)
                activeCategoryId = categoryId;
        });
        const atDocumentEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
        if (atDocumentEnd) {
            activeCategoryId = model.categories.at(-1)?.id ?? activeCategoryId;
        }
        if (activeCategoryId)
            updateActiveCategory(activeCategoryId);
    };
    window.addEventListener("scroll", () => {
        if (categoryScrollFrame !== null)
            return;
        categoryScrollFrame = window.requestAnimationFrame(syncActiveCategoryToScroll);
    }, { passive: true });
    document.addEventListener("keydown", (event) => {
        if (state.expandedProductId && isDetailCloseKey(event.key)) {
            event.preventDefault();
            closeDetail(true);
        }
    });
};
