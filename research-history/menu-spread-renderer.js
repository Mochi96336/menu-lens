/*
 * Pure renderer for the 08 Menu Spread research hypothesis.
 * The archive validator executes this projection without a browser so a
 * spatial sketch cannot gain an artificial advantage by omitting products.
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
    const availability = soldOut ? "目前售完，仍保留在完整菜單" : "可供應";

    return `
      <details class="spread-product" data-product-id="${escapeHtml(product.id)}">
        <summary>
          <span class="spread-product__identity">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.cue)}${soldOut ? ' · <em class="spread-sold-out">售完</em>' : ""}</span>
          </span>
          <span class="spread-product__price">NT$${escapeHtml(product.price)}</span>
        </summary>
        <div class="spread-product__detail">
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

  window.renderMenuLensSpread = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Menu Spread renderer requires a menu with categories and products.");
    }

    return menu.categories
      .map((category, index) => {
        const products = menu.products.filter((product) => product.categoryId === category.id);
        const marks = products
          .map(
            (product) =>
              `<span style="--mark-width: ${Math.max(42, Math.min(92, 105 - product.price / 8))}%"></span>`,
          )
          .join("");

        return `
          <section
            id="spread-category-${escapeHtml(category.id)}"
            class="spread-category"
            data-category-id="${escapeHtml(category.id)}"
            data-category-index="${index}"
            data-focused="false"
          >
            <button
              class="spread-category__focus"
              type="button"
              aria-pressed="false"
              aria-controls="spread-products-${escapeHtml(category.id)}"
            >
              <span class="spread-category__index">${String(index + 1).padStart(2, "0")}</span>
              <span class="spread-category__name">${escapeHtml(category.name)}</span>
              <span class="spread-category__count">${products.length} 道</span>
              <span class="spread-category__range">${escapeHtml(category.priceRange)}</span>
            </button>
            <div class="spread-category__marks" aria-hidden="true">${marks}</div>
            <div id="spread-products-${escapeHtml(category.id)}" class="spread-products">
              <header class="spread-products__heading">
                <p>${escapeHtml(category.description)}</p>
                <strong>${escapeHtml(category.summary)}</strong>
              </header>
              ${products.map(renderProduct).join("")}
            </div>
          </section>`;
      })
      .join("");
  };
})();
