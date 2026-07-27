/* Shared substrate for the 18-derived landscape paper prototypes. */
(() => {
  const categoryProducts = (menu, categoryId) =>
    menu.products.filter((product) => product.categoryId === categoryId);

  const buildLandscape = ({
    menu,
    sheet,
    columnClass,
    categoryClass = "",
    columnWeight,
    decorateProduct,
  }) => {
    if (!menu || !sheet || typeof window.renderMenuLensPaperField !== "function") {
      throw new Error("Landscape paper requires the shared menu fixture and paper renderer.");
    }

    const projection = document.createElement("div");
    projection.innerHTML = window.renderMenuLensPaperField(menu);

    const projectedCategories = [...projection.querySelectorAll(".paper-category")];
    const categoryCounts = menu.categories.map((category) => categoryProducts(menu, category.id).length);
    const columnCounts = [];
    const columns = [];

    projectedCategories.forEach((category, categoryIndex) => {
      if (categoryClass) category.classList.add(categoryClass);

      const count = categoryCounts[categoryIndex];
      const header = category.querySelector(".paper-category__header");
      header.setAttribute("aria-label", `${menu.categories[categoryIndex].name}，${count} 道料理`);

      const products = categoryProducts(menu, menu.categories[categoryIndex].id);
      [...category.querySelectorAll(".paper-product")].forEach((button, localIndex) => {
        const name = button.querySelector("span");
        name.classList.add("paper-product__name");
        decorateProduct?.({
          button,
          category,
          categoryIndex,
          product: products[localIndex],
          productIndex: Number(button.dataset.productIndex),
        });
      });
    });

    for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
      const firstCategoryIndex = columnIndex * 2;
      const firstCount = categoryCounts[firstCategoryIndex];
      const secondCount = categoryCounts[firstCategoryIndex + 1];
      const column = document.createElement("div");
      column.className = columnClass;
      column.dataset.columnIndex = String(columnIndex);
      const weight = columnWeight?.({ columnIndex, firstCount, secondCount }) ?? 1;
      column.style.setProperty("--column-count", String(weight));
      column.style.setProperty("--column-rows", `${firstCount}fr ${secondCount}fr`);
      column.append(projectedCategories[firstCategoryIndex], projectedCategories[firstCategoryIndex + 1]);
      sheet.append(column);
      columns.push(column);
      columnCounts.push(firstCount + secondCount);
    }

    return {
      categories: [...sheet.querySelectorAll(".paper-category")],
      categoryCounts,
      columnCounts,
      columns,
      productButtons: [...sheet.querySelectorAll(".paper-product")],
    };
  };

  const hydrateRestaurant = ({ menu, name, meta, copy }) => {
    name.textContent = menu.restaurant.name;
    meta.textContent = menu.restaurant.summary;
    copy.textContent = menu.restaurant.description;
  };

  const createDishDetail = ({ menu, detail, closeButton, title, meta, copy, productButtons }) => {
    let selectedButton = null;

    const close = (restoreFocus = false) => {
      detail.dataset.open = "false";
      detail.setAttribute("aria-hidden", "true");
      productButtons.forEach((button) => delete button.dataset.selected);
      if (restoreFocus) selectedButton?.focus({ preventScroll: true });
      selectedButton = null;
    };

    const open = (button) => {
      const product = menu.products[Number(button.dataset.productIndex)];
      selectedButton = button;
      productButtons.forEach((candidate) => {
        if (candidate === button) candidate.dataset.selected = "true";
        else delete candidate.dataset.selected;
      });
      title.textContent = product.name;
      meta.textContent = `NT$${product.price} · ${product.cue}${product.availability === "sold_out" ? " · 售完" : ""}`;
      copy.textContent = product.description;
      detail.dataset.open = "true";
      detail.setAttribute("aria-hidden", "false");
    };

    closeButton.addEventListener("click", () => close(true));
    close();
    return { close, open, isOpen: () => detail.dataset.open === "true" };
  };

  const createCue = (className, text) => {
    const cue = document.createElement("small");
    cue.className = className;
    cue.textContent = text;
    return cue;
  };

  window.MenuLensLandscapeCore = {
    buildLandscape,
    createCue,
    createDishDetail,
    hydrateRestaurant,
  };
})();
