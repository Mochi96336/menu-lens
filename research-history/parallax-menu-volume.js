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
  const state = { viewX: 0, viewY: 0, spread: 0.58, currentIndex: 0 };
  const pointers = new Map();
  const fields = [];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const number = new Intl.NumberFormat("zh-TW");
  let pinchStart = null;
  let lastPointer = null;
  let gestureMoved = false;
  let settleTimer = 0;

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const productsFor = (categoryId) => menu.products.filter((product) => product.categoryId === categoryId);

  const createProduct = (product, productIndex, categoryIndex, count) => {
    const item = document.createElement("div");
    item.className = "parallax-product";
    item.dataset.productId = product.id;

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

  const targetFor = (field) => ({ x: -field.anchor.x, y: -field.anchor.y });

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
      const z = Number(item.dataset.z) * state.spread;
      const tiltX = Number(item.dataset.tiltX) * state.spread;
      const tiltY = Number(item.dataset.tiltY) * state.spread;
      item.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      item.style.opacity = String(clamp(0.07 + score * 0.92, 0.07, 1));
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
      field.element.dataset.current = String(isCurrent);
      field.element.style.setProperty("--field-opacity", String(clamp(0.11 + score * 0.89, 0.11, 1)));
      field.element.style.setProperty("--field-line-opacity", String(clamp(0.04 + score * 0.3, 0.04, .34)));
      field.tag.tabIndex = isCurrent || score > .42 ? 0 : -1;
      field.tag.setAttribute("aria-current", isCurrent ? "true" : "false");
      renderItemDepth(field, score);
    });

    const current = fields[state.currentIndex];
    const alignment = scoreFor(current);
    const alignmentPercent = Math.round(alignment * 100);
    const depthPercent = Math.round(state.spread * 100);
    currentCategory.textContent = `${current.category.name} · ${current.products.length} 道`;
    alignmentLabel.textContent = `對齊 ${alignmentPercent}%`;
    depthLabel.textContent = state.spread < .16 ? "接近平面" : `深度 ${depthPercent}%`;
    meterFill.style.transform = `scaleX(${alignment})`;
    meterFill.style.backgroundColor = current.anchor.color;
  };

  const setSettling = () => {
    window.clearTimeout(settleTimer);
    if (!prefersReducedMotion.matches) volume.classList.add("is-settling");
    settleTimer = window.setTimeout(() => volume.classList.remove("is-settling"), 260);
  };

  const focusField = (index) => {
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
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    volume.classList.remove("is-settling");
    gestureMoved = false;
    if (pointers.size === 1) lastPointer = { x: event.clientX, y: event.clientY };
    if (pointers.size === 2) pinchStart = { distance: pointerDistance(), spread: state.spread };
  });

  stage.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2 && pinchStart) {
      const ratio = pointerDistance() / Math.max(1, pinchStart.distance);
      state.spread = clamp(pinchStart.spread + Math.log(ratio) * .92, .02, 1);
      gestureMoved = gestureMoved || Math.abs(ratio - 1) > .025;
      render();
      return;
    }

    if (pointers.size === 1 && lastPointer) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (Math.abs(dx) + Math.abs(dy) > .4) gestureMoved = true;
      state.viewY = clamp(state.viewY + dx * .24, -66, 66);
      state.viewX = clamp(state.viewX - dy * .22, -61, 61);
      lastPointer = { x: event.clientX, y: event.clientY };
      render();
    }
  });

  const endPointer = (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchStart = null;
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
    const target = event.target.closest("[data-category-target]");
    if (!target || gestureMoved) return;
    focusField(Number(target.dataset.categoryTarget));
  });

  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.spread = clamp(state.spread - event.deltaY * .0012, .02, 1);
    render();
  }, { passive: false });

  stage.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 12 : 6;
    let handled = true;
    if (event.key === "ArrowLeft") state.viewY = clamp(state.viewY - step, -66, 66);
    else if (event.key === "ArrowRight") state.viewY = clamp(state.viewY + step, -66, 66);
    else if (event.key === "ArrowUp") state.viewX = clamp(state.viewX + step, -61, 61);
    else if (event.key === "ArrowDown") state.viewX = clamp(state.viewX - step, -61, 61);
    else if (event.key === "+" || event.key === "=") state.spread = clamp(state.spread + .08, .02, 1);
    else if (event.key === "-" || event.key === "_") state.spread = clamp(state.spread - .08, .02, 1);
    else if (event.key === "Enter") settleIfNear();
    else if (event.key === "Home") {
      state.viewX = 0;
      state.viewY = 0;
      state.spread = .58;
      setSettling();
    } else handled = false;
    if (!handled) return;
    event.preventDefault();
    render();
  });

  document.querySelector("#parallax-reset").addEventListener("click", () => {
    state.viewX = 0;
    state.viewY = 0;
    state.spread = .58;
    setSettling();
    render();
    stage.focus({ preventScroll: true });
  });

  render();
})();
