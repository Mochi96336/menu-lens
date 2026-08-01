const SVG_NS = "http://www.w3.org/2000/svg";

const svgElement = (name, attributes = {}) => {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
};

const addLine = (svg, x1, y1, x2, y2, className) => {
  const line = svgElement("line", { x1, y1, x2, y2, class: className });
  svg.append(line);
  return line;
};

const addCircle = (svg, cx, cy, r, className) => {
  const circle = svgElement("circle", { cx, cy, r, class: className });
  svg.append(circle);
  return circle;
};

const addRect = (svg, x, y, width, height, className) => {
  const rect = svgElement("rect", { x, y, width, height, rx: 2.5, class: className });
  svg.append(rect);
  return rect;
};

const renderEqualBands = (svg) => {
  const widths = [28, 28, 28, 28, 28];
  let x = 10;
  widths.forEach((width, index) => {
    addRect(svg, x, 28, width, 56, `model-vignette__band model-vignette__band--${index}`);
    x += width + 5;
  });
  addLine(svg, 10, 96, 170, 96, "model-vignette__baseline");
};

const renderExpandedBand = (svg, activeIndex = 1) => {
  const widths = [22, 54, 25, 25, 22];
  let x = 8;
  widths.forEach((width, index) => {
    const active = index === activeIndex ? " model-vignette__band--active" : "";
    addRect(svg, x, 28, width, 56, `model-vignette__band${active}`);
    x += width + 4;
  });
  addLine(svg, 8, 96, 176, 96, "model-vignette__baseline");
  addLine(svg, 42, 20, 94, 20, "model-vignette__measure");
  addLine(svg, 42, 16, 42, 24, "model-vignette__measure");
  addLine(svg, 94, 16, 94, 24, "model-vignette__measure");
};

const renderRibbon = (svg, activeIndex = 2) => {
  addLine(svg, 12, 60, 176, 60, "model-vignette__axis");
  const positions = [16, 42, 68, 94, 120, 146, 172];
  positions.forEach((x, index) => {
    const active = index === activeIndex;
    addCircle(svg, x, 60, active ? 8 : 4.5,
      active ? "model-vignette__node model-vignette__node--active" : "model-vignette__node");
  });
  addLine(svg, 68, 82, 68, 96, "model-vignette__focus-mark");
};

const renderFisheye = (svg, activeIndex = 3) => {
  addLine(svg, 12, 60, 176, 60, "model-vignette__axis");
  const positions = [16, 36, 62, 94, 126, 152, 172];
  const radii = [3.5, 4.5, 6.5, 10, 6.5, 4.5, 3.5];
  positions.forEach((x, index) => {
    const active = index === activeIndex;
    addCircle(svg, x, 60, radii[index],
      active ? "model-vignette__node model-vignette__node--active" : "model-vignette__node");
  });
  addLine(svg, 94, 24, 94, 44, "model-vignette__focus-mark");
  addLine(svg, 82, 28, 106, 28, "model-vignette__measure");
};

const renderScene = (vignette) => {
  const svg = svgElement("svg", {
    viewBox: "0 0 188 112",
    preserveAspectRatio: "xMidYMid meet",
    class: "model-vignette__svg",
    "aria-hidden": "true",
    focusable: "false",
  });
  const frame = addRect(svg, 2, 2, 184, 108, "model-vignette__frame");
  frame.setAttribute("rx", "6");

  switch (vignette.type) {
    case "equal-bands":
      renderEqualBands(svg);
      break;
    case "expanded-band":
      renderExpandedBand(svg, vignette.activeIndex);
      break;
    case "ribbon-sequence":
      renderRibbon(svg, vignette.activeIndex);
      break;
    case "fisheye-axis":
      renderFisheye(svg, vignette.activeIndex);
      break;
    default:
      throw new Error(`Unknown model vignette type: ${vignette.type}`);
  }
  return svg;
};

export const createModelConceptVignette = ({ root }) => {
  const render = ({ presentation, sectionId, preview = false }) => {
    const sectionPresentation = presentation?.sections?.[sectionId];
    if (!presentation || !sectionPresentation) {
      root.hidden = true;
      root.replaceChildren();
      delete root.dataset.vignetteType;
      delete root.dataset.preview;
      return;
    }
    root.hidden = false;
    root.dataset.vignetteType = sectionPresentation.vignette.type;
    root.dataset.preview = String(preview);
    root.replaceChildren(renderScene(sectionPresentation.vignette));
  };

  return { render };
};
