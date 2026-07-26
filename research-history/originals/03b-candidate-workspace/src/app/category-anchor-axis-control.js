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
export const createCategoryAnchorAxisControl = (categoryId, onSelectAxis) => {
    const root = element("div", "category-anchor-axis-control");
    root.hidden = true;
    const label = element("span", "category-anchor-axis-control__label", "比較內容");
    const group = element("div", "category-anchor-axis-control__group");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "比較內容");
    group.setAttribute("aria-describedby", `anchor-context-${categoryId}`);
    const buttons = new Map();
    ["portion", "preparation"].forEach((axis) => {
        const button = element("button", "category-anchor-axis-control__button", axisLabels[axis]);
        button.type = "button";
        button.dataset.axis = axis;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => onSelectAxis(axis));
        buttons.set(axis, button);
        group.append(button);
    });
    root.append(label, group);
    return {
        element: root,
        setState: (availableAxes, semanticAxis, enabled, visible) => {
            root.hidden = !visible;
            root.dataset.enabled = String(enabled);
            buttons.forEach((button, axis) => {
                const available = availableAxes.includes(axis);
                button.hidden = !available;
                button.disabled = !enabled;
                button.setAttribute("aria-pressed", String(available && semanticAxis === axis));
            });
        },
    };
};
