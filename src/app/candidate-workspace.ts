import type { Menu, ProductId } from "../domain/menu-types.js";
import { createCandidateWorkspaceModel } from "../customer/candidate-workspace.js";
import type { CandidateState } from "../customer/menu-candidates.js";
import type { CompleteMenuModel, ProductNodeModel } from "../customer/menu-reading.js";

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const productViewFor = (
  model: CompleteMenuModel,
  categoryId: string,
  productId: ProductId,
): ProductNodeModel | null =>
  model.categories
    .find((category) => category.id === categoryId)
    ?.products.find((product) => product.id === productId) ?? null;

export type CandidateWorkspaceView = Readonly<{
  element: HTMLElement;
  render: (state: CandidateState) => void;
  focusHeading: () => void;
  focusRemoval: (productId: ProductId) => void;
  focusComparisonEntry: () => void;
}>;

export const createCandidateWorkspace = (
  menu: Menu,
  readingModel: CompleteMenuModel,
  onBack: () => void,
  onLocateProduct: (productId: ProductId) => void,
  onRemoveCandidate: (productId: ProductId) => void,
  onOpenComparison: () => void,
): CandidateWorkspaceView => {
  const root = element("main", "candidate-workspace");
  root.id = "candidate-workspace";
  root.hidden = true;
  root.setAttribute("inert", "");

  const header = element("header", "candidate-workspace__header");
  const backButton = element("button", "candidate-workspace__back", "回到完整菜單") as HTMLButtonElement;
  backButton.type = "button";
  backButton.addEventListener("click", onBack);
  const eyebrow = element("p", "eyebrow", "考慮項目");
  const heading = element("h2", "candidate-workspace__title", "尚無考慮項目");
  heading.tabIndex = -1;
  const hint = element(
    "p",
    "candidate-workspace__hint",
    "尚未點餐，可隨時移除或回菜單查看。",
  );
  const comparisonEntryRow = element("div", "candidate-workspace__comparison-entry-row");
  const comparisonEntry = element(
    "button",
    "candidate-workspace__comparison-entry",
    "比較考慮項目",
  ) as HTMLButtonElement;
  comparisonEntry.type = "button";
  comparisonEntry.addEventListener("click", onOpenComparison);
  comparisonEntryRow.append(comparisonEntry);
  header.append(backButton, eyebrow, heading, hint, comparisonEntryRow);

  const groups = element("div", "candidate-workspace__groups");
  root.append(header, groups);

  const removeButtons = new Map<ProductId, HTMLButtonElement>();
  let renderedCandidateState: CandidateState | null = null;

  const render = (state: CandidateState): void => {
    if (renderedCandidateState === state) return;
    renderedCandidateState = state;
    const workspace = createCandidateWorkspaceModel(menu, state);
    heading.textContent = workspace.count === 0 ? "尚無考慮項目" : `考慮中的 ${workspace.count} 道`;
    root.dataset.empty = String(workspace.count === 0);
    const comparisonUnavailable = workspace.count < 2;
    comparisonEntry.disabled = comparisonUnavailable;
    comparisonEntry.dataset.empty = String(comparisonUnavailable);
    comparisonEntry.setAttribute(
      "aria-label",
      comparisonUnavailable ? "至少需要 2 道考慮項目才能比較" : `比較 ${workspace.count} 道考慮項目`,
    );
    removeButtons.clear();
    groups.replaceChildren();

    if (workspace.count === 0) {
      groups.append(
        element("p", "candidate-workspace__empty", "你可以回到完整菜單繼續瀏覽。"),
      );
      return;
    }

    workspace.groups.forEach((group) => {
      const section = element("section", "candidate-workspace__group");
      const groupHeading = element("h3", "candidate-workspace__group-title", group.category.name);
      const rows = element("div", "candidate-workspace__rows");

      group.products.forEach((product) => {
        const productView = productViewFor(readingModel, group.category.id, product.id);
        const row = element("article", "candidate-workspace__row");
        row.dataset.productId = product.id;

        const identity = element("div", "candidate-workspace__identity");
        const name = element("h4", "candidate-workspace__name", product.name);
        const price = element(
          "span",
          "candidate-workspace__price",
          productView?.price ?? String(product.price),
        );
        identity.append(name, price);

        const cueText = [productView?.primaryCue, productView?.secondaryCue]
          .filter((cue): cue is string => Boolean(cue))
          .join(" · ");
        const cues = element(
          "p",
          "candidate-workspace__cues",
          cueText || "未提供額外閱讀線索",
        );

        const statuses = element("p", "candidate-workspace__statuses");
        if (productView?.isSoldOut) {
          statuses.append(element("span", "status-text status-text--sold-out", "已售完"));
        }
        if (productView?.metadataCompleteness === "partial") {
          statuses.append(element("span", "candidate-status", "資訊有限"));
        }

        const actions = element("div", "candidate-workspace__actions");
        const locateButton = element("button", "candidate-workspace__action", "在菜單中查看") as HTMLButtonElement;
        locateButton.type = "button";
        locateButton.setAttribute("aria-label", `在菜單中查看「${product.name}」`);
        locateButton.addEventListener("click", () => onLocateProduct(product.id));
        const removeButton = element("button", "candidate-workspace__action", "移出考慮") as HTMLButtonElement;
        removeButton.type = "button";
        removeButton.setAttribute("aria-label", `將「${product.name}」移出考慮`);
        removeButton.addEventListener("click", () => onRemoveCandidate(product.id));
        actions.append(locateButton, removeButton);
        removeButtons.set(product.id, removeButton);

        row.append(identity, cues, statuses, actions);
        rows.append(row);
      });

      section.append(groupHeading, rows);
      groups.append(section);
    });
  };

  return {
    element: root,
    render,
    focusHeading: () => heading.focus({ preventScroll: true }),
    focusRemoval: (productId) => removeButtons.get(productId)?.focus({ preventScroll: true }),
    focusComparisonEntry: () => comparisonEntry.focus({ preventScroll: true }),
  };
};
