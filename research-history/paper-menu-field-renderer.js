/* Pure fixture projection for the 12 Paper Menu Field hypothesis. */
(() => {
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  window.renderMenuLensPaperField = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Paper Menu Field renderer requires a menu with categories and products.");
    }

    let productIndex = 0;
    return menu.categories
      .map((category, categoryIndex) => {
        const products = menu.products.filter((product) => product.categoryId === category.id);
        const productMarkup = products
          .map((product) => {
            const currentIndex = productIndex++;
            const soldOut = product.availability === "sold_out";
            return `
              <button
                class="paper-product"
                type="button"
                data-product-id="${escapeHtml(product.id)}"
                data-product-index="${currentIndex}"
                aria-label="${escapeHtml(product.name)}，NT$${escapeHtml(product.price)}"
              >
                <span>${escapeHtml(product.name)}${soldOut ? " · 售完" : ""}</span>
                <strong>${escapeHtml(product.price)}</strong>
              </button>`;
          })
          .join("");

        return `
          <section class="paper-category" data-category-id="${escapeHtml(category.id)}" data-category-index="${categoryIndex}">
            <button class="paper-category__header" type="button" aria-expanded="false">
              <span>${String(categoryIndex + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(category.name)}</strong>
              <small>${products.length} 道 · ${escapeHtml(category.priceRange)}</small>
            </button>
            <div class="paper-category__products">${productMarkup}</div>
          </section>`;
      })
      .join("");
  };

  const syncDetailDisclosure = () => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;

    document.querySelectorAll(".paper-detail").forEach((detail) => {
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
