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
    const status = soldOut
      ? '<span class="minimal-ledger-sold-out">目前售完</span>'
      : "";
    const availability = soldOut ? "目前售完，仍保留在完整菜單" : "可供應";

    return `
      <details class="minimal-ledger-row" data-product-id="${escapeHtml(product.id)}">
        <summary class="minimal-ledger-summary">
          <span class="minimal-ledger-name-wrap">
            <span class="minimal-ledger-name">${escapeHtml(product.name)}</span>${status}
          </span>
          <span class="minimal-ledger-cue" title="${escapeHtml(product.cue)}">${escapeHtml(product.cue)}</span>
          <span class="minimal-ledger-price">${money(escapeHtml(product.price))}</span>
          <span class="minimal-ledger-disclosure">詳情</span>
        </summary>
        <div class="minimal-ledger-detail">
          <p class="minimal-ledger-description">${escapeHtml(product.description)}</p>
          <dl>
            <dt>份量</dt><dd>${escapeHtml(product.portion?.label ?? "未提供")} · ${escapeHtml(sourceLabel(product.portion))}</dd>
            <dt>準備節奏</dt><dd>${escapeHtml(product.preparation?.label ?? "未提供")} · ${escapeHtml(sourceLabel(product.preparation))}</dd>
            <dt>必選規格</dt><dd>${escapeHtml(product.requiredConfiguration)}</dd>
            <dt>供應狀態</dt><dd>${escapeHtml(availability)}</dd>
          </dl>
          <button class="minimal-ledger-close" type="button">關閉詳情</button>
        </div>
      </details>`;
  };

  window.renderMenuLensMinimalLedger = (menu) => {
    if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
      throw new Error("Minimal Ledger requires a menu with categories and products.");
    }

    return menu.categories
      .map((category) => {
        const products = menu.products.filter((product) => product.categoryId === category.id);
        return `
          <section
            id="minimal-ledger-${escapeHtml(category.id)}"
            class="minimal-ledger-category"
            data-category-id="${escapeHtml(category.id)}"
            data-category-name="${escapeHtml(category.name)}"
          >
            <header>
              <h2>${escapeHtml(category.name)}</h2>
              <span class="minimal-ledger-count">${products.length} 道</span>
              <p>${escapeHtml(category.description)} · ${escapeHtml(category.priceRange)}</p>
            </header>
            <div class="minimal-ledger-rows">
              ${products.map(renderProduct).join("")}
            </div>
          </section>`;
      })
      .join("");
  };

  window.createMenuLensMinimalLedgerController = (root, currentCategory) => {
    if (!(root instanceof HTMLElement)) {
      throw new Error("Minimal Ledger controller requires a root element.");
    }

    const details = [...root.querySelectorAll(".minimal-ledger-row")];
    const summaries = new Map(
      details.map((detail) => [detail, detail.querySelector(":scope > summary")]),
    );

    const restoreSummaryPosition = (detail, focus) => {
      const summary = summaries.get(detail);
      if (!(summary instanceof HTMLElement)) return;
      const returnTop = Number(detail.dataset.returnTop);
      requestAnimationFrame(() => {
        if (Number.isFinite(returnTop)) {
          const currentTop = summary.getBoundingClientRect().top;
          const delta = currentTop - returnTop;
          if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" });
        }
        if (focus) summary.focus({ preventScroll: true });
      });
    };

    const closeDetail = (detail, { restore = true, focus = false } = {}) => {
      if (!detail.open) return;
      if (!restore) detail.dataset.suppressRestore = "true";
      if (focus) detail.dataset.restoreFocus = "true";
      detail.open = false;
      if (focus) {
        const summary = summaries.get(detail);
        if (summary instanceof HTMLElement) summary.focus({ preventScroll: true });
      }
    };

    const prepareOpen = (detail) => {
      if (detail.open) return;
      const summary = summaries.get(detail);
      if (!(summary instanceof HTMLElement)) return;
      detail.dataset.returnTop = String(summary.getBoundingClientRect().top);
      details.forEach((otherDetail) => {
        if (otherDetail !== detail) closeDetail(otherDetail, { restore: false });
      });
    };

    details.forEach((detail) => {
      const summary = summaries.get(detail);
      const closeButton = detail.querySelector(".minimal-ledger-close");
      if (!(summary instanceof HTMLElement) || !(closeButton instanceof HTMLButtonElement)) return;

      summary.addEventListener("pointerdown", () => prepareOpen(detail));
      summary.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (detail.open) {
          closeDetail(detail, { restore: true, focus: true });
          return;
        }
        prepareOpen(detail);
        detail.dataset.openedFromKeyboard = "true";
        detail.open = true;
      });
      summary.addEventListener("click", () => {
        if (detail.open) detail.dataset.restoreFocus = "true";
      });

      detail.addEventListener("toggle", () => {
        const disclosure = detail.querySelector(".minimal-ledger-disclosure");
        if (disclosure) disclosure.textContent = detail.open ? "收起" : "詳情";
        if (detail.open) {
          if (detail.dataset.openedFromKeyboard === "true") {
            delete detail.dataset.openedFromKeyboard;
            requestAnimationFrame(() => closeButton.focus({ preventScroll: true }));
          }
          return;
        }

        const suppressRestore = detail.dataset.suppressRestore === "true";
        const focus = detail.dataset.restoreFocus === "true";
        delete detail.dataset.suppressRestore;
        delete detail.dataset.restoreFocus;
        if (!suppressRestore) restoreSummaryPosition(detail, focus);
      });

      closeButton.addEventListener("click", () => closeDetail(detail, { restore: true, focus: true }));
    });

    root.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openDetail = details.find((detail) => detail.open);
      if (!openDetail) return;
      event.preventDefault();
      closeDetail(openDetail, { restore: true, focus: true });
    });

    const sections = [...root.querySelectorAll(".minimal-ledger-category")];
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
      const nav = document.querySelector("#minimal-ledger-nav");
      const root = document.querySelector("#minimal-ledger-root");
      const currentCategory = document.querySelector("#current-minimal-ledger-category");
      if (!menu || !nav || !root) return;

      nav.innerHTML = menu.categories
        .map((category) => {
          const count = menu.products.filter((product) => product.categoryId === category.id).length;
          return `<a href="#minimal-ledger-${escapeHtml(category.id)}"><strong>${escapeHtml(category.name)}</strong><small>${count} 道</small></a>`;
        })
        .join("");
      root.innerHTML = window.renderMenuLensMinimalLedger(menu);
      window.createMenuLensMinimalLedgerController(root, currentCategory);
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
    else initialize();
  }
})();
