/* Local deformation controller for the 10A Local Fisheye child. */
(() => {
  const PRODUCT_COUNT = 30;
  const LOCAL_RADIUS = 2;
  const FULL_RIBBON_WEIGHT = 18 + 6 + 6 + 2.5 + 2.5 + 25 * 0.35;

  const weightForDistance = (distance) => {
    if (distance === 0) return 18;
    if (distance === 1) return 6;
    if (distance === 2) return 2.5;
    return 0.35;
  };

  const computeProductLayout = (count, focusIndex) => {
    if (!Number.isInteger(count) || count < 1) throw new Error("Local fisheye requires a positive product count.");
    const boundedFocus = Math.max(0, Math.min(count - 1, focusIndex));
    const farBasis = (0.35 / FULL_RIBBON_WEIGHT) * 100;
    const localIndices = Array.from({ length: count }, (_, index) => index)
      .filter((index) => Math.abs(index - boundedFocus) <= LOCAL_RADIUS);
    const farCount = count - localIndices.length;
    const localBudget = 100 - farCount * farBasis;
    const localWeightTotal = localIndices.reduce(
      (sum, index) => sum + weightForDistance(Math.abs(index - boundedFocus)),
      0,
    );
    const bases = Array.from({ length: count }, () => farBasis);
    localIndices.forEach((index) => {
      bases[index] = localBudget
        * weightForDistance(Math.abs(index - boundedFocus))
        / localWeightTotal;
    });
    return { focusIndex: boundedFocus, bases, farBasis };
  };

  window.MenuLensLocalFisheye = Object.freeze({
    PRODUCT_COUNT,
    LOCAL_RADIUS,
    computeProductLayout,
    weightForDistance,
  });

  if (typeof document === "undefined") return;

  const menu = window.menuLensResearchMenu;
  const stage = document.querySelector("#fisheye-stage");
  const track = document.querySelector("#fisheye-track");
  const categoryNav = document.querySelector("#fisheye-categories");
  const previousButton = document.querySelector("#fisheye-previous");
  const nextButton = document.querySelector("#fisheye-next");
  const locationTitle = document.querySelector("#fisheye-location-title");
  const locationMeta = document.querySelector("#fisheye-location-meta");
  const categoryLensButton = document.querySelector("#fisheye-category-lens");
  const productLensButton = document.querySelector("#fisheye-product-lens");

  document.querySelector("#fisheye-restaurant-name").textContent = menu.restaurant.name;
  document.querySelector("#fisheye-restaurant-copy").textContent = menu.restaurant.description;
  document.querySelector("#fisheye-restaurant-meta").textContent = menu.restaurant.summary;
  track.innerHTML = window.renderMenuLensFisheyeRibbon(menu);

  menu.categories.forEach((category) => {
    const count = menu.products.filter((product) => product.categoryId === category.id).length;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.categoryId = category.id;
    button.style.setProperty("--category-count", count);
    button.textContent = category.name;
    button.title = `${category.name}，${count} 道`;
    categoryNav.append(button);
  });

  const products = [...track.querySelectorAll(".fisheye-product")];
  const categoryButtons = [...categoryNav.querySelectorAll("button")];
  const productCategoryIndices = menu.products.map((product) =>
    menu.categories.findIndex((category) => category.id === product.categoryId),
  );
  let lens = "category";
  let focusIndex = 0;
  let focusCategoryIndex = 0;
  let pointerState = null;
  let suppressClick = false;

  const focusCurrentProductSummary = () => {
    products[focusIndex]?.querySelector("summary")?.focus({ preventScroll: true });
  };

  const updateProductFocus = (nextIndex, options = {}) => {
    const layout = computeProductLayout(products.length, nextIndex);
    if (layout.focusIndex !== focusIndex && options.preserveOpen !== true) {
      products.forEach((product) => product.removeAttribute("open"));
    }
    focusIndex = layout.focusIndex;
    products.forEach((product, index) => {
      const distance = Math.abs(index - focusIndex);
      product.style.setProperty("--fisheye-basis", `${layout.bases[index]}%`);
      product.dataset.distance = distance === 0 ? "focus" : distance <= LOCAL_RADIUS ? "near" : "far";
      if (distance === 0) product.dataset.focused = "true";
      else delete product.dataset.focused;
      delete product.dataset.categoryFocused;
    });

    const product = menu.products[focusIndex];
    const category = menu.categories.find((candidate) => candidate.id === product.categoryId);
    focusCategoryIndex = menu.categories.indexOf(category);
    locationTitle.textContent = product.name;
    locationMeta.textContent = `${focusIndex + 1} / ${products.length} · ${category.name}`;
    previousButton.disabled = focusIndex === 0;
    nextButton.disabled = focusIndex === products.length - 1;
    categoryButtons.forEach((button) => {
      if (button.dataset.categoryId === product.categoryId) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  };

  const updateCategoryFocus = (nextCategoryIndex) => {
    focusCategoryIndex = Math.max(0, Math.min(menu.categories.length - 1, nextCategoryIndex));
    const focusedCategory = menu.categories[focusCategoryIndex];
    focusIndex = menu.products.findIndex((product) => product.categoryId === focusedCategory.id);
    products.forEach((product) => product.removeAttribute("open"));

    const categoryWeights = menu.categories.map((_, index) => {
      const distance = Math.abs(index - focusCategoryIndex);
      if (distance === 0) return 18;
      if (distance === 1) return 5;
      if (distance === 2) return 1.5;
      return 0.5;
    });
    const totalWeight = categoryWeights.reduce((sum, weight) => sum + weight, 0);
    const categoryCounts = menu.categories.map((category) =>
      menu.products.filter((product) => product.categoryId === category.id).length,
    );

    products.forEach((product, index) => {
      const categoryIndex = productCategoryIndices[index];
      const productWeight = categoryWeights[categoryIndex] / categoryCounts[categoryIndex];
      product.style.setProperty("--fisheye-basis", `${(productWeight / totalWeight) * 100}%`);
      product.dataset.distance = "category";
      delete product.dataset.focused;
      if (categoryIndex === focusCategoryIndex) product.dataset.categoryFocused = "true";
      else delete product.dataset.categoryFocused;
    });

    const count = categoryCounts[focusCategoryIndex];
    locationTitle.textContent = focusedCategory.name;
    locationMeta.textContent = `${focusCategoryIndex + 1} / ${menu.categories.length} · ${count} 道 · ${focusedCategory.priceRange}`;
    previousButton.disabled = focusCategoryIndex === 0;
    nextButton.disabled = focusCategoryIndex === menu.categories.length - 1;
    categoryButtons.forEach((button) => {
      if (button.dataset.categoryId === focusedCategory.id) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  };

  const setLens = (nextLens, targetIndex) => {
    lens = nextLens;
    stage.dataset.lens = lens;
    categoryLensButton.setAttribute("aria-pressed", String(lens === "category"));
    productLensButton.setAttribute("aria-pressed", String(lens === "product"));
    if (lens === "category") updateCategoryFocus(targetIndex ?? focusCategoryIndex);
    else updateProductFocus(targetIndex ?? focusIndex);
  };

  const indexFromPointer = (clientX) => {
    const bounds = stage.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (clientX - bounds.left) / Math.max(1, bounds.width)));
    const itemCount = lens === "category" ? menu.categories.length : products.length;
    return Math.round(progress * (itemCount - 1));
  };

  products.forEach((product, index) => {
    product.querySelector("summary").addEventListener("click", (event) => {
      if (suppressClick) {
        event.preventDefault();
        suppressClick = false;
        return;
      }
      if (lens === "category") {
        event.preventDefault();
        setLens("product", index);
        return;
      }
      if (index !== focusIndex) {
        event.preventDefault();
        updateProductFocus(index);
      }
    });
    product.addEventListener("toggle", () => {
      if (!product.open) return;
      products.forEach((candidate) => {
        if (candidate !== product) candidate.removeAttribute("open");
      });
    });
  });

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const categoryIndex = menu.categories.findIndex((category) => category.id === button.dataset.categoryId);
      setLens("category", categoryIndex);
    });
  });

  categoryLensButton.addEventListener("click", () => setLens("category"));
  productLensButton.addEventListener("click", () => setLens("product"));
  previousButton.addEventListener("click", () => {
    if (lens === "category") updateCategoryFocus(focusCategoryIndex - 1);
    else updateProductFocus(focusIndex - 1);
  });
  nextButton.addEventListener("click", () => {
    if (lens === "category") updateCategoryFocus(focusCategoryIndex + 1);
    else updateProductFocus(focusIndex + 1);
  });

  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || pointerState || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointerState = { id: event.pointerId, startX: event.clientX, startY: event.clientY, axis: null, moved: false };
  });
  stage.addEventListener("pointermove", (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    const dx = event.clientX - pointerState.startX;
    const dy = event.clientY - pointerState.startY;
    if (!pointerState.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 7) {
      pointerState.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (pointerState.axis === "x") {
        stage.setPointerCapture(event.pointerId);
        stage.classList.add("is-dragging");
      }
    }
    if (pointerState.axis !== "x") return;
    event.preventDefault();
    pointerState.moved = true;
    if (lens === "category") updateCategoryFocus(indexFromPointer(event.clientX));
    else updateProductFocus(indexFromPointer(event.clientX));
  });

  const endPointer = (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    if (pointerState.moved) suppressClick = true;
    pointerState = null;
    stage.classList.remove("is-dragging");
  };
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    pointerState = null;
    suppressClick = false;
    stage.classList.remove("is-dragging");
  });
  stage.addEventListener("click", (event) => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);

  stage.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const summaryHadFocus = Boolean(event.target.closest?.("summary"));
    event.preventDefault();
    if (lens === "category") {
      updateCategoryFocus(focusCategoryIndex + (event.key === "ArrowLeft" ? -1 : 1));
    } else {
      updateProductFocus(focusIndex + (event.key === "ArrowLeft" ? -1 : 1));
      if (summaryHadFocus) focusCurrentProductSummary();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openProduct = track.querySelector("details[open]");
    if (!openProduct) return;
    openProduct.removeAttribute("open");
    openProduct.querySelector("summary").focus({ preventScroll: true });
  });

  setLens("category", 0);
})();