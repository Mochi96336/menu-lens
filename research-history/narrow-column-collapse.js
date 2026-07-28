(() => {
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const money = (price) => `NT$${price}`;

  const sourceLabel = (evidence) => {
    if (!evidence) return "未提供";
    if (evidence.confidence === "low") return "低可信";
    return evidence.source === "merchant_confirmed" ? "商家確認" : "分類預設";
  };

  const renderProduct = (product) => {
    const soldOut = product.availability === "sold_out";
    return `
      <details class="ledger-row" data-product-id="${escapeHtml(product.id)}">
        <summary>
          <span class="ledger-identity">
            <span class="ledger-product-name">${escapeHtml(product.name)}</span>
            <span class="ledger-product-copy">${escapeHtml(product.description)}</span>
            ${soldOut ? '<span class="ledger-sold-out">目前售完</span>' : ""}
          </span>
          <span class="ledger-cue">${escapeHtml(product.cue)}</span>
          <span class="ledger-price">${money(escapeHtml(product.price))}</span>
        </summary>
        <div class="ledger-detail">
          <p>${escapeHtml(product.description)}</p>
          <dl>
            <dt>份量</dt><dd>${escapeHtml(product.portion?.label ?? "未提供")} · ${escapeHtml(sourceLabel(product.portion))}</dd>
            <dt>準備節奏</dt><dd>${escapeHtml(product.preparation?.label ?? "未提供")} · ${escapeHtml(sourceLabel(product.preparation))}</dd>
            <dt>必選規格</dt><dd>${escapeHtml(product.requiredConfiguration)}</dd>
            <dt>供應狀態</dt><dd>${soldOut ? "目前售完，仍保留在完整菜單" : "可供應"}</dd>
          </dl>
        </div>
      </details>`;
  };

  window.renderMenuLensNarrowColumnLedger = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Narrow Column Ledger requires categories and products.");
    }

    return menu.categories
      .map((category) => {
        const products = menu.products.filter((product) => product.categoryId === category.id);
        return `
          <section
            id="narrow-ledger-${escapeHtml(category.id)}"
            class="ledger-category"
            data-category-id="${escapeHtml(category.id)}"
            data-category-name="${escapeHtml(category.name)}"
          >
            <header>
              <h2>${escapeHtml(category.name)}</h2>
              <span class="ledger-count">${products.length} 道</span>
              <p>${escapeHtml(category.description)} · ${escapeHtml(category.priceRange)}</p>
            </header>
            ${products.map(renderProduct).join("")}
          </section>`;
      })
      .join("");
  };

  window.createMenuLensNarrowColumnController = (root, currentCategory) => {
    if (!(root instanceof HTMLElement)) {
      throw new Error("Narrow Column Ledger controller requires a root element.");
    }

    const details = [...root.querySelectorAll(".ledger-row")];
    details.forEach((detail) => {
      detail.addEventListener("toggle", () => {
        if (!detail.open) return;
        details.forEach((candidate) => {
          if (candidate !== detail) candidate.open = false;
        });
      });
    });

    const sections = [...root.querySelectorAll(".ledger-category")];
    const showLastCategoryAtPageEnd = () => {
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atEnd && sections.length > 0 && currentCategory) {
        currentCategory.textContent = sections[sections.length - 1].dataset.categoryName;
      }
      return atEnd;
    };

    if ("IntersectionObserver" in window && currentCategory) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (showLastCategoryAtPageEnd()) return;
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
          if (visible) currentCategory.textContent = visible.target.dataset.categoryName;
        },
        { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.01] },
      );
      sections.forEach((section) => observer.observe(section));
    }

    window.addEventListener("scroll", showLastCategoryAtPageEnd, { passive: true });
  };

  if (typeof document !== "undefined") {
    const initialize = () => {
      const menu = window.menuLensResearchMenu;
      const nav = document.querySelector("#narrow-ledger-nav");
      const root = document.querySelector("#narrow-ledger-root");
      const currentCategory = document.querySelector("#current-narrow-ledger-category");
      if (!menu || !nav || !root) return;

      nav.innerHTML = menu.categories
        .map((category) => {
          const count = menu.products.filter((product) => product.categoryId === category.id).length;
          return `<a href="#narrow-ledger-${escapeHtml(category.id)}"><strong>${escapeHtml(category.name)}</strong><small>${count} 道</small></a>`;
        })
        .join("");
      root.innerHTML = window.renderMenuLensNarrowColumnLedger(menu);
      window.createMenuLensNarrowColumnController(root, currentCategory);
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();
  }
})();
