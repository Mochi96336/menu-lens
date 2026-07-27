/* Pure fixture projection for the 11 Menu Matrix hypothesis. */
(() => {
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const columnCount = 8;

  window.renderMenuLensMatrix = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Menu Matrix renderer requires a menu with categories and products.");
    }

    let productIndex = 0;
    return menu.categories
      .map((category, categoryIndex) => {
        const products = menu.products.filter((product) => product.categoryId === category.id);
        const cells = Array.from({ length: columnCount }, (_, columnIndex) => {
          const product = products[columnIndex];
          if (!product) {
            return `<span class="matrix-cell matrix-cell--empty" data-matrix-slot="empty" data-column-index="${columnIndex}" aria-hidden="true"></span>`;
          }

          const currentIndex = productIndex++;
          const soldOut = product.availability === "sold_out";
          return `
            <button
              class="matrix-cell matrix-product"
              type="button"
              data-matrix-slot="product"
              data-product-id="${escapeHtml(product.id)}"
              data-product-index="${currentIndex}"
              data-column-index="${columnIndex}"
              aria-label="${escapeHtml(product.name)}，NT$${escapeHtml(product.price)}"
            >
              <span class="matrix-product__ordinal">${String(currentIndex + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(product.name)}</strong>
              <span class="matrix-product__cue">${escapeHtml(product.cue)}${soldOut ? " · 售完" : ""}</span>
              <span class="matrix-product__price">NT$${escapeHtml(product.price)}</span>
            </button>`;
        }).join("");

        return `
          <section class="matrix-row" data-category-id="${escapeHtml(category.id)}" data-category-index="${categoryIndex}">
            <button class="matrix-row__label" type="button" aria-expanded="false">
              <span>${String(categoryIndex + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(category.name)}</strong>
              <small>${products.length} 道</small>
            </button>
            <div class="matrix-row__cells">${cells}</div>
          </section>`;
      })
      .join("");
  };

  const syncDetailDisclosure = () => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;

    document.querySelectorAll(".matrix-detail").forEach((detail) => {
      if (detail.dataset.detailStateBound === "true") return;
      detail.dataset.detailStateBound = "true";

      const sync = () => {
        const isOpen = detail.dataset.open === "true";
        detail.inert = !isOpen;
        detail.setAttribute("aria-hidden", String(!isOpen));
      };

      sync();
      new MutationObserver(sync).observe(detail, {
        attributes: true,
        attributeFilter: ["data-open"]
      });
    });
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", syncDetailDisclosure, { once: true });
    } else {
      syncDetailDisclosure();
    }
  }
})();
