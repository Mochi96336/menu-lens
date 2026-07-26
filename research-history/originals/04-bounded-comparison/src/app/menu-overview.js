import { categoryIsExpanded, } from "../customer/menu-reading.js";
import { createMenuCategorySection } from "./menu-category.js";
const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
};
const axisLabels = {
    portion: "份量",
    preparation: "準備",
};
export const createMenuOverview = (model, onSelectCategory, onBeginAnchorSelection, onCancelAnchorSelection, onSelectAnchor, onClearAnchor, onSelectAxis, onToggleCandidate, onOpenCandidates, onShowOverview, onShowAll) => {
    const root = element("main", "menu-map");
    root.id = "menu-map";
    root.dataset.mode = "overview";
    const context = element("div", "menu-context");
    context.hidden = true;
    const overviewButton = element("button", "menu-context__back", "菜單全貌");
    overviewButton.type = "button";
    overviewButton.addEventListener("click", onShowOverview);
    const contextLabel = element("p", "menu-context__label");
    const showAllButton = element("button", "menu-context__all", "展開全部");
    showAllButton.type = "button";
    showAllButton.addEventListener("click", onShowAll);
    context.append(overviewButton, contextLabel, showAllButton);
    const intro = element("header", "menu-map__heading");
    const title = element("h2", "menu-map__title", "整張菜單先縮成六個區域");
    title.id = "menu-map-title";
    const candidateSummary = element("p", "candidate-summary", "尚無考慮項目 · 不影響點餐");
    candidateSummary.tabIndex = -1;
    candidateSummary.setAttribute("role", "status");
    candidateSummary.setAttribute("aria-live", "polite");
    candidateSummary.setAttribute("aria-atomic", "true");
    const candidateSummaryAction = element("button", "candidate-summary__action", "查看考慮項目");
    candidateSummaryAction.type = "button";
    candidateSummaryAction.disabled = true;
    candidateSummaryAction.dataset.empty = "true";
    candidateSummaryAction.setAttribute("aria-label", "尚無考慮項目");
    candidateSummaryAction.addEventListener("click", onOpenCandidates);
    const candidateSummaryRow = element("div", "candidate-summary-row");
    candidateSummaryRow.append(candidateSummary, candidateSummaryAction);
    intro.append(element("p", "eyebrow", "菜單全貌"), title, element("p", "menu-map__hint", "先看每區的份量、價位與代表菜名；點一區會在原位置展開，其他區域仍留在整張菜單裡。"), candidateSummaryRow);
    const stack = element("div", "category-stack");
    const sections = model.categories.map((category, index) => createMenuCategorySection(category, index, onSelectCategory, onBeginAnchorSelection, onCancelAnchorSelection, onSelectAnchor, onClearAnchor, onSelectAxis, onToggleCandidate));
    sections.forEach((section) => stack.append(section.element));
    const footer = element("div", "menu-map__footer");
    const footerAllButton = element("button", "menu-map__all-button", `展開全部 ${model.productCount} 道`);
    footerAllButton.type = "button";
    footerAllButton.addEventListener("click", onShowAll);
    footer.append(footerAllButton);
    root.append(context, intro, stack, footer);
    let renderedCandidateCount = 0;
    const render = (state, candidateState, candidateCount) => {
        root.dataset.mode = state.expansion.kind;
        context.hidden = state.expansion.kind === "overview";
        footer.hidden = state.expansion.kind === "all";
        showAllButton.hidden = state.expansion.kind === "all";
        if (renderedCandidateCount !== candidateCount) {
            candidateSummary.textContent = candidateCount === 0 ? "尚無考慮項目 · 不影響點餐" : `考慮中 ${candidateCount} 道 · 尚未點餐`;
            renderedCandidateCount = candidateCount;
        }
        candidateSummaryAction.dataset.empty = String(candidateCount === 0);
        candidateSummaryAction.disabled = candidateCount === 0;
        candidateSummaryAction.setAttribute("aria-label", candidateCount === 0 ? "尚無考慮項目" : `查看 ${candidateCount} 道考慮項目`);
        const candidateContext = candidateCount > 0 ? ` · 考慮中 ${candidateCount}` : "";
        const candidateIds = new Set(candidateState.productIds);
        const activeIndex = model.categories.findIndex((category) => category.id === state.activeCategoryId);
        const activeCategory = activeIndex >= 0 ? model.categories[activeIndex] : undefined;
        if (state.expansion.kind === "category") {
            const categoryContext = activeCategory
                ? `${activeIndex + 1} / ${model.categoryCount}　${activeCategory.name}　${activeCategory.productCount} 道${candidateContext}`
                : `分類聚焦${candidateContext}`;
            const anchorProductId = state.anchorReading.kind === "active"
                ? state.anchorReading.productId
                : null;
            const anchorName = anchorProductId
                ? activeCategory?.products.find((product) => product.id === anchorProductId)?.name
                : null;
            contextLabel.textContent = anchorName && state.semanticAxis
                ? `${axisLabels[state.semanticAxis]}｜${anchorName}${candidateContext}`
                : state.anchorReading.kind === "selecting"
                    ? `選擇比較基準　${activeCategory?.name ?? "分類聚焦"}${candidateContext}`
                    : categoryContext;
        }
        else if (state.expansion.kind === "all") {
            contextLabel.textContent = activeCategory
                ? `全部 ${model.productCount} 道　${activeIndex + 1} / ${model.categoryCount}　${activeCategory.name}${candidateContext}`
                : `全部 ${model.productCount} 道${candidateContext}`;
        }
        else {
            contextLabel.textContent = "";
        }
        contextLabel.title = contextLabel.textContent ?? "";
        sections.forEach((section) => {
            const isCurrent = state.expansion.kind !== "overview" && state.activeCategoryId === section.categoryId;
            section.setState(categoryIsExpanded(state, section.categoryId), isCurrent, state.expansion.kind === "category" && isCurrent
                ? state.anchorReading
                : { kind: "idle" }, state.expansion.kind === "category" && isCurrent
                ? state.semanticAxis
                : null, state.expansion.kind === "category" && isCurrent, candidateIds);
        });
    };
    return {
        element: root,
        render,
        sectionFor: (categoryId) => sections.find((section) => section.categoryId === categoryId)?.element ?? null,
        focusAnchorControl: (categoryId) => sections.find((section) => section.categoryId === categoryId)?.focusAnchorControl(),
        focusProductRelation: (categoryId, productId) => sections.find((section) => section.categoryId === categoryId)?.focusProductRelation(productId),
        focusProductCandidate: (categoryId, productId) => sections.find((section) => section.categoryId === categoryId)?.focusProductCandidate(productId),
        productRowFor: (categoryId, productId) => sections.find((section) => section.categoryId === categoryId)?.productRowFor(productId) ?? null,
        focusCandidateEntry: () => candidateSummaryAction.focus({ preventScroll: true }),
        focusCandidateSummary: () => candidateSummary.focus({ preventScroll: true }),
    };
};
