import { createInitialMenuAppState, toggleAppCandidate, updateAppReading, } from "../customer/menu-app-state.js";
import { candidateCount } from "../customer/menu-candidates.js";
import { beginAnchorSelection, cancelAnchorSelection, categoryScrollBehavior, clearAnchor, createCompleteMenuModel, focusCategory, isAnchorSelectionCancelKey, selectAnchor, setActiveCategory, setSemanticAxis, showAllCategories, showMenuOverview, } from "../customer/menu-reading.js";
import { createMenuOverview } from "./menu-overview.js";
const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
};
const reducedMotion = () => typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const mountMenuApp = (root, menu) => {
    const model = createCompleteMenuModel(menu);
    let state = createInitialMenuAppState(menu);
    let overview;
    const render = () => overview.render(state.reading, state.candidates, candidateCount(menu, state.candidates));
    const focusedProductId = () => {
        const focused = document.activeElement;
        if (!(focused instanceof Element))
            return null;
        return focused.closest("[data-product-id]")?.dataset.productId ?? null;
    };
    const selectCategory = (categoryId) => {
        const reading = state.reading;
        const isSameFocusedCategory = reading.expansion.kind === "category" && reading.expansion.categoryId === categoryId;
        state = updateAppReading(state, isSameFocusedCategory
            ? showMenuOverview(reading)
            : focusCategory(reading, menu, categoryId));
        render();
    };
    const beginAnchor = () => {
        state = updateAppReading(state, beginAnchorSelection(state.reading));
        render();
    };
    const cancelAnchor = (returnFocusProductId = null) => {
        const categoryId = state.reading.expansion.kind === "category"
            ? state.reading.expansion.categoryId
            : null;
        state = updateAppReading(state, cancelAnchorSelection(state.reading));
        render();
        if (!categoryId)
            return;
        if (returnFocusProductId)
            overview.focusProductRelation(categoryId, returnFocusProductId);
        else
            overview.focusAnchorControl(categoryId);
    };
    const chooseAnchor = (productId) => {
        const categoryId = state.reading.expansion.kind === "category"
            ? state.reading.expansion.categoryId
            : null;
        state = updateAppReading(state, selectAnchor(state.reading, menu, productId));
        render();
        if (categoryId && state.reading.anchorReading.kind === "active") {
            overview.focusProductRelation(categoryId, productId);
        }
    };
    const clearCurrentAnchor = () => {
        const categoryId = state.reading.expansion.kind === "category"
            ? state.reading.expansion.categoryId
            : null;
        state = updateAppReading(state, clearAnchor(state.reading));
        render();
        if (categoryId)
            overview.focusAnchorControl(categoryId);
    };
    const chooseSemanticAxis = (axis) => {
        state = updateAppReading(state, setSemanticAxis(state.reading, menu, axis));
        render();
    };
    const toggleCandidate = (productId) => {
        state = toggleAppCandidate(state, menu, productId);
        render();
    };
    const showOverviewFromContext = () => {
        state = updateAppReading(state, showMenuOverview(state.reading));
        render();
        overview.element.scrollIntoView({
            block: "start",
            behavior: categoryScrollBehavior(reducedMotion()),
        });
    };
    const showAll = () => {
        state = updateAppReading(state, showAllCategories(state.reading));
        render();
    };
    overview = createMenuOverview(model, selectCategory, beginAnchor, cancelAnchor, chooseAnchor, clearCurrentAnchor, chooseSemanticAxis, toggleCandidate, showOverviewFromContext, showAll);
    const shell = element("div", "menu-shell");
    const header = element("header", "restaurant-summary");
    const headerInner = element("div", "restaurant-summary__inner");
    const summaryCopy = element("div", "restaurant-summary__copy");
    summaryCopy.append(element("p", "eyebrow", "完整菜單"), element("h1", "restaurant-title", model.restaurantName), element("p", "restaurant-description", model.restaurantDescription));
    const metrics = element("dl", "menu-metrics");
    const metricValues = [
        ["品項", `${model.productCount} 道`],
        ["區域", `${model.categoryCount} 類`],
        ["價位", model.priceRange],
    ];
    metricValues.forEach(([label, value]) => {
        const item = element("div", "menu-metric");
        item.append(element("dt", "menu-metric__label", label), element("dd", "menu-metric__value", value));
        metrics.append(item);
    });
    const workspace = element("div", "reading-workspace");
    workspace.id = "complete-menu";
    workspace.append(overview.element);
    headerInner.append(summaryCopy, metrics);
    header.append(headerInner);
    shell.append(header, workspace);
    root.replaceChildren(shell);
    render();
    document.addEventListener("keydown", (event) => {
        if (state.reading.anchorReading.kind !== "selecting" ||
            !isAnchorSelectionCancelKey(event.key))
            return;
        event.preventDefault();
        cancelAnchor(focusedProductId());
    });
    let scrollFrame = null;
    const syncAllModePosition = () => {
        scrollFrame = null;
        if (state.reading.expansion.kind !== "all")
            return;
        const marker = window.innerHeight * 0.32;
        let activeCategoryId = model.categories[0]?.id ?? null;
        model.categories.forEach((category) => {
            const section = overview.sectionFor(category.id);
            if (section && section.getBoundingClientRect().top <= marker) {
                activeCategoryId = category.id;
            }
        });
        if (activeCategoryId && activeCategoryId !== state.reading.activeCategoryId) {
            state = updateAppReading(state, setActiveCategory(state.reading, menu, activeCategoryId));
            render();
        }
    };
    window.addEventListener("scroll", () => {
        if (scrollFrame !== null)
            return;
        scrollFrame = window.requestAnimationFrame(syncAllModePosition);
    }, { passive: true });
};
