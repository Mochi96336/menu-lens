/* Shared DOM helpers for the 25 Menu Depth studies. */
(() => {
  const modelMenu = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Menu Depth requires a menu with categories and products.");
    }

    return menu.categories.map((category, categoryIndex) => ({
      category,
      categoryIndex,
      products: menu.products
        .map((product, productIndex) => ({ product, productIndex }))
        .filter(({ product }) => product.categoryId === category.id),
    }));
  };

  const createProductButton = ({ product, productIndex }, className, options = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.dataset.productIndex = String(productIndex);
    button.dataset.productId = product.id;
    button.setAttribute("aria-label", `${product.name}，NT$${product.price}${product.availability === "sold_out" ? "，目前售完" : ""}`);

    const name = document.createElement("span");
    name.className = `${className}__name`;
    name.textContent = `${product.name}${product.availability === "sold_out" ? " · 售完" : ""}`;
    button.append(name);

    if (options.showPrice !== false) {
      const price = document.createElement("strong");
      price.className = `${className}__price`;
      price.textContent = String(product.price);
      button.append(price);
    }
    return button;
  };

  const createCategoryLabel = (entry, className) => {
    const label = document.createElement("div");
    label.className = className;
    const index = document.createElement("span");
    index.textContent = String(entry.categoryIndex + 1).padStart(2, "0");
    const title = document.createElement("strong");
    title.textContent = entry.category.name;
    const count = document.createElement("small");
    count.textContent = `${entry.products.length} 道`;
    label.append(index, title, count);
    return label;
  };

  const mountWeightedColumns = (root, entries, renderCategory, columnClassName) => {
    for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
      const first = entries[columnIndex * 2];
      const second = entries[columnIndex * 2 + 1];
      const column = document.createElement("div");
      column.className = columnClassName;
      column.dataset.columnIndex = String(columnIndex);
      column.style.setProperty("--column-weight", String(first.products.length + second.products.length));
      column.style.setProperty("--row-weights", `${first.products.length}fr ${second.products.length}fr`);
      column.append(renderCategory(first), renderCategory(second));
      root.append(column);
    }
  };

  const createDetailController = (menu, root, prefix, options = {}) => {
    const detail = root.querySelector(`#${prefix}-detail`);
    const closeButton = root.querySelector(`#${prefix}-detail-close`);
    const title = root.querySelector(`#${prefix}-detail-title`);
    const meta = root.querySelector(`#${prefix}-detail-meta`);
    const copy = root.querySelector(`#${prefix}-detail-copy`);
    let selectedButton = null;

    const close = (restoreFocus = false) => {
      detail.dataset.open = "false";
      root.querySelectorAll("[data-product-index][data-selected]").forEach((button) => delete button.dataset.selected);
      if (restoreFocus) selectedButton?.focus();
      selectedButton = null;
      options.onClose?.();
    };

    const open = (button) => {
      const product = menu.products[Number(button.dataset.productIndex)];
      selectedButton = button;
      root.querySelectorAll("[data-product-index]").forEach((candidate) => {
        if (candidate === button) candidate.dataset.selected = "true";
        else delete candidate.dataset.selected;
      });
      title.textContent = product.name;
      meta.textContent = `NT$${product.price} · ${product.cue}${product.availability === "sold_out" ? " · 售完" : ""}`;
      copy.textContent = product.description;
      detail.dataset.open = "true";
      options.onOpen?.(product, button);
    };

    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-product-index]");
      if (!button || !root.contains(button)) return;
      event.stopPropagation();
      open(button);
    });
    closeButton.addEventListener("click", () => close(true));
    return { close, open };
  };

  const fillRestaurant = (menu, prefix) => {
    document.querySelector(`#${prefix}-restaurant-name`).textContent = menu.restaurant.name;
    document.querySelector(`#${prefix}-restaurant-meta`).textContent = menu.restaurant.summary;
  };

  window.MenuLensDepth = Object.freeze({
    modelMenu,
    createProductButton,
    createCategoryLabel,
    mountWeightedColumns,
    createDetailController,
    fillRestaurant,
  });
})();
