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

const createSvgRoot = () => {
  const svg = svgElement("svg");
  svg.setAttribute("class", "model-route__lines");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg;
};

const appendPath = ({ svg, d, className, segment, targetId }) => {
  const path = svgElement("path");
  path.setAttribute("d", d);
  path.setAttribute("class", className);
  path.setAttribute("data-route-segment", segment);
  if (targetId) path.setAttribute("data-route-target", targetId);
  svg.append(path);
  return path;
};

const createDirectRouteSvg = ({ model, presentation, activeSectionId }) => {
  const svg = createSvgRoot();

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

const createBalancedRailSvg = ({ presentation, activeSectionId }) => {
  const svg = createSvgRoot();
  const { rootId, railY } = presentation.routeLayout;
  const root = presentation.sections[rootId]?.position;
  const targets = presentation.edges
    .map(([, targetId]) => ({
      id: targetId,
      position: presentation.sections[targetId]?.position,
    }))
    .filter(({ position }) => Boolean(position));

  if (!root || !targets.length) return svg;

  const minX = Math.min(...targets.map(({ position }) => position.x));
  const maxX = Math.max(...targets.map(({ position }) => position.x));
  const baseClass = "model-route__line model-route__line--base";

  appendPath({
    svg,
    d: `M ${root.x} ${root.y} V ${railY}`,
    className: baseClass,
    segment: "stem",
  });
  appendPath({
    svg,
    d: `M ${minX} ${railY} H ${maxX}`,
    className: baseClass,
    segment: "rail",
  });

  for (const target of targets) {
    appendPath({
      svg,
      d: `M ${target.position.x} ${railY} V ${target.position.y}`,
      className: baseClass,
      segment: "drop",
      targetId: target.id,
    });
  }

  if (activeSectionId !== rootId) {
    const active = presentation.sections[activeSectionId]?.position;
    if (active) {
      appendPath({
        svg,
        d: `M ${root.x} ${root.y} V ${railY} H ${active.x} V ${active.y}`,
        className: "model-route__line model-route__line--active",
        segment: "active",
        targetId: activeSectionId,
      });
    }
  }

  return svg;
};

const createParallelRailSvg = ({ model, presentation, activeSectionId }) => {
  const svg = createSvgRoot();
  const { railY } = presentation.routeLayout;
  const peers = model.sections
    .map((section) => ({
      id: section.id,
      position: presentation.sections[section.id]?.position,
    }))
    .filter(({ position }) => Boolean(position));

  if (!peers.length) return svg;

  const minX = Math.min(...peers.map(({ position }) => position.x));
  const maxX = Math.max(...peers.map(({ position }) => position.x));
  const baseClass = "model-route__line model-route__line--base";

  appendPath({
    svg,
    d: `M ${minX} ${railY} H ${maxX}`,
    className: baseClass,
    segment: "rail",
  });

  for (const peer of peers) {
    appendPath({
      svg,
      d: `M ${peer.position.x} ${railY} V ${peer.position.y}`,
      className: baseClass,
      segment: "drop",
      targetId: peer.id,
    });
  }

  const active = presentation.sections[activeSectionId]?.position;
  if (active) {
    appendPath({
      svg,
      d: `M ${active.x} ${railY} V ${active.y}`,
      className: "model-route__line model-route__line--active",
      segment: "active",
      targetId: activeSectionId,
    });
  }

  return svg;
};

const createRouteSvg = (context) => {
  const type = context.presentation.routeLayout?.type;
  if (type === "balanced-rail") return createBalancedRailSvg(context);
  if (type === "parallel-rail") return createParallelRailSvg(context);
  return createDirectRouteSvg(context);
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
    button.style.setProperty("--route-mobile-x", `${index * 8 + 4}rem`);

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
    root.dataset.routeModel = model.id;
    root.dataset.routeCount = String(model.sections.length);
    root.dataset.routeKind = presentation.kind;
    root.dataset.routeLayout = presentation.routeLayout?.type ?? "direct";
    setRouteClass(root, presentation.kind);

    const layoutType = presentation.routeLayout?.type ?? "direct";
    const canvas = document.createElement("div");
    canvas.className = `model-route__canvas model-route__canvas--${presentation.kind} model-route__canvas--layout-${layoutType}`;
    canvas.style.setProperty("--route-count", String(model.sections.length));
    if (presentation.routeLayout?.maxWidth) {
      canvas.style.setProperty("--route-max-width", `${presentation.routeLayout.maxWidth}rem`);
    }
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
