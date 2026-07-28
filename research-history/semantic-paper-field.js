(() => {
  const menu = window.menuLensResearchMenu;
  const viewport = document.querySelector("#semantic-viewport");
  const sheet = document.querySelector("#semantic-sheet");
  const overviewButton = document.querySelector("#semantic-overview");
  const previousButton = document.querySelector("#semantic-previous");
  const nextButton = document.querySelector("#semantic-next");
  const locationTitle = document.querySelector("#semantic-location-title");
  const locationMeta = document.querySelector("#semantic-location-meta");
  const detail = document.querySelector("#semantic-detail");
  const detailClose = document.querySelector("#semantic-detail-close");

  document.querySelector("#semantic-restaurant-name").textContent = menu.restaurant.name;
  document.querySelector("#semantic-restaurant-copy").textContent = menu.restaurant.description;
  document.querySelector("#semantic-restaurant-meta").textContent = menu.restaurant.summary;
  const categories = [...sheet.querySelectorAll(".paper-category")];
  const productButtons = [...sheet.querySelectorAll(".paper-product")];
  categories.forEach((category, categoryIndex) => {
    const categoryData = menu.categories[categoryIndex];
    const products = menu.products.filter((product) => product.categoryId === categoryData.id);
    const header = category.querySelector(".paper-category__header");
    header.removeAttribute("aria-expanded");
    header.setAttribute("aria-pressed", "false");
    header.setAttribute(
      "aria-label",
      `${categoryData.name}，${products.length} 道，${categoryData.priceRange}，放大這個分類`,
    );
    header.dataset.semanticLevel = "overview";
  });
  productButtons.forEach((button) => {
    const product = menu.products[Number(button.dataset.productIndex)];
    button.dataset.essentialState = product.availability === "sold_out" ? "sold-out" : "available";
  });

  let activeCategoryIndex = null;
  let selectedProductIndex = null;

  const setProductAccessibility = () => {
    productButtons.forEach((button) => {
      const categoryIndex = Number(button.closest(".paper-category").dataset.categoryIndex);
      const readable = activeCategoryIndex === categoryIndex && detail.dataset.open !== "true";
      button.tabIndex = readable ? 0 : -1;
      button.setAttribute("aria-hidden", String(!readable));
    });
  };

  const closeDetail = (restoreFocus = false) => {
    const returnIndex = selectedProductIndex;
    detail.dataset.open = "false";
    viewport.dataset.informationLevel = activeCategoryIndex === null ? "overview" : "near";
    sheet.inert = false;
    sheet.removeAttribute("aria-hidden");
    productButtons.forEach((button) => delete button.dataset.selected);
    selectedProductIndex = null;
    setProductAccessibility();
    if (restoreFocus && returnIndex !== null) {
      productButtons.find((button) => Number(button.dataset.productIndex) === returnIndex)?.focus({ preventScroll: true });
    }
  };

  /* Identical to parent 12: same category coordinates, 2.05 cap and translate + scale camera. */
  const updateTransform = () => {
    if (activeCategoryIndex === null) {
      sheet.style.setProperty("--paper-transform", "translate(0px, 0px) scale(1)");
      return;
    }

    const category = categories[activeCategoryIndex];
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const categoryCenterX = category.offsetLeft + category.offsetWidth / 2;
    const categoryCenterY = category.offsetTop + category.offsetHeight / 2;
    const scale = Math.min(
      2.05,
      (viewportWidth * .9) / Math.max(1, category.offsetWidth),
      (viewportHeight * .82) / Math.max(1, category.offsetHeight),
    );
    const translateX = viewportWidth / 2 - sheet.offsetLeft - categoryCenterX * scale;
    const translateY = viewportHeight / 2 - sheet.offsetTop - categoryCenterY * scale;
    sheet.style.setProperty(
      "--paper-transform",
      `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    );
  };

  const focusCategory = (nextIndex) => {
    closeDetail();
    activeCategoryIndex = Math.max(0, Math.min(categories.length - 1, nextIndex));
    viewport.dataset.scale = "focus";
    viewport.dataset.informationLevel = "near";
    overviewButton.setAttribute("aria-pressed", "false");
    categories.forEach((category, index) => {
      const focused = index === activeCategoryIndex;
      if (focused) category.dataset.focused = "true";
      else delete category.dataset.focused;
      const header = category.querySelector(".paper-category__header");
      header.setAttribute("aria-pressed", String(focused));
      header.dataset.semanticLevel = focused ? "near" : "overview";
    });
    setProductAccessibility();

    const category = menu.categories[activeCategoryIndex];
    const count = menu.products.filter((product) => product.categoryId === category.id).length;
    locationTitle.textContent = category.name;
    locationMeta.textContent = `${activeCategoryIndex + 1} / ${categories.length} · ${count} 道 · ${category.priceRange}`;
    previousButton.disabled = activeCategoryIndex === 0;
    nextButton.disabled = activeCategoryIndex === categories.length - 1;
    requestAnimationFrame(updateTransform);
  };

  const showOverview = () => {
    closeDetail();
    activeCategoryIndex = null;
    viewport.dataset.scale = "overview";
    viewport.dataset.informationLevel = "overview";
    overviewButton.setAttribute("aria-pressed", "true");
    categories.forEach((category) => {
      delete category.dataset.focused;
      const header = category.querySelector(".paper-category__header");
      header.setAttribute("aria-pressed", "false");
      header.dataset.semanticLevel = "overview";
    });
    setProductAccessibility();
    locationTitle.textContent = "完整紙面";
    locationMeta.textContent = `${categories.length} 個分類 · ${productButtons.length} 道完整料理`;
    previousButton.disabled = true;
    nextButton.disabled = true;
    updateTransform();
  };

  const openDetail = (productIndex, button) => {
    const product = menu.products[productIndex];
    selectedProductIndex = productIndex;
    productButtons.forEach((candidate) => {
      if (candidate === button) candidate.dataset.selected = "true";
      else delete candidate.dataset.selected;
    });
    document.querySelector("#semantic-detail-title").textContent = product.name;
    document.querySelector("#semantic-detail-meta").textContent =
      `NT$${product.price} · ${product.cue}${product.availability === "sold_out" ? " · 售完" : ""}`;
    document.querySelector("#semantic-detail-copy").textContent = product.description;
    document.querySelector("#semantic-detail-portion").textContent = product.portion?.label ?? "尚未提供";
    document.querySelector("#semantic-detail-preparation").textContent = product.preparation?.label ?? "尚未提供";
    document.querySelector("#semantic-detail-configuration").textContent = product.requiredConfiguration;
    detail.dataset.open = "true";
    viewport.dataset.informationLevel = "reading";
    sheet.inert = true;
    sheet.setAttribute("aria-hidden", "true");
    setProductAccessibility();
    requestAnimationFrame(() => detailClose.focus({ preventScroll: true }));
  };

  categories.forEach((category, categoryIndex) => {
    category.querySelector(".paper-category__header").addEventListener("click", () => {
      if (activeCategoryIndex === categoryIndex) showOverview();
      else focusCategory(categoryIndex);
    });
  });

  productButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const categoryIndex = Number(button.closest(".paper-category").dataset.categoryIndex);
      if (activeCategoryIndex !== categoryIndex) {
        focusCategory(categoryIndex);
        return;
      }
      openDetail(Number(button.dataset.productIndex), button);
    });
  });

  overviewButton.addEventListener("click", showOverview);
  previousButton.addEventListener("click", () => {
    if (activeCategoryIndex !== null) focusCategory(activeCategoryIndex - 1);
  });
  nextButton.addEventListener("click", () => {
    if (activeCategoryIndex !== null) focusCategory(activeCategoryIndex + 1);
  });
  detailClose.addEventListener("click", () => closeDetail(true));
  viewport.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    if (activeCategoryIndex === null) focusCategory(event.key === "ArrowLeft" ? 0 : categories.length - 1);
    else focusCategory(activeCategoryIndex + (event.key === "ArrowLeft" ? -1 : 1));
  });
  window.addEventListener("resize", () => requestAnimationFrame(updateTransform));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (detail.dataset.open === "true") {
      closeDetail(true);
      return;
    }
    if (activeCategoryIndex !== null) {
      showOverview();
      overviewButton.focus({ preventScroll: true });
    }
  });

  showOverview();
})();
