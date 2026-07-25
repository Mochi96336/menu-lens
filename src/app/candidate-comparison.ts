import type { Menu, ProductId } from "../domain/menu-types.js";
import {
  createCandidateComparisonModel,
  isComparisonSelected,
  type CandidateComparisonModel,
  type CandidateComparisonState,
  type ComparisonEvidence,
} from "../customer/candidate-comparison.js";
import type { CandidateState } from "../customer/menu-candidates.js";
import {
  metadataConfidenceLabels,
  metadataSourceLabels,
} from "../customer/menu-semantic-labels.js";

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

const evidenceText = (evidence: ComparisonEvidence): string =>
  evidence.valueLabel ?? "未提供";

const evidenceSupport = (evidence: ComparisonEvidence): string | null => {
  if (evidence.status === "missing") return null;
  const source = evidence.source ? metadataSourceLabels[evidence.source] : null;
  if (evidence.status === "low_confidence") {
    return [source, evidence.confidence ? metadataConfidenceLabels[evidence.confidence] : "低可信"]
      .filter((entry): entry is string => Boolean(entry))
      .join(" · ");
  }
  return source;
};

const selectionStatusText = (model: CandidateComparisonModel): string => {
  if (model.candidates.length < 2) return "至少需要 2 道考慮項目才能比較";
  const count = model.selectedProducts.length;
  if (count === 0) return "尚未選擇 · 最多 3 道";
  if (count === 1) return "已選 1 / 3 道 · 再選 1 道即可比較";
  return `已選 ${count} / 3 道`;
};

export type CandidateComparisonView = Readonly<{
  element: HTMLElement;
  render: (candidates: CandidateState, comparison: CandidateComparisonState) => void;
  focusHeading: () => void;
  announceLimit: () => void;
}>;

export const createCandidateComparison = (
  menu: Menu,
  onBack: () => void,
  onToggleSelection: (productId: ProductId) => void,
): CandidateComparisonView => {
  const root = element("main", "candidate-comparison");
  root.id = "candidate-comparison";
  root.hidden = true;
  root.setAttribute("inert", "");

  const header = element("header", "candidate-comparison__header");
  const backButton = element("button", "candidate-comparison__back", "回到考慮項目") as HTMLButtonElement;
  backButton.type = "button";
  const eyebrow = element("p", "eyebrow", "考慮項目比較");
  const heading = element("h2", "candidate-comparison__title", "比較考慮項目");
  heading.tabIndex = -1;
  const hint = element(
    "p",
    "candidate-comparison__hint",
    "選擇 2–3 道；只是在比較，尚未點餐。",
  );
  const status = element("p", "candidate-comparison__status", "尚未選擇 · 最多 3 道");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  header.append(backButton, eyebrow, heading, hint, status);

  const selectors = element("section", "candidate-comparison__selectors");
  const selectorHeading = element("h3", "candidate-comparison__section-title", "選擇比較項目");
  const selectorRows = element("div", "candidate-comparison__selector-rows");
  selectors.append(selectorHeading, selectorRows);

  const evidence = element("div", "candidate-comparison__evidence");
  root.append(header, selectors, evidence);

  const selectorButtons = new Map<ProductId, HTMLButtonElement>();
  let renderedCandidates: CandidateState | null = null;
  let renderedComparison: CandidateComparisonState | null = null;

  const renderSelectors = (candidates: CandidateState): void => {
    selectorButtons.clear();
    selectorRows.replaceChildren();
    const membership = new Set(candidates.productIds);
    menu.products.filter((product) => membership.has(product.id)).forEach((product) => {
      const row = element("article", "candidate-comparison__selector-row");
      row.dataset.productId = product.id;
      const copy = element("div", "candidate-comparison__selector-copy");
      const name = element("h4", "candidate-comparison__selector-name", product.name);
      const category = menu.categories.find((entry) => entry.id === product.categoryId);
      const meta = element(
        "p",
        "candidate-comparison__selector-meta",
        [category?.name, product.availability === "sold_out" ? "已售完" : null]
          .filter((entry): entry is string => Boolean(entry))
          .join(" · "),
      );
      copy.append(name, meta);
      const button = element("button", "candidate-comparison__selector-action", "比較") as HTMLButtonElement;
      button.type = "button";
      button.setAttribute("aria-label", `比較「${product.name}」`);
      button.addEventListener("click", () => onToggleSelection(product.id));
      selectorButtons.set(product.id, button);
      row.append(copy, button);
      selectorRows.append(row);
    });
  };

  const resetStatus = (
    candidates: CandidateState,
    comparison: CandidateComparisonState,
  ): void => {
    status.textContent = selectionStatusText(
      createCandidateComparisonModel(menu, candidates, comparison),
    );
  };

  backButton.addEventListener("click", () => {
    onBack();
    if (renderedCandidates && renderedComparison) {
      resetStatus(renderedCandidates, renderedComparison);
    }
  });

  const render = (
    candidates: CandidateState,
    comparison: CandidateComparisonState,
  ): void => {
    const candidatesChanged = renderedCandidates !== candidates;
    const comparisonChanged = renderedComparison !== comparison;
    if (!candidatesChanged && !comparisonChanged) return;

    if (candidatesChanged) {
      renderSelectors(candidates);
      renderedCandidates = candidates;
    }
    selectorButtons.forEach((button, productId) => {
      const selected = isComparisonSelected(comparison, productId);
      button.setAttribute("aria-pressed", String(selected));
    });

    renderedComparison = comparison;
    const model = createCandidateComparisonModel(menu, candidates, comparison);
    status.textContent = selectionStatusText(model);
    evidence.replaceChildren();
    if (model.guidance) {
      evidence.append(element("p", "candidate-comparison__guidance", model.guidance));
    }
    model.dimensions.forEach((dimension) => {
      const section = element("section");
      section.className = "candidate-comparison__dimension";
      const title = element("h3", "candidate-comparison__dimension-title", dimension.label);
      const rows = element("div", "candidate-comparison__dimension-rows");
      dimension.values.forEach((value) => {
        const row = element("div", "candidate-comparison__dimension-row");
        const name = element("span", "candidate-comparison__dimension-name", value.product.name);
        const valueCell = element("span", "candidate-comparison__dimension-value");
        valueCell.append(element("span", "candidate-comparison__value-label", evidenceText(value.evidence)));
        const support = evidenceSupport(value.evidence);
        if (support) valueCell.append(element("small", "candidate-comparison__value-support", support));
        row.append(name, valueCell);
        rows.append(row);
      });
      section.append(title, rows);
      evidence.append(section);
    });
  };

  return {
    element: root,
    render,
    focusHeading: () => heading.focus({ preventScroll: true }),
    announceLimit: () => { status.textContent = "最多比較 3 道，請先取消一項。"; },
  };
};
