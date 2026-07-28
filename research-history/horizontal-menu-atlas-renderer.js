/* Pure fixture projection for the 07 Horizontal Menu Atlas baseline. */
(() => {
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const sourceLabel = (evidence) => {
    if (!evidence) return "未提供";
    if (evidence.confidence === "low") return "低可信";
    return evidence.source === "merchant_confirmed" ? "商家確認" : "分類預設";
  };

  const renderProduct = (product, productIndex) => {
    const soldOut = product.availability === "sold_out";
    const availability = soldOut ? "目前售完，仍保留在完整菜單" : "可供應";

    return `
      <details class="atlas-product" data-product-id="${escapeHtml(product.id)}" data-product-index="${productIndex}">
        <summary>
          <span class="atlas-product__identity">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.cue)}${soldOut ? ' · <em>售完</em>' : ""}</span>
          </span>
          <span class="atlas-product__price">NT$${escapeHtml(product.price)}</span>
        </summary>
        <div class="atlas-product__detail">
          <p>${escapeHtml(product.description)}</p>
          <dl>
            <dt>份量</dt><dd>${escapeHtml(product.portion?.label ?? "未提供")} · ${escapeHtml(sourceLabel(product.portion))}</dd>
            <dt>準備節奏</dt><dd>${escapeHtml(product.preparation?.label ?? "未提供")} · ${escapeHtml(sourceLabel(product.preparation))}</dd>
            <dt>必選規格</dt><dd>${escapeHtml(product.requiredConfiguration)}</dd>
            <dt>供應狀態</dt><dd>${escapeHtml(availability)}</dd>
          </dl>
        </div>
      </details>`;
  };

  window.renderMenuLensHorizontalMenuAtlas = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Horizontal Menu Atlas renderer requires a menu with categories and products.");
    }

    let productIndex = 0;
    const navigation = menu.categories
      .map((category, categoryIndex) => {
        const count = menu.products.filter((product) => product.categoryId === category.id).length;
        return `
          <button
            type="button"
            data-category-id="${escapeHtml(category.id)}"
            aria-controls="atlas-${escapeHtml(category.id)}"
            ${categoryIndex === 0 ? 'aria-current="true"' : ""}
          >
            <strong>${escapeHtml(category.name)}</strong>
            <span>${count} 道</span>
          </button>`;
      })
      .join("");

    const sections = menu.categories
      .map((category) => {
        const products = menu.products.filter((product) => product.categoryId === category.id);
        const firstProductIndex = productIndex;
        const productMarkup = products
          .map((product) => renderProduct(product, productIndex++))
          .join("");

        return `
          <section
            id="atlas-${escapeHtml(category.id)}"
            class="atlas-category"
            data-category-id="${escapeHtml(category.id)}"
            data-first-product-index="${firstProductIndex}"
          >
            <header>
              <div>
                <p class="atlas-category__index">${String(menu.categories.indexOf(category) + 1).padStart(2, "0")}</p>
                <h3>${escapeHtml(category.name)}</h3>
                <p>${escapeHtml(category.description)}</p>
              </div>
              <div class="atlas-category__meta">
                <strong>${products.length} 道</strong>
                <span>${escapeHtml(category.priceRange)}</span>
              </div>
            </header>
            <div class="atlas-products">${productMarkup}</div>
          </section>`;
      })
      .join("");

    return `
      <div class="atlas-layout">
        <nav id="atlas-category-nav" class="atlas-category-nav" aria-label="菜單分類">
          ${navigation}
        </nav>
        <div id="atlas-scroll" class="atlas-scroll" tabindex="0">
          ${sections}
        </div>
      </div>`;
  };
})();
