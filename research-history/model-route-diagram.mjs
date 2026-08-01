const SVG_NS = "http://www.w3.org/2000/svg";

const svgElement = (name) => typeof document.createElementNS === "function"
  ? document.createElementNS(SVG_NS, name)
  : document.createElement(name);

const setRouteClass = (root, kind) => {
  const names = String(root.className || "").split(/\s+/).filter(Boolean);
  const retained = names.filter((name) => !name.startsWith("model-section-tabs--"));
  retained.push("model-section-tabs--route", `model-section-tabs--${kind}`);
  root.className = [...new Set(retained)].join(" ");
};

const sectionIndex = (model, id) => model.sections.findIndex((section) => section.id === id);

const edgeIsActive = ({ kind, edge, model, activeSectionId }) => {
  const [, to] = edge;
  if (kind === "sequence") {
    const activeIndex = sectionIndex(model, activeSectionId);
    return sectionIndex(model, to) <= activeIndex;
  }
  if (kind === "branch" || kind === "field") return activeSectionId === to;
  return false;
};

const createRouteSvg = ({ model, presentation, activeSectionId }) => {
  const svg = svgElement("svg");
  svg.setAttribute("class", "model-route__lines");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  for (const edge of presentation.edges) {
    const [fromId, toId] = edge;
    const from = presentation.sections[fromId]?.position;
    const to = presentation.sections[toId]?.position;
    if (!from || !to) continue;
    const line = svgElement("line");
    line.setAttribute("x1", String(from.x));
    line.setAttribute("y1", String(from.y));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y));
    line.setAttribute("class", edgeIsActive({ kind: presentation.kind, edge, model, activeSectionId })
      ? "model-route__line model-route__line--active"
      : "model-route__line model-route__line--base");
    svg.append(line);
  }
  return svg;
};

const moveRovingFocus = (event, buttons, currentIndex) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || !buttons.length) return;
  event.preventDefault();
  const nextIndex = event.key === "Home"
    ? 0
    : (event.key === "End"
      ? buttons.length - 1
      : ((currentIndex + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length));
  for (const button of buttons) button.tabIndex = -1;
  buttons[nextIndex].tabIndex = 0;
  buttons[nextIndex].focus();
};

export const createModelRouteDiagram = ({
  root,
  panel = document.querySelector?.("#model-section-panel") ?? root,
  currentLabel,
  currentNote,
  labelForSection,
  onSelect,
  onPreview,
  onPreviewEnd,
}) => {
  let selectedButton = null;
  const buttons = () => [...root.querySelectorAll("button[data-section-id]")];

  const syncOverflow = () => {
    const viewportWidth = Number(root.clientWidth) || 0;
    const contentWidth = Number(root.scrollWidth) || 0;
    const maxScroll = Math.max(0, contentWidth - viewportWidth);
    const scrollLeft = Math.min(maxScroll, Math.max(0, Number(root.scrollLeft) || 0));
    root.dataset.overflowStart = String(scrollLeft > 1);
    root.dataset.overflowEnd = String(scrollLeft < maxScroll - 1);
  };

  const revealSelected = (button = selectedButton) => {
    if (!button) return;
    const reveal = () => {
      const viewportWidth = Number(root.clientWidth) || 0;
      const maxScroll = Math.max(0, (Number(root.scrollWidth) || 0) - viewportWidth);
      const visibleStart = Number(root.scrollLeft) || 0;
      const edgeInset = 16;
      let target = visibleStart;

      if (typeof root.getBoundingClientRect === "function"
        && typeof button.getBoundingClientRect === "function") {
        const rootRect = root.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        if (buttonRect.left < rootRect.left + edgeInset) {
          target += buttonRect.left - rootRect.left - edgeInset;
        } else if (buttonRect.right > rootRect.right - edgeInset) {
          target += buttonRect.right - rootRect.right + edgeInset;
        }
      } else {
        const tabStart = Number(button.offsetLeft) || 0;
        const tabEnd = tabStart + (Number(button.offsetWidth) || 0);
        const visibleEnd = visibleStart + viewportWidth;
        if (tabStart < visibleStart + edgeInset) target = tabStart - edgeInset;
        else if (tabEnd > visibleEnd - edgeInset) target = tabEnd - viewportWidth + edgeInset;
      }

      root.scrollLeft = Math.min(maxScroll, Math.max(0, target));
      syncOverflow();
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(reveal));
    } else reveal();
  };

  const setCurrentCopy = (section, presentation) => {
    const sectionPresentation = presentation.sections[section.id];
    currentLabel.textContent = sectionPresentation.label;
    currentNote.textContent = sectionPresentation.note;
  };

  const createButton = ({ candidate, selected, index, presentation }) => {
    const sectionPresentation = presentation.sections[candidate.id];
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.id = `model-section-tab-${candidate.id}`;
    button.dataset.sectionId = candidate.id;
    button.title = candidate.title;
    button.tabIndex = selected ? 0 : -1;
    button.setAttribute("aria-selected", String(selected));
    button.setAttribute("aria-controls", panel.id || root.id);
    button.style.setProperty("--route-x", `${sectionPresentation.position.x}%`);
    button.style.setProperty("--route-y", `${sectionPresentation.position.y}%`);

    const marker = document.createElement("span");
    marker.className = "model-route__marker";
    marker.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "model-route__label";
    label.textContent = sectionPresentation.label ?? labelForSection(candidate);
    button.append(marker, label);

    button.addEventListener("keydown", (event) => moveRovingFocus(event, buttons(), index));
    button.addEventListener("click", () => onSelect(candidate));
    button.addEventListener("pointerenter", () => onPreview(candidate));
    button.addEventListener("pointerleave", onPreviewEnd);
    button.addEventListener("focus", () => onPreview(candidate));
    button.addEventListener("blur", onPreviewEnd);
    return button;
  };

  const render = ({ model, section, presentation }) => {
    if (!presentation) throw new Error(`Model ${model.id} is missing diagram presentation metadata.`);
    root.replaceChildren();
    root.dataset.routeKind = presentation.kind;
    setRouteClass(root, presentation.kind);

    const canvas = document.createElement("div");
    canvas.className = `model-route__canvas model-route__canvas--${presentation.kind}`;
    canvas.style.setProperty("--route-count", String(model.sections.length));
    canvas.append(createRouteSvg({ model, presentation, activeSectionId: section.id }));

    selectedButton = null;
    for (const [index, candidate] of model.sections.entries()) {
      const selected = candidate.id === section.id;
      const button = createButton({ candidate, selected, index, presentation });
      if (selected) selectedButton = button;
      canvas.append(button);
    }
    root.append(canvas);
    setCurrentCopy(section, presentation);
    panel.setAttribute?.("aria-labelledby", selectedButton?.id ?? "");
    revealSelected();
  };

  root.addEventListener("scroll", syncOverflow, { passive: true });
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
      syncOverflow();
      revealSelected();
    })
    : null;
  resizeObserver?.observe(root);

  return {
    render,
    preview: () => {},
    restore: () => {},
    syncOverflow,
    revealSelected,
    getButtons: buttons,
  };
};
