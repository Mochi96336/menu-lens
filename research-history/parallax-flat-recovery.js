(() => {
  const menu = window.menuLensResearchMenu;
  const stage = document.querySelector("#parallax-stage");
  const volume = document.querySelector("#parallax-volume");
  if (!menu || !stage || !volume) return;

  const categoryAnchors = [
    { x: 0, y: 0, color: "#95543d", pale: "#ead8cd" },
    { x: -27, y: 52, color: "#537357", pale: "#dce7d9" },
    { x: 29, y: 48, color: "#486a7c", pale: "#d8e4e8" },
    { x: -31, y: -49, color: "#8a6b38", pale: "#eadfca" },
    { x: 31, y: -47, color: "#785b79", pale: "#e5dce6" },
    { x: 54, y: 2, color: "#9a5b68", pale: "#ead9de" },
  ];
  const depthPattern = [-112, 74, -48, 108, 20, -86, 91, -18];
  const state = {
    viewX: 0,
    viewY: 0,
    spread: 0.58,
    currentIndex: 0,
    hasDragged: false,
    hasPinched: false,
    hasOpenedDetail: false,
  };
  const pointers = new Map();
  const fields = [];
  const productIndexById = new Map(menu.products.map((product, index) => [product.id, index]));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const number = new Intl.NumberFormat("zh-TW");
  let pinchStart = null;
  let lastPointer = null;
  let gestureMoved = false;
  let settleTimer = 0;
  let resetConfirmTimer = 0;
  let depthGuideTimer = 0;

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const productsFor = (categoryId) => menu.products.filter((product) => product.categoryId === categoryId);

  const createProduct = (product, productIndex, categoryIndex, count) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "parallax-product";
    item.dataset.productId = product.id;
    item.dataset.productIndex = String(productIndexById.get(product.id));
    item.dataset.categoryPosition = String(productIndex);
    item.setAttribute("aria-label", `${product.name}，NT$${product.price}${product.availability === "sold_out" ? "，售完" : ""}`);

    const columns = count <= 3 ? 1 : 2;
    const rows = Math.ceil(count / columns);
    const column = productIndex % columns;
    const row = Math.floor(productIndex / columns);
    const x = (column - (columns - 1) / 2) * 151;
    const y = (row - (rows - 1) / 2) * 51 + 8;
    const z = depthPattern[(productIndex + categoryIndex * 3) % depthPattern.length];
    const tiltX = ((productIndex + categoryIndex) % 3 - 1) * 4.2;
    const tiltY = ((productIndex * 2 + categoryIndex) % 5 - 2) * 3.1;
    Object.assign(item.dataset, { x, y, z, tiltX, tiltY });

    const name = document.createElement("span");
    name.className = "parallax-product__name";
    name.textContent = product.name;
    const price = document.createElement("strong");
    price.className = "parallax-product__price";
    price.textContent = product.availability === "sold_out" ? "售完" : number.format(product.price);
    item.append(name, price);
    return item;
  };

  menu.categories.forEach((category, categoryIndex) => {
    const anchor = categoryAnchors[categoryIndex];
    const products = productsFor(category.id);
    const field = document.createElement("section");
    field.className = "parallax-field";
    field.dataset.categoryIndex = String(categoryIndex);
    field.setAttribute("aria-label", `${category.name}，${products.length} 道料理`);
    field.style.setProperty("--category-color", anchor.color);
    field.style.setProperty("--category-pale", anchor.pale);
    field.style.transform = `rotateY(${anchor.y}deg) rotateX(${anchor.x}deg)`;

    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "parallax-category-tag";
    tag.dataset.categoryTarget = String(categoryIndex);
    tag.setAttribute("aria-label", `轉向${category.name}`);
    const index = document.createElement("span");
    index.textContent = String(categoryIndex + 1).padStart(2, "0");
    const title = document.createElement("strong");
    title.textContent = category.name;
    const count = document.createElement("small");
    count.textContent = `${products.length} 道`;
    tag.append(index, title, count);
    field.append(tag);

    products.forEach((product, productIndex) => {
      field.append(createProduct(product, productIndex, categoryIndex, products.length));
    });
    volume.append(field);
    fields.push({ element: field, tag, category, products, anchor });
  });

  document.querySelector("#parallax-restaurant-name").textContent = menu.restaurant.name;
  document.querySelector("#parallax-restaurant-meta").textContent = menu.restaurant.summary;

  const currentCategory = document.querySelector("#parallax-current-category");
  const alignmentLabel = document.querySelector("#parallax-alignment");
  const depthLabel = document.querySelector("#parallax-depth");
  const meterFill = document.querySelector("#parallax-meter-fill");
  const stateLabel = document.querySelector("#parallax-state-label");
  const gestureHint = document.querySelector(".parallax-gesture");
  const compass = document.querySelector("#parallax-compass");
  const compassMarkersRoot = document.querySelector("#parallax-compass-markers");
  const compassCursor = document.querySelector("#parallax-compass-cursor");
  const reticle = document.querySelector("#parallax-reticle");
  const depthGuide = document.querySelector("#parallax-depth-guide");
  const depthKnob = document.querySelector("#parallax-depth-knob");
  const detail = document.querySelector("#parallax-detail");
  const detailCategory = document.querySelector("#parallax-detail-category");
  const detailTitle = document.querySelector("#parallax-detail-title");
  const detailMeta = document.querySelector("#parallax-detail-meta");
  const detailCopy = document.querySelector("#parallax-detail-copy");
  const detailClose = document.querySelector("#parallax-detail-close");
  const resetButton = document.querySelector("#parallax-reset");
  const flatRecovery = document.querySelector("#parallax-flat-recovery");
  const flatRange = document.querySelector("#parallax-flat-range");
  const flatOutput = document.querySelector("#parallax-flat-output");
  if (!flatRecovery || !flatRange || !flatOutput) return;

  const compassMarkers = fields.map((field, index) => {
    const target = { x: -field.anchor.x, y: -field.anchor.y };
    const marker = document.createElement("span");
    marker.className = "parallax-compass__marker";
    marker.style.left = `${50 + target.y / 66 * 38}%`;
    marker.style.top = `${50 - target.x / 61 * 36}%`;
    marker.style.setProperty("--marker-color", field.anchor.color);
    marker.dataset.categoryIndex = String(index);
    const label = document.createElement("small");
    label.textContent = field.category.name;
    marker.append(label);
    compassMarkersRoot.append(marker);
    return marker;
  });

  const closeDetail = () => {
    detail.dataset.open = "false";
    detail.setAttribute("aria-hidden", "true");
    volume.querySelectorAll('[data-selected="true"]').forEach((item) => delete item.dataset.selected);
  };

  const openDetail = (item) => {
    const product = menu.products[Number(item.dataset.productIndex)];
    const category = menu.categories.find((candidate) => candidate.id === product.categoryId);
    closeDetail();
    item.dataset.selected = "true";
    detailCategory.textContent = category.name;
    detailTitle.textContent = product.name;
    detailMeta.textContent = `NT$${number.format(product.price)} · ${product.cue}${product.availability === "sold_out" ? " · 今日售完" : ""}`;
    detailCopy.textContent = product.description;
    detail.dataset.open = "true";
    detail.setAttribute("aria-hidden", "false");
    state.hasOpenedDetail = true;
    render();
  };

  const targetFor = (field) => ({ x: -field.anchor.x, y: -field.anchor.y });

  const directionHint = (field) => {
    const target = targetFor(field);
    const horizontalDifference = target.y - state.viewY;
    const verticalDifference = target.x - state.viewX;
    const horizontal = Math.abs(horizontalDifference) > 5
      ? (horizontalDifference > 0 ? "右" : "左")
      : "";
    const vertical = Math.abs(verticalDifference) > 5
      ? (verticalDifference > 0 ? "上" : "下")
      : "";
    return `${horizontal}${vertical}` || "前";
  };

  const depthDescription = () => {
    if (state.spread < .16) return "接近平面";
    if (state.spread < .42) return "淺層";
    if (state.spread < .76) return "立體";
    return "深層";
  };

  const updateFlatRecovery = () => {
    const percentage = Math.round(state.spread * 100);
    const description = depthDescription();
    flatRange.value = String(state.spread);
    flatRange.setAttribute("aria-valuetext", `${description}，${percentage}%`);
    flatOutput.value = `${description} · ${percentage}%`;
    flatOutput.textContent = flatOutput.value;
    flatRecovery.dataset.level = description;
  };

  const updateGuidance = (current, alignment) => {
    const locked = alignment >= .9;
    const near = alignment >= .7;
    const reticleState = locked ? "locked" : near ? "near" : "forming";
    reticle.dataset.state = reticleState;
    reticle.style.setProperty("--current-color", current.anchor.color);
    stage.style.setProperty("--current-color", current.anchor.color);
    stage.dataset.detailSeen = String(state.hasOpenedDetail);

    if (locked) {
      stateLabel.textContent = "可以點料理";
      alignmentLabel.textContent = "正面已對齊";
    } else if (near) {
      stateLabel.textContent = `再向${directionHint(current)}稍微轉動`;
      alignmentLabel.textContent = "接近正面";
    } else {
      stateLabel.textContent = `${current.category.name}正在成形`;
      alignmentLabel.textContent = "觀看面未對齊";
    }
    depthLabel.textContent = depthDescription();
    updateFlatRecovery();

    if (detail.dataset.open === "true") gestureHint.textContent = "料理資訊已開啟 · 點 × 返回";
    else if (!state.hasDragged) gestureHint.textContent = "拖曳空白處，轉動菜單";
    else if (!locked) gestureHint.textContent = "把分類標題轉到正面";
    else if (!state.hasOpenedDetail) gestureHint.textContent = "點料理查看資訊";
    else if (!state.hasPinched) gestureHint.textContent = "兩指張合或使用深度滑桿";
    else gestureHint.textContent = "拖曳轉向 · 深度滑桿 · 點料理";

    compass.setAttribute("aria-label", `六個觀看方向；目前朝向${current.category.name}`);
    compassCursor.style.left = `${50 + state.viewY / 66 * 38}%`;
    compassCursor.style.top = `${50 - state.viewX / 61 * 36}%`;
    compassMarkers.forEach((marker, index) => {
      marker.dataset.current = String(index === state.currentIndex);
    });
    depthKnob.style.bottom = `${Math.round(state.spread * 100)}%`;
  };

  const showDepthGuide = (visible) => {
    window.clearTimeout(depthGuideTimer);
    if (visible) {
      depthGuide.dataset.visible = "true";
      return;
    }
    depthGuideTimer = window.setTimeout(() => {
      depthGuide.dataset.visible = "false";
    }, 700);
  };

  const scoreFor = (field) => {
    const angularDistance = distance(
      { x: state.viewX, y: state.viewY },
      targetFor(field),
    );
    return clamp(1 - angularDistance / 78, 0, 1);
  };

  const renderItemDepth = (field, score) => {
    const tagDepth = (Number(field.element.dataset.categoryIndex) % 3 - 1) * 26 * state.spread;
    field.tag.style.transform = `translate(-50%, -50%) translate3d(0, -136px, ${tagDepth}px)`;
    field.element.querySelectorAll(".parallax-product").forEach((item) => {
      const x = Number(item.dataset.x);
      const y = Number(item.dataset.y);
      const rawZ = Number(item.dataset.z);
      const z = rawZ * state.spread;
      const tiltX = Number(item.dataset.tiltX) * state.spread;
      const tiltY = Number(item.dataset.tiltY) * state.spread;
      const frontness = clamp((rawZ - 20) / 88, 0, 1);
      const layerOpacity = 1 - frontness * .38;
      item.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      item.style.opacity = String(clamp((0.07 + score * 0.92) * layerOpacity, 0.07, 1));
    });
  };

  const render = () => {
    volume.style.transform = `translate3d(-50%, -50%, -38px) rotateX(${state.viewX}deg) rotateY(${state.viewY}deg)`;
    const scored = fields.map((field, index) => ({ index, score: scoreFor(field) }));
    scored.sort((a, b) => b.score - a.score);
    state.currentIndex = scored[0].index;

    fields.forEach((field, index) => {
      const score = scoreFor(field);
      const isCurrent = index === state.currentIndex;
      const isReadable = isCurrent && score >= .58;
      field.element.dataset.current = String(isCurrent);
      field.element.dataset.readable = String(isReadable);
      field.element.style.setProperty("--field-opacity", String(clamp(0.11 + score * 0.89, 0.11, 1)));
      field.element.style.setProperty("--field-line-opacity", String(clamp(0.04 + score * 0.3, 0.04, .34)));
      field.tag.tabIndex = isCurrent || score > .42 ? 0 : -1;
      field.tag.setAttribute("aria-current", isCurrent ? "true" : "false");
      field.element.querySelectorAll(".parallax-product").forEach((item) => {
        item.tabIndex = isReadable ? 0 : -1;
      });
      renderItemDepth(field, score);
    });

    const current = fields[state.currentIndex];
    const alignment = scoreFor(current);
    const alignmentPercent = Math.round(alignment * 100);
    currentCategory.textContent = `${current.category.name} · ${current.products.length} 道`;
    meterFill.style.transform = `scaleX(${alignment})`;
    meterFill.style.backgroundColor = current.anchor.color;
    meterFill.setAttribute("aria-valuenow", String(alignmentPercent));
    updateGuidance(current, alignment);
  };

  const setSettling = () => {
    window.clearTimeout(settleTimer);
    if (!prefersReducedMotion.matches) volume.classList.add("is-settling");
    settleTimer = window.setTimeout(() => volume.classList.remove("is-settling"), 260);
  };

  const focusField = (index) => {
    closeDetail();
    state.hasDragged = true;
    const target = targetFor(fields[index]);
    setSettling();
    state.viewX = target.x;
    state.viewY = target.y;
    render();
  };

  const settleIfNear = () => {
    const current = fields[state.currentIndex];
    const target = targetFor(current);
    if (distance({ x: state.viewX, y: state.viewY }, target) <= 18) focusField(state.currentIndex);
  };

  const pointerDistance = () => {
    const [first, second] = [...pointers.values()];
    return Math.hypot(second.x - first.x, second.y - first.y);
  };

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".parallax-reset, .parallax-detail, .parallax-flat-recovery")) {
      gestureMoved = false;
      return;
    }
    if (!event.target.closest(".parallax-product, .parallax-category-tag")) {
      stage.setPointerCapture(event.pointerId);
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    volume.classList.remove("is-settling");
    gestureMoved = false;
    if (pointers.size === 1) lastPointer = { x: event.clientX, y: event.clientY };
    if (pointers.size === 2) {
      pinchStart = { distance: pointerDistance(), spread: state.spread };
      showDepthGuide(true);
    }
  });

  stage.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && pinchStart) {
      const ratio = pointerDistance() / Math.max(1, pinchStart.distance);
      state.spread = clamp(pinchStart.spread + Math.log(ratio) * .92, .02, 1);
      gestureMoved = gestureMoved || Math.abs(ratio - 1) > .025;
      if (gestureMoved) state.hasPinched = true;
      render();
      return;
    }

    if (pointers.size === 1 && lastPointer) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (Math.abs(dx) + Math.abs(dy) > .4) gestureMoved = true;
      if (gestureMoved) {
        state.hasDragged = true;
        closeDetail();
      }
      state.viewY = clamp(state.viewY + dx * .24, -66, 66);
      state.viewX = clamp(state.viewX - dy * .22, -61, 61);
      lastPointer = { x: event.clientX, y: event.clientY };
      render();
    }
  });

  const endPointer = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
      pinchStart = null;
      showDepthGuide(false);
    }
    if (pointers.size === 1) {
      const remaining = [...pointers.values()][0];
      lastPointer = { ...remaining };
    } else {
      lastPointer = null;
      if (gestureMoved) settleIfNear();
    }
  };

  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  stage.addEventListener("click", (event) => {
    if (gestureMoved) return;
    const product = event.target.closest("[data-product-index]");
    if (product) {
      if (product.closest(".parallax-field")?.dataset.readable === "true") openDetail(product);
      return;
    }
    const category = event.target.closest("[data-category-target]");
    if (category) focusField(Number(category.dataset.categoryTarget));
  });

  stage.addEventListener("keydown", (event) => {
    if (event.target.closest(".parallax-flat-recovery")) return;
    const step = event.shiftKey ? 12 : 6;
    let handled = true;
    if (event.key === "ArrowLeft") { state.viewY = clamp(state.viewY - step, -66, 66); state.hasDragged = true; }
    else if (event.key === "ArrowRight") { state.viewY = clamp(state.viewY + step, -66, 66); state.hasDragged = true; }
    else if (event.key === "ArrowUp") { state.viewX = clamp(state.viewX + step, -61, 61); state.hasDragged = true; }
    else if (event.key === "ArrowDown") { state.viewX = clamp(state.viewX - step, -61, 61); state.hasDragged = true; }
    else if (event.key === "+" || event.key === "=") { state.spread = clamp(state.spread + .08, .02, 1); state.hasPinched = true; }
    else if (event.key === "-" || event.key === "_") { state.spread = clamp(state.spread - .08, .02, 1); state.hasPinched = true; }
    else if (event.key === "Enter") settleIfNear();
    else if (event.key === "Home") {
      resetView(false);
    } else handled = false;
    if (!handled) return;
    event.preventDefault();
    if (event.key !== "Home") closeDetail();
    render();
  });

  const resetView = (confirm = true) => {
    pointers.clear();
    pinchStart = null;
    lastPointer = null;
    gestureMoved = false;
    closeDetail();
    showDepthGuide(false);
    state.viewX = 0;
    state.viewY = 0;
    state.spread = .58;
    setSettling();
    render();
    if (!confirm) return;
    window.clearTimeout(resetConfirmTimer);
    resetButton.dataset.confirmed = "true";
    resetButton.textContent = "已回正";
    resetConfirmTimer = window.setTimeout(() => {
      delete resetButton.dataset.confirmed;
      resetButton.textContent = "回到正面";
    }, 700);
  };

  flatRange.addEventListener("input", () => {
    state.spread = clamp(Number(flatRange.value), .02, 1);
    state.hasPinched = true;
    render();
  });
  detailClose.addEventListener("click", () => {
    closeDetail();
    render();
  });
  resetButton.addEventListener("click", () => resetView(true));

  render();
})();