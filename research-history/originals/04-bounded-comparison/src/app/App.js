import { isComparisonSelected } from "../customer/candidate-comparison.js";
import { createCandidateWorkspaceModel } from "../customer/candidate-workspace.js";
import { closeCandidateComparison, closeCandidateWorkspace, createInitialMenuAppState, openCandidateComparison, openCandidateWorkspace, removeAppCandidate, showCandidateInMenu, toggleAppCandidate, toggleAppComparison, updateAppReading, } from "../customer/menu-app-state.js";
import { candidateCount } from "../customer/menu-candidates.js";
import { beginAnchorSelection, cancelAnchorSelection, categoryScrollBehavior, clearAnchor, createCompleteMenuModel, focusCategory, isAnchorSelectionCancelKey, selectAnchor, setActiveCategory, setSemanticAxis, showAllCategories, showMenuOverview, } from "../customer/menu-reading.js";
import { createCandidateComparison } from "./candidate-comparison.js";
import { createCandidateWorkspace } from "./candidate-workspace.js";
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
    let candidateWorkspace;
    let candidateComparison;
    let candidateReturnContext = null;
    let comparisonReturnContext = null;
    const render = () => {
        const count = candidateCount(menu, state.candidates);
        overview.render(state.reading, state.candidates, count);
        candidateWorkspace.render(state.candidates);
        candidateComparison.render(state.candidates, state.comparison);
        overview.element.hidden = state.surface.kind !== "menu";
        candidateWorkspace.element.hidden = state.surface.kind !== "candidates";
        candidateComparison.element.hidden = state.surface.kind !== "comparison";
        if (state.surface.kind === "menu") {
            overview.element.removeAttribute("inert");
            candidateWorkspace.element.setAttribute("inert", "");
            candidateComparison.element.setAttribute("inert", "");
        }
        else if (state.surface.kind === "candidates") {
            overview.element.setAttribute("inert", "");
            candidateWorkspace.element.removeAttribute("inert");
            candidateComparison.element.setAttribute("inert", "");
        }
        else {
            overview.element.setAttribute("inert", "");
            candidateWorkspace.element.setAttribute("inert", "");
            candidateComparison.element.removeAttribute("inert");
        }
    };
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
    const openCandidates = () => {
        if (candidateCount(menu, state.candidates) === 0)
            return;
        candidateReturnContext = {
            scrollY: window.scrollY,
            focusElement: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        };
        state = openCandidateWorkspace(state, menu);
        render();
        window.scrollTo({ top: 0, behavior: "instant" });
        candidateWorkspace.focusHeading();
    };
    const closeCandidates = () => {
        const returnContext = candidateReturnContext;
        state = closeCandidateWorkspace(state);
        render();
        if (returnContext) {
            window.scrollTo({ top: returnContext.scrollY, behavior: "instant" });
            if (candidateCount(menu, state.candidates) === 0)
                overview.focusCandidateSummary();
            else
                returnContext.focusElement?.focus({ preventScroll: true });
        }
        else {
            overview.focusCandidateEntry();
        }
        candidateReturnContext = null;
    };
    const openComparison = () => {
        const nextState = openCandidateComparison(state, menu);
        if (nextState === state)
            return;
        comparisonReturnContext = {
            scrollY: window.scrollY,
            focusElement: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        };
        state = nextState;
        render();
        window.scrollTo({ top: 0, behavior: "instant" });
        candidateComparison.focusHeading();
    };
    const closeComparison = () => {
        const returnContext = comparisonReturnContext;
        state = closeCandidateComparison(state);
        render();
        if (returnContext) {
            window.scrollTo({ top: returnContext.scrollY, behavior: "instant" });
            if (returnContext.focusElement?.isConnected) {
                returnContext.focusElement.focus({ preventScroll: true });
            }
            else {
                candidateWorkspace.focusComparisonEntry();
            }
        }
        else {
            candidateWorkspace.focusComparisonEntry();
        }
        comparisonReturnContext = null;
    };
    const toggleComparison = (productId) => {
        const before = state.comparison;
        const wasSelected = isComparisonSelected(before, productId);
        const nextState = toggleAppComparison(state, menu, productId);
        if (nextState === state && !wasSelected && before.productIds.length >= 3) {
            candidateComparison.announceLimit();
            return;
        }
        state = nextState;
        render();
    };
    const removeCandidateFromWorkspace = (productId) => {
        const orderedProductIds = createCandidateWorkspaceModel(menu, state.candidates).groups.flatMap((group) => group.products.map((product) => product.id));
        const removedIndex = orderedProductIds.indexOf(productId);
        const returnFocusProductId = removedIndex < 0
            ? null
            : orderedProductIds[removedIndex + 1] ?? orderedProductIds[removedIndex - 1] ?? null;
        state = removeAppCandidate(state, productId);
        render();
        if (returnFocusProductId)
            candidateWorkspace.focusRemoval(returnFocusProductId);
        else
            candidateWorkspace.focusHeading();
    };
    const locateCandidateInMenu = (productId) => {
        const product = menu.products.find((entry) => entry.id === productId);
        if (!product)
            return;
        state = showCandidateInMenu(state, menu, productId);
        render();
        const row = overview.productRowFor(product.categoryId, productId);
        row?.scrollIntoView({
            block: "center",
            behavior: categoryScrollBehavior(reducedMotion()),
        });
        if (product.availability === "sold_out")
            overview.focusProductRelation(product.categoryId, productId);
        else
            overview.focusProductCandidate(product.categoryId, productId);
        candidateReturnContext = null;
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
    overview = createMenuOverview(model, selectCategory, beginAnchor, cancelAnchor, chooseAnchor, clearCurrentAnchor, chooseSemanticAxis, toggleCandidate, openCandidates, showOverviewFromContext, showAll);
    candidateWorkspace = createCandidateWorkspace(menu, model, closeCandidates, locateCandidateInMenu, removeCandidateFromWorkspace, openComparison);
    candidateComparison = createCandidateComparison(menu, closeComparison, toggleComparison);
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
    workspace.append(overview.element, candidateWorkspace.element, candidateComparison.element);
    headerInner.append(summaryCopy, metrics);
    header.append(headerInner);
    shell.append(header, workspace);
    root.replaceChildren(shell);
    render();
    document.addEventListener("keydown", (event) => {
        if (state.surface.kind !== "menu" ||
            state.reading.anchorReading.kind !== "selecting" ||
            !isAnchorSelectionCancelKey(event.key))
            return;
        event.preventDefault();
        cancelAnchor(focusedProductId());
    });
    let scrollFrame = null;
    const syncAllModePosition = () => {
        scrollFrame = null;
        if (state.surface.kind !== "menu" || state.reading.expansion.kind !== "all")
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
