(() => {
  const initialAnchorId = "sichuan-mapo-tofu-pot";
  const depthOrder = ["overview", "menu", "detail"];

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const groupMenu = (menu) => menu.categories.map((category, categoryIndex) => ({
    category,
    categoryIndex,
    products: menu.products.filter((product) => product.categoryId === category.id),
  }));

  const productLabel = (product) => `${product.name}${product.availability === "sold_out" ? " · 售完" : ""}`;

  const fact = (label, value) => {
    const item = element("div");
    item.append(element("dt", "", label), element("dd", "", value));
    return item;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const menu = window.menuLensResearchMenu;
    if (!menu) throw new Error("Menu Sections requires menu-fixture.js.");

    const entries = groupMenu(menu);
    const phone = document.querySelector("#sections-phone");
    const documentRoot = document.querySelector("#sections-document");
    const controls = [...document.querySelectorAll("[data-depth-target]")];
    const statusLayer = document.querySelector("#sections-status-layer");
    const statusAnchor = document.querySelector("#sections-status-anchor");
    const footnote = document.querySelector("#sections-footnote");
    let activeDepth = "menu";
    let anchorProductId = initialAnchorId;

    document.querySelector("#sections-restaurant-name").textContent = menu.restaurant.name;
    document.querySelector("#sections-restaurant-summary").textContent = menu.restaurant.summary;

    entries.forEach((entry) => {
      const category = element("section", "semantic-category");
      category.dataset.categoryId = entry.category.id;

      const header = element("button", "semantic-category__header");
      header.type = "button";
      header.setAttribute("aria-label", `前往 ${entry.category.name} 的完整菜單`);
      header.append(
        element("span", "semantic-category__number", String(entry.categoryIndex + 1).padStart(2, "0")),
        element("strong", "semantic-category__name", entry.category.name),
        element("span", "semantic-category__count", `${entry.products.length} 道`),
        element("span", "semantic-category__summary", entry.category.summary),
        element("span", "semantic-category__range", entry.category.priceRange),
      );
      header.addEventListener("click", () => {
        anchorProductId = entry.products[0].id;
        updateAnchorState();
        setDepth("menu", header);
      });

      const products = element("div", "semantic-products");
      entry.products.forEach((product) => {
        const row = element("article", "semantic-product");
        row.dataset.productId = product.id;
        row.dataset.categoryId = entry.category.id;

        const primary = element("button", "semantic-product__primary");
        primary.type = "button";
        primary.setAttribute("aria-label", `${product.name}，NT$${product.price}${product.availability === "sold_out" ? "，目前售完" : ""}`);
        const name = element("span", "semantic-product__name", productLabel(product));
        const price = element("strong", "semantic-product__price", `NT$${product.price}`);
        primary.append(name, price, element("span", "semantic-product__cue", product.cue));
        primary.addEventListener("click", () => {
          anchorProductId = product.id;
          updateAnchorState();
          if (activeDepth !== "detail") setDepth("detail", row);
        });

        const details = element("div", "semantic-product__detail");
        const facts = element("dl", "semantic-product__facts");
        facts.append(
          fact("份量", product.portion?.label ?? "未提供"),
          fact("準備", product.preparation?.label ?? "未提供"),
          fact("設定", product.requiredConfiguration ?? "未提供"),
          fact("狀態", product.availability === "sold_out" ? "目前售完" : "可供應"),
        );
        details.append(element("p", "semantic-product__description", product.description), facts);
        row.append(primary, details);
        products.append(row);
      });

      category.append(header, products);
      documentRoot.append(category);
    });

    const anchorProduct = () => menu.products.find((product) => product.id === anchorProductId);
    const anchorCategory = () => entries.find((entry) => entry.products.some((product) => product.id === anchorProductId));

    const anchorElement = (depth = activeDepth) => {
      if (depth === "overview") return documentRoot.querySelector(`[data-category-id="${anchorCategory().category.id}"]`);
      return documentRoot.querySelector(`[data-product-id="${anchorProductId}"]`);
    };

    function updateAnchorState() {
      const product = anchorProduct();
      const entry = anchorCategory();
      documentRoot.querySelectorAll(".semantic-product").forEach((row) => {
        const active = row.dataset.productId === anchorProductId;
        row.dataset.anchor = String(active);
        row.querySelector("button").setAttribute("aria-current", active ? "location" : "false");
      });
      documentRoot.querySelectorAll(".semantic-category").forEach((category) => {
        category.dataset.anchorCategory = String(category.dataset.categoryId === entry.category.id);
      });
      statusAnchor.textContent = `${entry.category.name} · ${product.name}`;
    }

    const nearestAnchorToViewportCenter = () => {
      const selector = activeDepth === "overview" ? ".semantic-category" : ".semantic-product";
      const candidates = [...documentRoot.querySelectorAll(selector)].filter((node) => node.offsetParent !== null);
      const documentBox = documentRoot.getBoundingClientRect();
      const center = documentBox.top + documentBox.height / 2;
      return candidates.reduce((nearest, node) => {
        const box = node.getBoundingClientRect();
        const distance = Math.abs(box.top + box.height / 2 - center);
        return !nearest || distance < nearest.distance ? { node, distance } : nearest;
      }, null)?.node;
    };

    const captureVisibleAnchor = () => {
      const nearest = nearestAnchorToViewportCenter();
      if (!nearest) return;
      if (activeDepth === "overview") {
        const entry = entries.find((candidate) => candidate.category.id === nearest.dataset.categoryId);
        if (!entry.products.some((product) => product.id === anchorProductId)) anchorProductId = entry.products[0].id;
      } else {
        anchorProductId = nearest.dataset.productId;
      }
      updateAnchorState();
    };

    function setDepth(nextDepth, sourceElement) {
      if (!depthOrder.includes(nextDepth)) return;
      const oldAnchor = sourceElement ?? anchorElement(activeDepth);
      const documentBox = documentRoot.getBoundingClientRect();
      const oldOffset = oldAnchor ? oldAnchor.getBoundingClientRect().top - documentBox.top : documentBox.height / 2;

      activeDepth = nextDepth;
      phone.dataset.depth = activeDepth;
      controls.forEach((control) => control.setAttribute("aria-pressed", String(control.dataset.depthTarget === activeDepth)));
      statusLayer.textContent = activeDepth === "overview" ? "Z−1 · 全貌" : activeDepth === "menu" ? "Z0 · 完整菜單" : "Z+1 · 詳讀";
      footnote.textContent = activeDepth === "overview"
        ? "6 個分類 · 30 道已計入；此層不冒充完整菜單"
        : activeDepth === "menu"
          ? "30 / 30 道在同一份文件；沒有篩選、重排或隱藏分類"
          : "同一份 30 道文件；附近料理增加 cue，錨點增加完整資訊";

      requestAnimationFrame(() => {
        const nextAnchor = anchorElement(activeDepth);
        if (!nextAnchor) return;
        const nextOffset = nextAnchor.getBoundingClientRect().top - documentRoot.getBoundingClientRect().top;
        documentRoot.scrollTop += nextOffset - oldOffset;
      });
    }

    controls.forEach((control) => {
      control.addEventListener("click", () => {
        captureVisibleAnchor();
        setDepth(control.dataset.depthTarget);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeDepth === "detail") {
        captureVisibleAnchor();
        setDepth("menu");
      }
    });

    phone.dataset.depth = activeDepth;
    updateAnchorState();
    setDepth("menu");
    requestAnimationFrame(() => {
      const anchor = anchorElement("menu");
      const documentBox = documentRoot.getBoundingClientRect();
      const anchorBox = anchor.getBoundingClientRect();
      documentRoot.scrollTop += anchorBox.top - documentBox.top - (documentRoot.clientHeight - anchorBox.height) / 2;
    });
  });
})();
