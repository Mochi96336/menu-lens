const SVG_NS = "http://www.w3.org/2000/svg";

const svgElement = (name, attributes = {}) => {
  const element = typeof document.createElementNS === "function"
    ? document.createElementNS(SVG_NS, name)
    : document.createElement(name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
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

const addRect = (svg, x, y, width, height, className, radius = 2.5) => {
  const rect = svgElement("rect", { x, y, width, height, rx: radius, class: className });
  svg.append(rect);
  return rect;
};

const addPath = (svg, d, className) => {
  const path = svgElement("path", { d, class: className });
  svg.append(path);
  return path;
};

const drawPaperGrid = (svg, { x = 18, y = 20, width = 152, height = 76, columns = [1, 1, 1] } = {}) => {
  addRect(svg, x, y, width, height, "model-vignette__paper", 1.5);
  const total = columns.reduce((sum, value) => sum + value, 0);
  let cursor = x;
  for (let index = 0; index < columns.length - 1; index += 1) {
    cursor += width * (columns[index] / total);
    addLine(svg, cursor, y, cursor, y + height, "model-vignette__grid");
  }
  addLine(svg, x, y + height / 2, x + width, y + height / 2, "model-vignette__grid");
};

const renderDocument = (svg, variant) => {
  addRect(svg, 30, 12, 128, 88, "model-vignette__paper", 2);
  const dense = variant === "density";
  const gap = dense ? 7 : 12;
  const count = dense ? 10 : 6;
  for (let index = 0; index < count; index += 1) {
    const y = 24 + index * gap;
    const category = index === 0 || index === Math.floor(count / 2);
    addLine(svg, 42, y, category ? 144 : 132, y,
      category ? "model-vignette__ink model-vignette__ink--strong" : "model-vignette__ink");
    if (!category) addLine(svg, 136, y, 146, y, "model-vignette__faint");
  }
  if (dense) {
    addRect(svg, 38, 80, 112, 12, "model-vignette__active-area", 1.5);
    addLine(svg, 44, 86, 116, 86, "model-vignette__accent");
  } else {
    addLine(svg, 42, 94, 92, 94, "model-vignette__accent");
  }
};

const renderHorizontal = (svg, vignette) => {
  if (vignette.variant === "baseline" || vignette.variant === "spread") {
    const activeIndex = Number(vignette.activeIndex ?? 1);
    const expansion = Number(vignette.expansion ?? 1.8);
    const totalWidth = 164;
    const gap = 4;
    const itemCount = 5;
    const available = totalWidth - gap * (itemCount - 1);
    const base = available / itemCount;
    const activeWidth = vignette.variant === "spread" ? base * expansion : base;
    const remaining = (available - activeWidth) / (itemCount - 1);
    const widths = Array.from({ length: itemCount }, (_, index) => index === activeIndex ? activeWidth : remaining);
    let x = 12;
    widths.forEach((width, index) => {
      addRect(svg, x, 26, width, 58,
        index === activeIndex && vignette.variant === "spread"
          ? "model-vignette__band model-vignette__band--active"
          : "model-vignette__band");
      x += width + gap;
    });
    addLine(svg, 12, 96, 176, 96, "model-vignette__baseline");
    if (vignette.variant === "spread") {
      const start = 12 + widths.slice(0, activeIndex).reduce((sum, width) => sum + width + gap, 0);
      addLine(svg, start, 18, start + activeWidth, 18, "model-vignette__accent");
      addLine(svg, start, 14, start, 22, "model-vignette__accent");
      addLine(svg, start + activeWidth, 14, start + activeWidth, 22, "model-vignette__accent");
    }
    return;
  }

  addLine(svg, 12, 60, 176, 60, "model-vignette__axis");
  const activeIndex = Number(vignette.activeIndex ?? 3);
  if (vignette.variant === "ribbon") {
    const positions = [16, 42, 68, 94, 120, 146, 172];
    positions.forEach((x, index) => addCircle(svg, x, 60, index === activeIndex ? 8 : 4.5,
      index === activeIndex ? "model-vignette__node model-vignette__node--active" : "model-vignette__node"));
    addLine(svg, positions[activeIndex], 82, positions[activeIndex], 98, "model-vignette__accent");
    return;
  }

  const falloff = Math.min(.95, Math.max(.2, Number(vignette.falloff ?? .58)));
  const radii = Array.from({ length: 7 }, (_, index) => 3 + 7 * Math.pow(falloff, Math.abs(index - activeIndex)));
  const gaps = Array.from({ length: 6 }, (_, index) => 16 + (radii[index] + radii[index + 1]) * .7);
  const used = gaps.reduce((sum, gap) => sum + gap, 0);
  const scale = 156 / used;
  const positions = [16];
  gaps.forEach((gap) => positions.push(positions.at(-1) + gap * scale));
  positions.forEach((x, index) => addCircle(svg, x, 60, radii[index],
    index === activeIndex ? "model-vignette__node model-vignette__node--active" : "model-vignette__node"));
  addLine(svg, positions[activeIndex], 22, positions[activeIndex], 42, "model-vignette__accent");
  addLine(svg, positions[activeIndex] - 12, 27, positions[activeIndex] + 12, 27, "model-vignette__accent");
};

const renderPaperField = (svg, variant) => {
  if (variant === "elastic") drawPaperGrid(svg, { columns: [1, 1.7, .85] });
  else drawPaperGrid(svg);

  if (variant === "semantic") {
    [[28, 34], [79, 34], [130, 34], [28, 72], [79, 72], [130, 72]].forEach(([x, y], index) => {
      addLine(svg, x, y, x + (index % 2 ? 22 : 30), y, "model-vignette__ink");
      addLine(svg, x, y + 7, x + 17, y + 7, "model-vignette__faint");
    });
    addRect(svg, 73, 58, 42, 28, "model-vignette__active-area", 2);
    return;
  }
  if (variant === "stopped") {
    addCircle(svg, 94, 58, 24, "model-vignette__lens");
    addLine(svg, 78, 58, 110, 58, "model-vignette__accent");
    addLine(svg, 118, 38, 118, 82, "model-vignette__stop");
    addLine(svg, 122, 43, 132, 53, "model-vignette__stop");
    addLine(svg, 132, 43, 122, 53, "model-vignette__stop");
    return;
  }
  addRect(svg, 66, 20, 72, 38, "model-vignette__active-area", 2);
  addLine(svg, 75, 38, 124, 38, "model-vignette__accent");
  addCircle(svg, 102, 39, 6, "model-vignette__node model-vignette__node--active");
};

const renderLandscape = (svg, variant) => {
  const columns = variant === "core" ? [1.4, 1, .6] : [1, 1, 1];
  drawPaperGrid(svg, { x: 14, y: 18, width: 160, height: 80, columns });
  if (variant === "grammar") {
    addPath(svg, "M 30 38 H 82 V 76 H 144", "model-vignette__path");
    addCircle(svg, 30, 38, 4, "model-vignette__node model-vignette__node--active");
    addCircle(svg, 144, 76, 4, "model-vignette__node");
  } else if (variant === "focus") {
    addRect(svg, 68, 18, 62, 48, "model-vignette__active-area", 1.5);
    addLine(svg, 78, 42, 118, 42, "model-vignette__accent");
  } else if (variant === "surface") {
    addRect(svg, 62, 32, 66, 50, "model-vignette__window", 2);
    addLine(svg, 72, 48, 116, 48, "model-vignette__ink");
    addLine(svg, 72, 59, 108, 59, "model-vignette__ink");
    addLine(svg, 72, 70, 98, 70, "model-vignette__faint");
  } else if (variant === "vertical") {
    [38, 52, 92, 106, 146, 160].forEach((x, index) => {
      addLine(svg, x, index % 2 ? 42 : 30, x, index % 2 ? 82 : 70, "model-vignette__ink");
    });
    addLine(svg, 28, 88, 158, 88, "model-vignette__accent");
  } else if (variant === "stopped") {
    addPath(svg, "M 30 38 H 82 V 76 H 122", "model-vignette__path");
    addLine(svg, 124, 62, 124, 90, "model-vignette__stop");
    addLine(svg, 132, 68, 144, 80, "model-vignette__stop");
    addLine(svg, 144, 68, 132, 80, "model-vignette__stop");
  } else {
    addLine(svg, 26, 58, 162, 58, "model-vignette__accent");
  }
};

const renderScale = (svg, variant) => {
  const widths = [18, 18, 68, 18, 18];
  let x = 14;
  widths.forEach((width, index) => {
    addRect(svg, x, 34, width, 46,
      index === 2 ? "model-vignette__band model-vignette__band--active" : "model-vignette__band");
    x += width + 5;
  });
  addLine(svg, 14, 92, 174, 92, "model-vignette__baseline");
  if (variant === "continuity") {
    addPath(svg, "M 108 24 C 82 8, 48 10, 30 28", "model-vignette__path model-vignette__path--accent");
    addLine(svg, 27, 23, 30, 28, "model-vignette__accent");
    addLine(svg, 35, 27, 30, 28, "model-vignette__accent");
    addRect(svg, 116, 16, 58, 12, "model-vignette__status", 2);
  }
};

const renderDepth = (svg, variant) => {
  if (variant === "reset") {
    [[30, 24], [42, 36], [54, 48]].forEach(([x, y], index) => {
      addRect(svg, x, y, 104, 48,
        index === 2 ? "model-vignette__plane model-vignette__plane--active" : "model-vignette__plane", 2);
    });
    addLine(svg, 54, 98, 158, 98, "model-vignette__baseline");
    return;
  }
  if (variant === "projection") {
    addLine(svg, 26, 88, 164, 88, "model-vignette__axis");
    const points = [[42, 34], [78, 50], [112, 28], [148, 58]];
    points.forEach(([x, y], index) => {
      addCircle(svg, x, y, index === 2 ? 7 : 4.5,
        index === 2 ? "model-vignette__node model-vignette__node--active" : "model-vignette__node");
      addLine(svg, x, y + 6, x, 88, index === 2 ? "model-vignette__accent" : "model-vignette__faint");
    });
    return;
  }
  [[28, 28], [42, 40], [56, 52]].forEach(([x, y], index) => {
    addRect(svg, x, y, 104, 42,
      index === 2 ? "model-vignette__plane model-vignette__plane--active" : "model-vignette__plane", 2);
  });
  addPath(svg, "M 148 28 C 172 40, 172 74, 146 94", "model-vignette__path model-vignette__path--accent");
  addLine(svg, 138, 94, 146, 94, "model-vignette__accent");
  addLine(svg, 144, 86, 146, 94, "model-vignette__accent");
};

const renderScene = (vignette) => {
  const svg = svgElement("svg", {
    viewBox: "0 0 188 112",
    preserveAspectRatio: "xMidYMid meet",
    class: "model-vignette__svg",
    "aria-hidden": "true",
    focusable: "false",
  });
  addRect(svg, 2, 2, 184, 108, "model-vignette__frame", 6);

  switch (vignette.type) {
    case "document": renderDocument(svg, vignette.variant); break;
    case "horizontal": renderHorizontal(svg, vignette); break;
    case "paper-field": renderPaperField(svg, vignette.variant); break;
    case "landscape": renderLandscape(svg, vignette.variant); break;
    case "scale": renderScale(svg, vignette.variant); break;
    case "depth": renderDepth(svg, vignette.variant); break;
    default: throw new Error(`Unknown model vignette type: ${vignette.type}`);
  }
  return svg;
};

export const createModelConceptVignette = ({
  root,
  signature = document.querySelector?.("#model-diagram-signature") ?? null,
}) => {
  const render = ({ presentation, sectionId, preview = false }) => {
    const sectionPresentation = presentation?.sections?.[sectionId];
    if (!presentation || !sectionPresentation) {
      root.hidden = true;
      root.replaceChildren();
      if (signature) signature.textContent = "";
      delete root.dataset.vignetteType;
      delete root.dataset.vignetteVariant;
      delete root.dataset.preview;
      return;
    }
    root.hidden = false;
    if (signature) signature.textContent = sectionPresentation.conceptLabel;
    root.dataset.vignetteType = sectionPresentation.vignette.type;
    root.dataset.vignetteVariant = sectionPresentation.vignette.variant;
    root.dataset.preview = String(preview);
    root.replaceChildren(renderScene(sectionPresentation.vignette));
  };

  return { render };
};
