/*
 * Pure renderer for the 06 multi-scale research hypothesis.
 * Keeping fixture projection separate lets the archive validator prove that
 * the prototype renders every canonical research product exactly once.
 */
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

  const renderProduct = (product) => {
    const soldOut = product.availability === "sold_out";
    const cue = `${product.cue}${soldOut ? " · 售完" : ""}`;
    const availability = soldOut ? "目前售完，仍保留在完整菜單" : "可供應";

    return `
      <details class="scale-product" data-product-id="${escapeHtml(product.id)}">
        <summary>
          <span>
            <strong>${escapeHtml(product.name)}</strong><br />
            <span class="menu-row-copy">${escapeHtml(cue)}</span>
          </span>
          <span>NT$${escapeHtml(product.price)}</span>
        </summary>
        <div class="menu-detail">
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

  window.renderMenuLensMultiscaleMap = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Multi-scale renderer requires a menu with categories and products.");
    }

    return menu.categories
      .map((category) => {
        const products = menu.products.filter((product) => product.categoryId === category.id);
        const productMarkup = products.map(renderProduct).join("");

        return `
          <section class="scale-category" data-category="${escapeHtml(category.id)}" data-expanded="false">
            <button type="button" aria-expanded="false" aria-controls="products-${escapeHtml(category.id)}">
              <span>
                <span class="scale-category-title">${escapeHtml(category.name)} · ${products.length} 道</span><br />
                <span class="scale-category-copy">${escapeHtml(category.summary)}</span>
              </span>
              <span class="scale-category-price">${escapeHtml(category.priceRange)}</span>
            </button>
            <div class="scale-products" id="products-${escapeHtml(category.id)}">
              ${productMarkup}
            </div>
          </section>`;
      })
      .join("");
  };
})();
