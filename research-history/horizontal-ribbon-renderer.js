/* Pure fixture projection for the 09 Horizontal Ribbon hypothesis. */
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
    const tickDepth = Math.max(28, Math.min(88, 100 - product.price / 8));

    return `
      <details
        class="ribbon-product"
        data-product-id="${escapeHtml(product.id)}"
        data-product-index="${productIndex}"
        style="--tick-depth: ${tickDepth}%"
      >
        <summary aria-label="${escapeHtml(product.name)}，NT$${escapeHtml(product.price)}">
          <span class="ribbon-product__tick" aria-hidden="true"></span>
          <span class="ribbon-product__ordinal">${String(productIndex + 1).padStart(2, "0")}</span>
          <span class="ribbon-product__identity">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.cue)}${soldOut ? ' · <em>售完</em>' : ""}</span>
          </span>
          <span class="ribbon-product__price">NT$${escapeHtml(product.price)}</span>
        </summary>
        <div class="ribbon-product__detail">
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

  window.renderMenuLensHorizontalRibbon = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Horizontal Ribbon renderer requires a menu with categories and products.");
    }

    let productIndex = 0;
    return menu.categories
      .map((category, categoryIndex) => {
        const products = menu.products.filter((product) => product.categoryId === category.id);
        const productMarkup = products
          .map((product) => renderProduct(product, productIndex++))
          .join("");

        return `
          <section
            class="ribbon-category"
            data-category-id="${escapeHtml(category.id)}"
            data-category-index="${categoryIndex}"
            style="--product-count: ${products.length}"
          >
            <button class="ribbon-category__header" type="button" data-first-product-index="${productIndex - products.length}">
              <span class="ribbon-category__index">${String(categoryIndex + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(category.name)}</strong>
              <span>${products.length} 道</span>
            </button>
            <div class="ribbon-products">${productMarkup}</div>
          </section>`;
      })
      .join("");
  };
})();
