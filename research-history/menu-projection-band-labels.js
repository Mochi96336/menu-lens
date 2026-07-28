(() => {
  const projectionOrder = ["price-serving", "price-preparation", "serving-preparation"];
  const semanticDefinitions = {
    "price-serving": { x: "price", y: "serving", depth: "preparation" },
    "price-preparation": { x: "price", y: "preparation", depth: "serving" },
    "serving-preparation": { x: "serving", y: "preparation", depth: "price" },
  };
  const semanticBands = {
    price: {
      name: "價格",
      labels: ["NT$120–229", "NT$230–339", "NT$340–449", "NT$450–560"],
      bounds: [-.48, ((230 - 120) / 440 - .5) * .88, ((340 - 120) / 440 - .5) * .88, ((450 - 120) / 440 - .5) * .88, .48],
    },
    serving: { name: "份量", labels: ["小份", "單份", "分享"], bounds: [-.48, -.22, .22, .48] },
    preparation: { name: "時間", labels: ["較快", "一般", "較慢", "未標註"], bounds: [-.48, -.29, .01, .3, .48] },
  };
  const coordinateKey = { price: "x", serving: "y", preparation: "z" };
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

  const project = (vector, quaternion) => {
    const rotated = rotateVector(vector, quaternion);
    const depthScale = 1 + rotated.z * .12;
    return {
      x: 50 + rotated.x * 72 * depthScale,
      y: 50 - rotated.y * 72 * depthScale,
    };
  };

  const bandCenters = (definition) => definition.bounds.slice(0, -1).map((bound, index) => (bound + definition.bounds[index + 1]) / 2);

  document.addEventListener("DOMContentLoaded", () => {
    const labelRoot = document.querySelector("#projection-volume-band-labels");
    const summary = document.querySelector("#projection-band-summary");
    const controls = [...document.querySelectorAll("[data-projection]")];
    if (!labelRoot || !summary || controls.length !== projectionOrder.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let activeProjection = controls.find((control) => control.getAttribute("aria-pressed") === "true")?.dataset.projection ?? projectionOrder[0];
    let currentQuaternion = viewQuaternions[activeProjection];
    let animationFrame = null;
    let labelNodes = [];

    const svgText = (className, text) => {
      const node = document.createElementNS(svgNamespace, "text");
      node.setAttribute("class", className);
      node.textContent = text;
      return node;
    };

    const pointFor = (semantic, role, value) => {
      const point = { x: -.48, y: -.48, z: -.48 };
      if (role === "x") {
        point[coordinateKey[semantic.x]] = value;
        point[coordinateKey[semantic.y]] = -.43;
      } else {
        point[coordinateKey[semantic.x]] = -.43;
        point[coordinateKey[semantic.y]] = value;
      }
      return point;
    };

    const rebuildLabels = () => {
      labelRoot.replaceChildren();
      labelNodes = [];
      const semantic = semanticDefinitions[activeProjection];
      const xBands = semanticBands[semantic.x];
      const yBands = semanticBands[semantic.y];
      bandCenters(xBands).forEach((center, index) => {
        const node = svgText(`projection-band-label projection-band-label--x projection-band-label--${semantic.x}`, xBands.labels[index]);
        node.dataset.axisRole = "x";
        node.dataset.bandValue = String(center);
        node.setAttribute("text-anchor", "middle");
        labelRoot.append(node);
        labelNodes.push({ node, role: "x", value: center });
      });
      bandCenters(yBands).forEach((center, index) => {
        const node = svgText(`projection-band-label projection-band-label--y projection-band-label--${semantic.y}`, yBands.labels[index]);
        node.dataset.axisRole = "y";
        node.dataset.bandValue = String(center);
        node.setAttribute("text-anchor", "start");
        labelRoot.append(node);
        labelNodes.push({ node, role: "y", value: center });
      });
      const depthBands = semanticBands[semantic.depth];
      summary.replaceChildren();
      [
        { prefix: `X · ${xBands.name}`, labels: xBands.labels },
        { prefix: `Y · ${yBands.name}`, labels: yBands.labels },
        { prefix: `深度 · ${depthBands.name}`, labels: depthBands.labels },
      ].forEach((entry) => {
        const row = document.createElement("span");
        row.className = "projection-band-summary__row";
        const heading = document.createElement("strong");
        heading.textContent = entry.prefix;
        const values = document.createElement("i");
        values.textContent = entry.labels.join(" · ");
        row.append(heading, values);
        summary.append(row);
      });
      summary.setAttribute(
        "aria-label",
        `${xBands.name}分帶：${xBands.labels.join("、")}。${yBands.name}分帶：${yBands.labels.join("、")}。深度${depthBands.name}分帶：${depthBands.labels.join("、")}。`,
      );
    };

    const render = (quaternion) => {
      const semantic = semanticDefinitions[activeProjection];
      labelNodes.forEach(({ node, role, value }) => {
        const position = project(pointFor(semantic, role, value), quaternion);
        node.setAttribute("x", position.x.toFixed(2));
        node.setAttribute("y", position.y.toFixed(2));
      });
    };

    const moveToProjection = (nextProjection) => {
      if (!semanticDefinitions[nextProjection] || nextProjection === activeProjection) return;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      const start = currentQuaternion;
      const target = viewQuaternions[nextProjection];
      activeProjection = nextProjection;
      rebuildLabels();
      if (reducedMotion) {
        currentQuaternion = target;
        render(currentQuaternion);
        return;
      }
      const startedAt = performance.now();
      const duration = 620;
      const animate = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        currentQuaternion = slerp(start, target, eased);
        render(currentQuaternion);
        if (progress < 1) animationFrame = requestAnimationFrame(animate);
        else animationFrame = null;
      };
      animationFrame = requestAnimationFrame(animate);
    };

    const observer = new MutationObserver(() => {
      const pressed = controls.find((control) => control.getAttribute("aria-pressed") === "true");
      if (pressed) moveToProjection(pressed.dataset.projection);
    });
    controls.forEach((control) => observer.observe(control, { attributes: true, attributeFilter: ["aria-pressed"] }));

    rebuildLabels();
    render(currentQuaternion);
  });
})();

(() => {
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  document.addEventListener("DOMContentLoaded", () => {
    const field = document.querySelector("#projection-field");
    const focusCard = document.querySelector("#projection-focus-card");
    const nodeLayer = document.querySelector("#projection-node-layer");
    const controls = [...document.querySelectorAll("[data-projection]")];
    if (!field || !focusCard || !nodeLayer || controls.length !== 3) return;

    focusCard.tabIndex = 0;
    focusCard.setAttribute("aria-label", "目前語意格的料理列表；內容較長時可上下捲動");

    let trackingFrame = null;
    let trackingUntil = 0;

    const layoutFocusCard = () => {
      if (focusCard.dataset.open !== "true") return;
      const fieldRect = field.getBoundingClientRect();
      if (!fieldRect.width || !fieldRect.height) return;

      const inset = 6;
      const gap = 14;
      focusCard.style.maxWidth = `${Math.max(120, fieldRect.width - inset * 2)}px`;
      focusCard.style.maxHeight = `${Math.max(96, fieldRect.height - inset * 2)}px`;

      const cardWidth = focusCard.offsetWidth;
      const cardHeight = focusCard.offsetHeight;
      const anchorPercentX = Number.parseFloat(focusCard.style.left) || 50;
      const anchorPercentY = Number.parseFloat(focusCard.style.top) || 50;
      const anchorX = fieldRect.left + fieldRect.width * anchorPercentX / 100;
      const anchorY = fieldRect.top + fieldRect.height * anchorPercentY / 100;
      const roomRight = fieldRect.right - inset - anchorX;
      const roomLeft = anchorX - fieldRect.left - inset;
      const layoutSide = roomRight >= cardWidth + gap
        ? "right"
        : roomLeft >= cardWidth + gap
          ? "left"
          : roomRight >= roomLeft ? "right" : "left";

      const naturalLeft = layoutSide === "right"
        ? anchorX + gap
        : anchorX - gap - cardWidth;
      const naturalTop = anchorY - cardHeight / 2;
      const minimumLeft = fieldRect.left + inset;
      const maximumLeft = Math.max(minimumLeft, fieldRect.right - inset - cardWidth);
      const minimumTop = fieldRect.top + inset;
      const maximumTop = Math.max(minimumTop, fieldRect.bottom - inset - cardHeight);
      const finalLeft = clamp(naturalLeft, minimumLeft, maximumLeft);
      const finalTop = clamp(naturalTop, minimumTop, maximumTop);
      const pointerY = clamp(anchorY - finalTop, 10, Math.max(10, cardHeight - 10));

      focusCard.dataset.layoutSide = layoutSide;
      focusCard.style.setProperty("--focus-clamp-x", `${finalLeft - naturalLeft}px`);
      focusCard.style.setProperty("--focus-clamp-y", `${finalTop - naturalTop}px`);
      focusCard.style.setProperty("--focus-pointer-y", `${pointerY}px`);
    };

    const trackFor = (duration) => {
      trackingUntil = Math.max(trackingUntil, performance.now() + duration);
      if (trackingFrame) return;
      const tick = (now) => {
        layoutFocusCard();
        if (now < trackingUntil) trackingFrame = requestAnimationFrame(tick);
        else trackingFrame = null;
      };
      trackingFrame = requestAnimationFrame(tick);
    };

    nodeLayer.addEventListener("click", () => trackFor(140));
    controls.forEach((control) => control.addEventListener("click", () => trackFor(700)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") trackFor(80);
    });
    window.addEventListener("resize", () => trackFor(160));

    new MutationObserver(() => trackFor(140)).observe(focusCard, {
      attributes: true,
      attributeFilter: ["data-open"],
      childList: true,
      subtree: true,
    });

    if (globalThis.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => trackFor(120));
      resizeObserver.observe(field);
      resizeObserver.observe(focusCard);
    }
  });
})();
