/* Pure fixture projection for the 10 Fisheye Ribbon hypothesis. */
(() => {
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const sourceLabel = (evidence) => {
    if (!evidence) return "尚未提供";
    if (evidence.confidence === "low") return "低信心推測";
    return evidence.source === "merchant_confirmed" ? "店家確認" : "分類預設";
  };

  const renderProduct = (product, index, priceMin, priceMax, categoryEnd) => {
    const soldOut = product.availability === "sold_out";
    const priceProgress = priceMax === priceMin ? 0.5 : (product.price - priceMin) / (priceMax - priceMin);
    const priceHeight = 12 + priceProgress * 40;
    return `
      <details
        class="fisheye-product"
        data-product-id="${escapeHtml(product.id)}"
        data-product-index="${index}"
        data-category-id="${escapeHtml(product.categoryId)}"
        data-category-end="${categoryEnd}"
        data-price="${escapeHtml(product.price)}"
        style="--price-height: ${priceHeight.toFixed(2)}%"
      >
        <summary aria-label="${escapeHtml(product.name)}，NT$${escapeHtml(product.price)}">
          <span class="fisheye-product__tick" aria-hidden="true"></span>
          <span class="fisheye-product__ordinal">${String(index + 1).padStart(2, "0")}</span>
          <span class="fisheye-product__identity">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.cue)}${soldOut ? " · <em>售完</em>" : ""}</span>
          </span>
          <span class="fisheye-product__price" aria-hidden="true">${escapeHtml(product.price)}</span>
        </summary>
        <div class="fisheye-product__detail">
          <p>${escapeHtml(product.description)}</p>
          <dl>
            <dt>份量</dt><dd>${escapeHtml(product.portion?.label ?? "尚未提供")} · ${escapeHtml(sourceLabel(product.portion))}</dd>
            <dt>準備時間</dt><dd>${escapeHtml(product.preparation?.label ?? "尚未提供")} · ${escapeHtml(sourceLabel(product.preparation))}</dd>
            <dt>必要選項</dt><dd>${escapeHtml(product.requiredConfiguration)}</dd>
          </dl>
        </div>
      </details>`;
  };

  window.renderMenuLensFisheyeRibbon = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Fisheye Ribbon renderer requires a menu with categories and products.");
    }

    const prices = menu.products.map((product) => product.price);
    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);
    return menu.products
      .map((product, index) =>
        renderProduct(
          product,
          index,
          priceMin,
          priceMax,
          menu.products[index + 1]?.categoryId !== product.categoryId,
        ),
      )
      .join("");
  };
})();
