const SVG_NS = "http://www.w3.org/2000/svg";

const createRouteSvg = (count, activeIndex) => {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.classList.add("model-route__lines");
  svg.setAttribute("viewBox", "0 0 100 12");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const base = document.createElementNS(SVG_NS, "line");
  base.setAttribute("x1", "0");
  base.setAttribute("y1", "6");
  base.setAttribute("x2", "100");
  base.setAttribute("y2", "6");
  base.setAttribute("class", "model-route__line model-route__line--base");
  svg.append(base);

  const progress = document.createElementNS(SVG_NS, "line");
  progress.setAttribute("x1", "0");
  progress.setAttribute("y1", "6");
  progress.setAttribute("x2", count <= 1 ? "0" : String((activeIndex / (count - 1)) * 100));
  progress.setAttribute("y2", "6");
  progress.setAttribute("class", "model-route__line model-route__line--active");
  svg.append(progress);
  return svg;
};

const focusAdjacent = (event, buttons, currentIndex) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || !buttons.length) return;
  event.preventDefault();
  const nextIndex = event.key === "Home"
    ? 0
    : (event.key === "End"
      ? buttons.length - 1
      : ((currentIndex + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length));
  buttons[nextIndex].focus();
};

export const createModelRouteDiagram = ({
  root,
  currentLabel,
  currentNote,
  labelForSection,
  onSelect,
  onPreview,
  onPreviewEnd,
}) => {
  const buttons = () => [...root.querySelectorAll("button[data-section-id]")];

  const syncOverflow = () => {
    const viewportWidth = Number(root.clientWidth) || 0;
    const contentWidth = Number(root.scrollWidth) || 0;
    const maxScroll = Math.max(0, contentWidth - viewportWidth);
    const scrollLeft = Math.min(maxScroll, Math.max(0, Number(root.scrollLeft) || 0));
    root.dataset.overflowStart = String(scrollLeft > 1);
    root.dataset.overflowEnd = String(scrollLeft < maxScroll - 1);
  };

  const revealSelected = (button) => {
    if (!button) return;
    const reveal = () => {
      const viewportWidth = Number(root.clientWidth) || 0;
      const maxScroll = Math.max(0, (Number(root.scrollWidth) || 0) - viewportWidth);
      const edgeInset = 12;
      const tabStart = button.offsetLeft;
      const tabEnd = tabStart + button.offsetWidth;
      const visibleStart = Number(root.scrollLeft) || 0;
      const visibleEnd = visibleStart + viewportWidth;
      let target = visibleStart;
      if (tabStart < visibleStart + edgeInset) target = tabStart - edgeInset;
      else if (tabEnd > visibleEnd - edgeInset) target = tabEnd - viewportWidth + edgeInset;
      root.scrollLeft = Math.min(maxScroll, Math.max(0, target));
      syncOverflow();
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(reveal));
    } else reveal();
  };

  const setCurrentCopy = (section, presentation) => {
    const sectionPresentation = presentation?.sections?.[section.id];
    currentLabel.textContent = sectionPresentation?.label ?? labelForSection(section);
    currentNote.textContent = sectionPresentation?.note ?? section.summary;
  };

  const createButton = ({ candidate, selected, index, presentation }) => {
    const sectionPresentation = presentation?.sections?.[candidate.id];
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.dataset.sectionId = candidate.id;
    button.title = candidate.title;
    button.tabIndex = selected ? 0 : -1;
    button.setAttribute("aria-selected", String(selected));

    if (presentation?.kind === "sequence") {
      const marker = document.createElement("span");
      marker.className = "model-route__marker";
      marker.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "model-route__label";
      label.textContent = sectionPresentation?.label ?? labelForSection(candidate);
      button.append(marker, label);
    } else {
      button.textContent = labelForSection(candidate);
    }

    button.addEventListener("keydown", (event) => focusAdjacent(event, buttons(), index));
    button.addEventListener("click", () => onSelect(candidate));
    if (presentation) {
      button.addEventListener("pointerenter", () => onPreview(candidate));
      button.addEventListener("pointerleave", onPreviewEnd);
      button.addEventListener("focus", () => onPreview(candidate));
      button.addEventListener("blur", onPreviewEnd);
    }
    return button;
  };

  const render = ({ model, section, presentation }) => {
    root.replaceChildren();
    root.dataset.routeKind = presentation?.kind ?? "tabs";
    root.classList.toggle("model-section-tabs--route", Boolean(presentation));

    const canvas = document.createElement("div");
    canvas.className = presentation
      ? "model-route__canvas model-route__canvas--sequence"
      : "model-route__canvas model-route__canvas--tabs";
    canvas.style.setProperty("--route-count", String(model.sections.length));

    const activeIndex = Math.max(0, model.sections.findIndex((candidate) => candidate.id === section.id));
    if (presentation?.kind === "sequence") canvas.append(createRouteSvg(model.sections.length, activeIndex));

    let selectedButton = null;
    for (const [index, candidate] of model.sections.entries()) {
      const selected = candidate.id === section.id;
      const button = createButton({ candidate, selected, index, presentation });
      if (selected) selectedButton = button;
      canvas.append(button);
    }
    root.append(canvas);
    setCurrentCopy(section, presentation);
    revealSelected(selectedButton);
  };

  const preview = ({ section, presentation }) => setCurrentCopy(section, presentation);
  const restore = ({ section, presentation }) => setCurrentCopy(section, presentation);

  root.addEventListener("scroll", syncOverflow, { passive: true });
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(syncOverflow) : null;
  resizeObserver?.observe(root);

  return {
    render,
    preview,
    restore,
    syncOverflow,
    revealSelected,
    getButtons: buttons,
  };
};
