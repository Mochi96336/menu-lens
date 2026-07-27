(() => {
  const categoryColors = ["#b85b3e", "#b98738", "#6f8758", "#4e8290", "#6d6e9d", "#9a6688"];
  const projectionOrder = ["price-serving", "price-preparation", "serving-preparation"];
  const projectionDefinitions = {
    "price-serving": { title: "價格 × 份量", depth: "準備時間" },
    "price-preparation": { title: "價格 × 時間", depth: "份量" },
    "serving-preparation": { title: "份量 × 時間", depth: "價格" },
  };
  const semanticDefinitions = {
    "price-serving": { x: "price", y: "serving", plane: "xy" },
    "price-preparation": { x: "price", y: "preparation", plane: "xz" },
    "serving-preparation": { x: "serving", y: "preparation", plane: "yz" },
  };
  const semanticBands = {
    price: {
      labels: ["120–229", "230–339", "340–449", "450–560"],
      bounds: [-.48, ((230 - 120) / 440 - .5) * .88, ((340 - 120) / 440 - .5) * .88, ((450 - 120) / 440 - .5) * .88, .48],
    },
    serving: { labels: ["小份", "單份", "分享"], bounds: [-.48, -.22, .22, .48] },
    preparation: { labels: ["較快", "一般", "較慢", "未標註"], bounds: [-.48, -.29, .01, .3, .48] },
  };
  const svgNamespace = "http://www.w3.org/2000/svg";
  const radians = (degrees) => degrees * Math.PI / 180;

  const multiplyMatrix = (left, right) => {
    const result = Array(9).fill(0);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        for (let index = 0; index < 3; index += 1) result[row * 3 + column] += left[row * 3 + index] * right[index * 3 + column];
      }
    }
    return result;
  };

  const rotateX = (angle) => {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [1, 0, 0, 0, cosine, -sine, 0, sine, cosine];
  };

  const rotateY = (angle) => {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return [cosine, 0, sine, 0, 1, 0, -sine, 0, cosine];
  };

  const quaternionFromMatrix = (matrix) => {
    const trace = matrix[0] + matrix[4] + matrix[8];
    let x;
    let y;
    let z;
    let w;
    if (trace > 0) {
      const scale = Math.sqrt(trace + 1) * 2;
      w = .25 * scale;
      x = (matrix[7] - matrix[5]) / scale;
      y = (matrix[2] - matrix[6]) / scale;
      z = (matrix[3] - matrix[1]) / scale;
    } else if (matrix[0] > matrix[4] && matrix[0] > matrix[8]) {
      const scale = Math.sqrt(1 + matrix[0] - matrix[4] - matrix[8]) * 2;
      w = (matrix[7] - matrix[5]) / scale;
      x = .25 * scale;
      y = (matrix[1] + matrix[3]) / scale;
      z = (matrix[2] + matrix[6]) / scale;
    } else if (matrix[4] > matrix[8]) {
      const scale = Math.sqrt(1 + matrix[4] - matrix[0] - matrix[8]) * 2;
      w = (matrix[2] - matrix[6]) / scale;
      x = (matrix[1] + matrix[3]) / scale;
      y = .25 * scale;
      z = (matrix[5] + matrix[7]) / scale;
    } else {
      const scale = Math.sqrt(1 + matrix[8] - matrix[0] - matrix[4]) * 2;
      w = (matrix[3] - matrix[1]) / scale;
      x = (matrix[2] + matrix[6]) / scale;
      y = (matrix[5] + matrix[7]) / scale;
      z = .25 * scale;
    }
    const length = Math.hypot(x, y, z, w);
    return { x: x / length, y: y / length, z: z / length, w: w / length };
  };

  const slerp = (start, end, amount) => {
    let target = end;
    let cosine = start.x * end.x + start.y * end.y + start.z * end.z + start.w * end.w;
    if (cosine < 0) {
      cosine = -cosine;
      target = { x: -end.x, y: -end.y, z: -end.z, w: -end.w };
    }
    if (cosine > .9995) {
      const value = {
        x: start.x + amount * (target.x - start.x),
        y: start.y + amount * (target.y - start.y),
        z: start.z + amount * (target.z - start.z),
        w: start.w + amount * (target.w - start.w),
      };
      const length = Math.hypot(value.x, value.y, value.z, value.w);
      return { x: value.x / length, y: value.y / length, z: value.z / length, w: value.w / length };
    }
    const angle = Math.acos(cosine);
    const sine = Math.sin(angle);
    const first = Math.sin((1 - amount) * angle) / sine;
    const second = Math.sin(amount * angle) / sine;
    return {
      x: start.x * first + target.x * second,
      y: start.y * first + target.y * second,
      z: start.z * first + target.z * second,
      w: start.w * first + target.w * second,
    };
  };

  const rotateVector = (vector, quaternion) => {
    const { x, y, z, w } = quaternion;
    const ix = w * vector.x + y * vector.z - z * vector.y;
    const iy = w * vector.y + z * vector.x - x * vector.z;
    const iz = w * vector.z + x * vector.y - y * vector.x;
    const iw = -x * vector.x - y * vector.y - z * vector.z;
    return {
      x: ix * w + iw * -x + iy * -z - iz * -y,
      y: iy * w + iw * -y + iz * -x - ix * -z,
      z: iz * w + iw * -z + ix * -y - iy * -x,
    };
  };

  const tilt = multiplyMatrix(rotateY(radians(11)), rotateX(radians(-9)));
  const viewMatrices = {
    "price-serving": multiplyMatrix(tilt, [1, 0, 0, 0, 1, 0, 0, 0, 1]),
    "price-preparation": multiplyMatrix(tilt, rotateX(radians(-90))),
    "serving-preparation": multiplyMatrix(tilt, [0, 1, 0, 0, 0, 1, 1, 0, 0]),
  };
  const viewQuaternions = Object.fromEntries(Object.entries(viewMatrices).map(([key, matrix]) => [key, quaternionFromMatrix(matrix)]));

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const svgElement = (tag, className) => {
    const node = document.createElementNS(svgNamespace, tag);
    if (className) node.setAttribute("class", className);
    return node;
  };

  const servingCoordinate = (product) => {
    if (product.portion?.value === 0) return { value: -.44, index: 0, label: "小份" };
    if (product.portion?.value === 1) return { value: 0, index: 1, label: product.portion?.label ?? "單份" };
    return { value: .44, index: 2, label: product.portion?.label ?? "分享" };
  };

  const preparationCoordinate = (product) => {
    if (product.preparation?.value === 0) return { value: -.44, index: 0, label: "較快" };
    if (product.preparation?.value === 1) return { value: -.14, index: 1, label: "一般" };
    if (product.preparation?.value === 2) return { value: .16, index: 2, label: "較慢" };
    return { value: .44, index: 3, label: "未標註" };
  };

  const priceBandIndex = (price) => price < 230 ? 0 : price < 340 ? 1 : price < 450 ? 2 : 3;

  const modelProducts = (menu) => {
    const categoryIndex = new Map(menu.categories.map((category, index) => [category.id, index]));
    const items = menu.products.map((product, index) => ({
      product,
      index,
      categoryIndex: categoryIndex.get(product.categoryId),
      coordinates: {
        x: ((product.price - 120) / 440 - .5) * .88,
        y: servingCoordinate(product).value,
        z: preparationCoordinate(product).value,
      },
      bands: {
        price: priceBandIndex(product.price),
        serving: servingCoordinate(product).index,
        preparation: preparationCoordinate(product).index,
      },
      labels: {
        price: `NT$${product.price}`,
        serving: servingCoordinate(product).label,
        preparation: preparationCoordinate(product).label,
      },
      nudge: { x: 0, y: 0 },
    }));
    const exactGroups = new Map();
    items.forEach((item) => {
      const key = `${item.coordinates.x.toFixed(4)}:${item.coordinates.y}:${item.coordinates.z}`;
      if (!exactGroups.has(key)) exactGroups.set(key, []);
      exactGroups.get(key).push(item);
    });
    exactGroups.forEach((group) => {
      if (group.length < 2) return;
      group.forEach((item, index) => {
        item.nudge = { x: 0, y: (index - (group.length - 1) / 2) * 1.6 };
      });
    });
    return items;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const menu = window.menuLensResearchMenu;
    if (!menu) throw new Error("Menu Projections requires menu-fixture.js.");
    const items = modelProducts(menu);
    const nodeById = new Map();
    const nodeLayer = document.querySelector("#projection-node-layer");
    const controls = [...document.querySelectorAll("[data-projection]")];
    const statusTitle = document.querySelector("#projection-status-title");
    const statusMeta = document.querySelector("#projection-status-meta");
    const depthAxis = document.querySelector("#projection-depth-axis");
    const focusCard = document.querySelector("#projection-focus-card");
    const gridRoot = document.querySelector("#projection-volume-grids");
    const cellHighlight = document.querySelector("#projection-cell-highlight");
    const edgeRoot = document.querySelector("#projection-volume-edges");
    const axisRoot = document.querySelector("#projection-volume-axes");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let activeProjection = projectionOrder[0];
    let anchorProductId = null;
    let focusedProductIds = [];
    let currentQuaternion = viewQuaternions[activeProjection];
    let animationFrame = null;
    const renderedPositionById = new Map();

    document.querySelector("#projection-restaurant-name").textContent = menu.restaurant.name;
    document.querySelector("#projection-restaurant-summary").textContent = menu.restaurant.summary;

    const legend = document.querySelector("#projection-category-legend");
    menu.categories.forEach((category, index) => {
      const item = element("span");
      const dot = element("i");
      dot.style.setProperty("--category-color", categoryColors[index]);
      item.append(dot, document.createTextNode(category.name));
      legend.append(item);
    });

    items.forEach((item) => {
      const button = element("button", "projection-node");
      button.type = "button";
      button.dataset.productId = item.product.id;
      button.dataset.availability = item.product.availability;
      button.style.setProperty("--category-color", categoryColors[item.categoryIndex]);
      button.setAttribute("aria-label", `${item.product.name}，${item.labels.price}，${item.labels.serving}，${item.labels.preparation}`);
      button.append(
        element("i", "projection-node__dot"),
        element("strong", "projection-node__name", item.product.name),
        element("em", "projection-node__price", `${item.labels.price}${item.product.availability === "sold_out" ? " · 售完" : ""}`),
      );
      button.addEventListener("click", () => focusSemanticCell(item.product.id));
      nodeLayer.append(button);
      nodeById.set(item.product.id, button);
    });

    function focusSemanticCell(productId, shouldRender = true) {
      anchorProductId = productId;
      const anchor = items.find((candidate) => candidate.product.id === anchorProductId);
      const semantic = semanticDefinitions[activeProjection];
      focusedProductIds = items
        .filter((candidate) => candidate.bands[semantic.x] === anchor.bands[semantic.x] && candidate.bands[semantic.y] === anchor.bands[semantic.y])
        .map((candidate) => candidate.product.id);
      nodeById.forEach((node, id) => {
        const selected = focusedProductIds.includes(id);
        node.dataset.selected = String(selected);
        node.setAttribute("aria-pressed", String(selected));
      });
      focusCard.replaceChildren();
      const heading = element("b", "projection-focus-card__heading", `${semanticBands[semantic.x].labels[anchor.bands[semantic.x]]} × ${semanticBands[semantic.y].labels[anchor.bands[semantic.y]]} · ${focusedProductIds.length} 道`);
      focusCard.append(heading);
      focusedProductIds.forEach((focusedId) => {
        const focused = items.find((candidate) => candidate.product.id === focusedId);
        const row = element("span", "projection-focus-card__row");
        const dot = element("i");
        dot.style.setProperty("--category-color", categoryColors[focused.categoryIndex]);
        row.append(
          dot,
          element("strong", "", focused.product.name),
          element("em", "", `${focused.labels.price}${focused.product.availability === "sold_out" ? " · 售完" : ""}`),
        );
        focusCard.append(row);
      });
      focusCard.dataset.open = "true";
      statusMeta.textContent = `${semanticBands[semantic.x].labels[anchor.bands[semantic.x]]} × ${semanticBands[semantic.y].labels[anchor.bands[semantic.y]]}`;
      if (shouldRender) renderFrame(currentQuaternion);
    }

    const corners = [];
    [-.48, .48].forEach((x) => [-.48, .48].forEach((y) => [-.48, .48].forEach((z) => corners.push({ x, y, z }))));
    const edgePairs = [];
    corners.forEach((corner, index) => {
      for (let axis = 0; axis < 3; axis += 1) {
        const values = [corner.x, corner.y, corner.z];
        if (values[axis] > 0) continue;
        values[axis] = .48;
        const otherIndex = corners.findIndex((candidate) => candidate.x === values[0] && candidate.y === values[1] && candidate.z === values[2]);
        edgePairs.push([index, otherIndex]);
      }
    });
    const edgeElements = edgePairs.map(() => {
      const line = svgElement("line", "projection-volume__edge");
      edgeRoot.append(line);
      return line;
    });
    const axisData = [
      { key: "x", label: "價格", end: { x: .62, y: -.48, z: -.48 } },
      { key: "y", label: "份量", end: { x: -.48, y: .62, z: -.48 } },
      { key: "z", label: "時間", end: { x: -.48, y: -.48, z: .62 } },
    ].map((axis) => {
      const line = svgElement("line", `projection-volume__axis projection-volume__axis--${axis.key}`);
      const label = svgElement("text", `projection-volume__label projection-volume__label--${axis.key}`);
      label.textContent = axis.label;
      axisRoot.append(line, label);
      return { ...axis, line, label };
    });

    const project = (vector, quaternion) => {
      const rotated = rotateVector(vector, quaternion);
      const depthScale = 1 + rotated.z * .12;
      return {
        x: 50 + rotated.x * 72 * depthScale,
        y: 50 - rotated.y * 72 * depthScale,
        z: rotated.z,
        scale: depthScale,
      };
    };

    const setLine = (line, start, end) => {
      line.setAttribute("x1", start.x.toFixed(2));
      line.setAttribute("y1", start.y.toFixed(2));
      line.setAttribute("x2", end.x.toFixed(2));
      line.setAttribute("y2", end.y.toFixed(2));
    };

    function renderFrame(quaternion) {
      edgePairs.forEach(([startIndex, endIndex], index) => setLine(edgeElements[index], project(corners[startIndex], quaternion), project(corners[endIndex], quaternion)));
      const axisOrigin = project({ x: -.48, y: -.48, z: -.48 }, quaternion);
      axisData.forEach((axis) => {
        const end = project(axis.end, quaternion);
        setLine(axis.line, axisOrigin, end);
        axis.label.setAttribute("x", end.x.toFixed(2));
        axis.label.setAttribute("y", end.y.toFixed(2));
      });
      items.forEach((item) => {
        const position = project(item.coordinates, quaternion);
        const node = nodeById.get(item.product.id);
        const left = position.x + item.nudge.x;
        const top = position.y + item.nudge.y;
        renderedPositionById.set(item.product.id, { x: left, y: top });
        node.style.left = `${left}%`;
        node.style.top = `${top}%`;
        node.style.zIndex = String(Math.round((position.z + 1) * 100));
        node.style.setProperty("--depth-scale", String(Math.max(.88, Math.min(1.12, position.scale))));
        node.style.opacity = String(Math.max(.58, Math.min(1, .78 + position.z * .3)));
      });
      if (focusedProductIds.length) {
        const positions = focusedProductIds.map((productId) => renderedPositionById.get(productId)).filter(Boolean);
        const anchor = positions.reduce((total, position) => ({ x: total.x + position.x / positions.length, y: total.y + position.y / positions.length }), { x: 0, y: 0 });
        focusCard.style.left = `${anchor.x}%`;
        focusCard.style.top = `${anchor.y}%`;
        focusCard.dataset.side = anchor.x > 55 ? "left" : "right";
      }
    }

    const setProjection = (nextProjection) => {
      if (!projectionDefinitions[nextProjection]) return;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      const start = currentQuaternion;
      const target = viewQuaternions[nextProjection];
      activeProjection = nextProjection;
      controls.forEach((control) => control.setAttribute("aria-pressed", String(control.dataset.projection === activeProjection)));
      statusTitle.textContent = projectionDefinitions[activeProjection].title;
      statusMeta.textContent = `深度：${projectionDefinitions[activeProjection].depth}`;
      depthAxis.textContent = projectionDefinitions[activeProjection].depth;
      if (reducedMotion) {
        currentQuaternion = target;
        renderFrame(currentQuaternion);
        return;
      }
      const startedAt = performance.now();
      const duration = 620;
      const animate = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        currentQuaternion = slerp(start, target, eased);
        renderFrame(currentQuaternion);
        if (progress < 1) animationFrame = requestAnimationFrame(animate);
        else animationFrame = null;
      };
      animationFrame = requestAnimationFrame(animate);
    };

    controls.forEach((control) => control.addEventListener("click", () => setProjection(control.dataset.projection)));
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !focusedProductIds.length) return;
      focusedProductIds = [];
      focusCard.dataset.open = "false";
      nodeById.forEach((node) => {
        node.dataset.selected = "false";
        node.setAttribute("aria-pressed", "false");
      });
    });
    renderFrame(currentQuaternion);
    setProjection(activeProjection);
  });
})();
