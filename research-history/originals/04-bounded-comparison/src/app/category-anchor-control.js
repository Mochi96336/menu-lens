const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
};
export const createCategoryAnchorControl = (categoryId, onBeginSelection, onCancelSelection, onClearAnchor) => {
    const root = element("div", "category-anchor-control");
    root.hidden = true;
    root.dataset.anchorState = "idle";
    const label = element("p", "category-anchor-control__label", "比較基準：尚未選擇");
    label.id = `anchor-context-${categoryId}`;
    label.setAttribute("role", "status");
    label.setAttribute("aria-live", "polite");
    label.setAttribute("aria-atomic", "true");
    const actions = element("div", "category-anchor-control__actions");
    const primary = element("button", "category-anchor-control__action", "選擇");
    primary.type = "button";
    primary.setAttribute("aria-describedby", label.id);
    const secondary = element("button", "category-anchor-control__action", "清除");
    secondary.type = "button";
    secondary.setAttribute("aria-describedby", label.id);
    secondary.hidden = true;
    secondary.addEventListener("click", onClearAnchor);
    actions.append(primary, secondary);
    root.append(label, actions);
    let currentState = "idle";
    primary.addEventListener("click", () => {
        if (currentState === "selecting")
            onCancelSelection();
        else
            onBeginSelection();
    });
    return {
        element: root,
        setState: (anchorReading, anchorName, visible) => {
            root.hidden = !visible;
            root.dataset.anchorState = anchorReading.kind;
            currentState = anchorReading.kind;
            if (anchorReading.kind === "selecting") {
                label.textContent = "選擇一項作為比較基準";
                label.title = label.textContent;
                primary.textContent = "取消";
                primary.setAttribute("aria-label", "取消選擇比較基準");
                secondary.hidden = true;
                return;
            }
            if (anchorReading.kind === "active") {
                const resolvedName = anchorName ?? "目前項目";
                label.textContent = `比較基準：${resolvedName}`;
                label.title = label.textContent;
                primary.textContent = "更換";
                primary.setAttribute("aria-label", `更換比較基準，目前是「${resolvedName}」`);
                secondary.hidden = false;
                secondary.setAttribute("aria-label", `清除比較基準「${resolvedName}」`);
                return;
            }
            label.textContent = "比較基準：尚未選擇";
            label.title = label.textContent;
            primary.textContent = "選擇";
            primary.setAttribute("aria-label", "選擇一項作為比較基準");
            secondary.hidden = true;
        },
        focusAction: () => primary.focus({ preventScroll: true }),
    };
};
