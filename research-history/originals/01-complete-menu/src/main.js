import { mountMenuApp } from "./app/App.js";
import { MenuValidationError } from "./domain/menu-validation.js";
const renderStartupError = (root, error) => {
    const shell = document.createElement("section");
    shell.className = "startup-error";
    const title = document.createElement("h1");
    title.textContent = "菜單資料目前無法載入";
    const description = document.createElement("p");
    description.textContent = "開發資料未通過驗證。請修正 canonical menu 後重新整理。";
    shell.append(title, description);
    if (error instanceof MenuValidationError) {
        const list = document.createElement("ul");
        error.issues.slice(0, 4).forEach((issue) => {
            const item = document.createElement("li");
            item.textContent = issue;
            list.append(item);
        });
        if (error.issues.length > 4) {
            const item = document.createElement("li");
            item.textContent = `另有 ${error.issues.length - 4} 項驗證問題。`;
            list.append(item);
        }
        shell.append(list);
    }
    root.replaceChildren(shell);
};
const start = async () => {
    const root = document.querySelector("#app");
    if (!root)
        return;
    try {
        const { referenceMenu } = await import("./domain/reference-menu.js");
        mountMenuApp(root, referenceMenu);
    }
    catch (error) {
        renderStartupError(root, error);
    }
};
void start();
