(() => {
  const categoryColors = ["#b85b3e", "#b98738", "#6f8758", "#4e8290", "#6d6e9d", "#9a6688"];
  const projectionOrder = ["price-serving", "price-preparation", "serving-preparation"];
  const projectionDefinitions = {
    "price-serving": { x: "price", y: "serving", title: "價格 × 份量" },
    "price-preparation": { x: "price", y: "preparation", title: "價格 × 時間" },
    "serving-preparation": { x: "serving", y: "preparation", title: "份量 × 時間" },
  };
  const axisDefinitions = {
    price: { title: "價格", labels: [{ position: 0, label: "NT$120" }, { position: .5, label: "340" }, { position: 1, label: "560" }] },
    serving: { title: "份量", labels: [{ position: 0, label: "小份" }, { position: .5, label: "單份" }, { position: 1, label: "分享" }] },
    preparation: { title: "準備時間", labels: [{ position: 0, label: "較快" }, { position: 1 / 3, label: "一般" }, { position: 2 / 3, label: "較慢" }, { position: 1, label: "未標註" }] },
  };

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const normalizeServing = (product) => {
    const value = product.portion?.value;
    if (value === 0) return { value: 0, label: "小份" };
    if (value === 1) return { value: .5, label: product.portion?.label ?? "單份" };
    return { value: 1, label: product.portion?.label ?? "分享" };
  };

  const normalizePreparation = (product) => {
    if (product.preparation?.value === 0) return { value: 0, label: "較快" };
    if (product.preparation?.value === 1) return { value: 1 / 3, label: "一般" };
    if (product.preparation?.value === 2) return { value: 2 / 3, label: "較慢" };
    return { value: 1, label: "未標註" };
  };

  const modelProducts = (menu) => {
    const categoryIndex = new Map(menu.categories.map((category, index) => [category.id, index]));
    return menu.products.map((product, index) => ({
      product,
      index,
      categoryIndex: categoryIndex.get(product.categoryId),
      category: menu.categories[categoryIndex.get(product.categoryId)],
      coordinates: {
        price: (product.price - 120) / 440,
        serving: normalizeServing(product).value,
        preparation: normalizePreparation(product).value,
      },
      labels: {
        price: `NT$${product.price}`,
        serving: normalizeServing(product).label,
        preparation: normalizePreparation(product).label,
      },
    }));
  };

  const categoricalOffsets = (items, projection) => {
    const definition = projectionDefinitions[projection];
    const groups = new Map();
    items.forEach((item) => {
      const x = item.coordinates[definition.x];
      const y = item.coordinates[definition.y];
      const key = `${x.toFixed(3)}:${y.toFixed(3)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    const offsets = new Map();
    groups.forEach((group) => {
      const columns = Math.ceil(Math.sqrt(group.length));
      const rows = Math.ceil(group.length / columns);
      group.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        offsets.set(item.product.id, {
          x: (column - (columns - 1) / 2) * 5.8,
          y: (row - (rows - 1) / 2) * 3.2,
        });
      });
    });
    return offsets;
  };

  const priceBandOffsets = (items, projection) => {
    const definition = projectionDefinitions[projection];
    const bands = new Map();
    items.forEach((item) => {
      const band = item.coordinates[definition.y].toFixed(3);
      if (!bands.has(band)) bands.set(band, []);
      bands.get(band).push(item);
    });

    const offsets = new Map();
    bands.forEach((bandItems) => {
      const baseY = 92 - bandItems[0].coordinates[definition.y] * 84;
      const laneOrder = baseY > 78
        ? [0, -1, -2, -3, -4, -5, -6]
        : baseY < 22
          ? [0, 1, 2, 3, 4, 5, 6]
          : [0, -1, 1, -2, 2, -3, 3];
      const laneLastX = new Map();
      [...bandItems]
        .sort((left, right) => left.coordinates.price - right.coordinates.price || left.index - right.index)
        .forEach((item) => {
          const baseX = 8 + item.coordinates.price * 84;
          const lane = laneOrder.find((candidate) => baseX - (laneLastX.get(candidate) ?? -Infinity) >= 5.4) ?? laneOrder[laneOrder.length - 1];
          laneLastX.set(lane, baseX);
          offsets.set(item.product.id, { x: 0, y: lane * 3.25 });
        });
    });
    return offsets;
  };

  const projectionOffsets = (items, projection) => projectionDefinitions[projection].x === "price"
    ? priceBandOffsets(items, projection)
    : categoricalOffsets(items, projection);

  const clampX = (value) => Math.max(8, Math.min(92, value));
  const clampY = (value) => Math.max(5, Math.min(95, value));

  document.addEventListener("DOMContentLoaded", () => {
    const menu = window.menuLensResearchMenu;
    if (!menu) throw new Error("Menu Projections requires menu-fixture.js.");
    const items = modelProducts(menu);
    const nodeById = new Map();
    const plot = document.querySelector("#projection-field");
    const controls = [...document.querySelectorAll("[data-projection]")];
    const xTitle = document.querySelector("#projection-x-title");
    const yTitle = document.querySelector("#projection-y-title");
    const xLabels = document.querySelector("#projection-x-labels");
    const yLabels = document.querySelector("#projection-y-labels");
    const statusTitle = document.querySelector("#projection-status-title");
    const statusMeta = document.querySelector("#projection-status-meta");
    const detailName = document.querySelector("#projection-detail-name");
    const detailPrice = document.querySelector("#projection-detail-price");
    const detailMeta = document.querySelector("#projection-detail-meta");
    const detailPriceFact = document.querySelector("#projection-fact-price");
    const detailServingFact = document.querySelector("#projection-fact-serving");
    const detailPreparationFact = document.querySelector("#projection-fact-preparation");
    let activeProjection = projectionOrder[0];
    let selectedProductId = "sichuan-mapo-tofu-pot";

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
      button.append(element("span", "", String(item.index + 1).padStart(2, "0")));
      button.addEventListener("click", () => selectProduct(item.product.id));
      plot.append(button);
      nodeById.set(item.product.id, button);
    });

    const renderAxisLabels = (root, axis, direction) => {
      root.replaceChildren();
      axisDefinitions[axis].labels.forEach(({ position, label }) => {
        const tick = element("span", "", label);
        if (direction === "x") tick.style.left = `${5 + position * 90}%`;
        else tick.style.top = `${95 - position * 90}%`;
        root.append(tick);
      });
    };

    function selectProduct(productId) {
      selectedProductId = productId;
      const item = items.find((candidate) => candidate.product.id === productId);
      nodeById.forEach((node, id) => {
        const selected = id === selectedProductId;
        node.dataset.selected = String(selected);
        node.setAttribute("aria-pressed", String(selected));
      });
      detailName.textContent = item.product.name;
      detailPrice.textContent = item.labels.price;
      detailMeta.textContent = `${item.category.name} · ${item.product.cue}${item.product.availability === "sold_out" ? " · 售完" : ""}`;
      detailPriceFact.textContent = item.labels.price;
      detailServingFact.textContent = item.labels.serving;
      detailPreparationFact.textContent = item.labels.preparation;
      statusMeta.textContent = `料理 ${String(item.index + 1).padStart(2, "0")} / 30`;
    }

    function setProjection(nextProjection) {
      if (!projectionDefinitions[nextProjection]) return;
      activeProjection = nextProjection;
      const definition = projectionDefinitions[activeProjection];
      const offsets = projectionOffsets(items, activeProjection);
      items.forEach((item) => {
        const offset = offsets.get(item.product.id);
        const x = 8 + item.coordinates[definition.x] * 84 + offset.x;
        const y = 92 - item.coordinates[definition.y] * 84 + offset.y;
        const node = nodeById.get(item.product.id);
        node.style.left = `${clampX(x)}%`;
        node.style.top = `${clampY(y)}%`;
      });
      xTitle.textContent = axisDefinitions[definition.x].title;
      yTitle.textContent = axisDefinitions[definition.y].title;
      renderAxisLabels(xLabels, definition.x, "x");
      renderAxisLabels(yLabels, definition.y, "y");
      controls.forEach((control) => control.setAttribute("aria-pressed", String(control.dataset.projection === activeProjection)));
      statusTitle.textContent = definition.title;
      selectProduct(selectedProductId);
    }

    controls.forEach((control) => control.addEventListener("click", () => setProjection(control.dataset.projection)));
    setProjection(activeProjection);
  });
})();
