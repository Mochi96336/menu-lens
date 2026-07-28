import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.MENU_LENS_BASE_URL ?? "http://127.0.0.1:4173";
const evidenceDirectory = new URL("../docs/research-history/reviews/06-retained-menu-truth/", import.meta.url);
const outputPath = new URL("browser-checks.json", evidenceDirectory);
const screenshotDirectory = process.env.MENU_LENS_TRUTH_SCREENSHOTS ?? "/tmp/menu-lens-06-retained-menu-truth";
const viewports = [
  { key: "320", width: 320 },
  { key: "390", width: 390 },
  { key: "1280", width: 1280 },
];
const results = {};

await mkdir(evidenceDirectory, { recursive: true });
await mkdir(screenshotDirectory, { recursive: true });

const measure = (state) => {
  const categories = [...document.querySelectorAll(".scale-category")];
  const products = [...document.querySelectorAll(".scale-product")];
  const collapsed = categories.filter((category) => category.dataset.expanded !== "true");
  const label = document.querySelector("#scale-label");
  const topbar = document.querySelector(".workspace-topbar");
  const reset = document.querySelector("#collapse-all");
  const frame = document.querySelector(".phone-frame");
  const screen = document.querySelector(".multiscale-screen");
  const topbarRect = topbar?.getBoundingClientRect();
  const resetRect = reset?.getBoundingClientRect();
  const frameRect = frame?.getBoundingClientRect();

  return {
    state,
    scrollY: window.scrollY,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    categoryCount: categories.length,
    productCount: products.length,
    uniqueProductCount: new Set(products.map((product) => product.dataset.productId)).size,
    expandedCategories: categories.filter((category) => category.dataset.expanded === "true").length,
    collapsedCategories: collapsed.length,
    collapsedProducts: collapsed.reduce((sum, category) => sum + category.querySelectorAll(".scale-product").length, 0),
    openDetails: document.querySelectorAll(".scale-product[open]").length,
    label: label?.textContent ?? "",
    resetDisabled: reset?.disabled ?? false,
    topbarPosition: topbar ? getComputedStyle(topbar).position : null,
    topbarTop: topbarRect?.top ?? null,
    topbarHeight: topbarRect?.height ?? null,
    labelWidth: label?.getBoundingClientRect().width ?? 0,
    labelScrollWidth: label?.scrollWidth ?? 0,
    resetTop: resetRect?.top ?? null,
    resetVisible: Boolean(resetRect && resetRect.bottom > 0 && resetRect.top < window.innerHeight),
    topbarInsideFrame: Boolean(topbarRect && frameRect && topbarRect.left >= frameRect.left - 1 && topbarRect.right <= frameRect.right + 1),
    documentOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    frameOverflowX: Boolean(frame && frame.scrollWidth > frame.clientWidth + 1),
    screenOverflowX: Boolean(screen && screen.scrollWidth > screen.clientWidth + 1),
    topbarOverflowX: Boolean(topbar && topbar.scrollWidth > topbar.clientWidth + 1),
    labelOverflowX: Boolean(label && label.scrollWidth > label.clientWidth + 1),
    resetOverflowX: Boolean(reset && reset.scrollWidth > reset.clientWidth + 1),
  };
};

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    try {
      await page.goto(`${baseUrl}/phases/06-multiscale-menu-map/`, { waitUntil: "networkidle" });
      await page.locator(".scale-category").first().waitFor();

      const initial = await page.evaluate(measure, "initial");
      await page.screenshot({ path: `${screenshotDirectory}/${viewport.key}-initial.png`, fullPage: false });

      const target = page.locator('.scale-category[data-category="shared-dishes"]');
      const sourceButton = target.locator(":scope > button");
      await sourceButton.scrollIntoViewIfNeeded();
      const sourceTop = await sourceButton.evaluate((button) => button.getBoundingClientRect().top);
      await sourceButton.click();
      await page.waitForFunction(() => document.querySelector('.scale-category[data-category="shared-dishes"]')?.dataset.expanded === "true");
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

      const focused = await page.evaluate(measure, "focused");
      await page.screenshot({ path: `${screenshotDirectory}/${viewport.key}-focused.png`, fullPage: false });

      const lastProduct = target.locator(".scale-product").last();
      const lastSummary = lastProduct.locator("summary");
      await lastSummary.scrollIntoViewIfNeeded();
      await lastSummary.click();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

      const deep = await page.evaluate(measure, "deep");
      await page.screenshot({ path: `${screenshotDirectory}/${viewport.key}-deep.png`, fullPage: false });

      await page.locator("#collapse-all").click();
      await page.waitForFunction(() => document.querySelectorAll('.scale-category[data-expanded="true"]').length === 0);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

      const returned = await page.evaluate(measure, "returned");
      const returnedTop = await sourceButton.evaluate((button) => button.getBoundingClientRect().top);
      const focusReturned = await sourceButton.evaluate((button) => document.activeElement === button);
      await page.screenshot({ path: `${screenshotDirectory}/${viewport.key}-returned.png`, fullPage: false });

      const failures = [];
      for (const current of [initial, focused, deep, returned]) {
        if (current.categoryCount !== 6 || current.productCount !== 30 || current.uniqueProductCount !== 30) failures.push(`${current.state}:fixture`);
        if (current.documentOverflowX || current.frameOverflowX || current.screenOverflowX || current.topbarOverflowX || current.labelOverflowX || current.resetOverflowX) {
          failures.push(`${current.state}:horizontal-overflow`);
        }
        if (!current.topbarInsideFrame) failures.push(`${current.state}:topbar-outside-frame`);
        if (current.topbarHeight > 48) failures.push(`${current.state}:topbar-too-tall`);
      }
      if (initial.label !== "完整菜單 · 6 分類 30 道" || !initial.resetDisabled) failures.push("initial:truth");
      if (focused.label !== "閱讀 分享料理 · 其餘料理未篩除") failures.push("focused:truth");
      if (deep.label !== "閱讀 分享料理 · 其餘料理未篩除") failures.push("deep:truth");
      if (returned.label !== "完整菜單 · 6 分類 30 道") failures.push("returned:truth");
      for (const current of [focused, deep]) {
        if (current.topbarPosition !== "sticky" || !current.resetVisible || Math.abs(current.topbarTop) > 1) {
          failures.push(`${current.state}:sticky-not-visible`);
        }
      }
      if (focused.expandedCategories !== 1 || focused.collapsedCategories !== 5 || focused.collapsedProducts <= 0) failures.push("focused:retention");
      if (deep.openDetails !== 1) failures.push("deep:detail");
      if (Math.abs(returnedTop - sourceTop) > 1) failures.push("return:position");
      if (!focusReturned) failures.push("return:focus");
      if (returned.expandedCategories !== 0 || returned.openDetails !== 0) failures.push("return:state");
      if (pageErrors.length) failures.push("page-errors");

      results[viewport.key] = {
        pageErrors,
        states: { initial, focused, deep, returned },
        collapsedProductsRetained: focused.productCount === 30 && focused.collapsedProducts > 0,
        returnPositionError: Math.abs(returnedTop - sourceTop),
        focusReturned,
        failures,
      };
    } catch (error) {
      results[viewport.key] = {
        fatalError: error instanceof Error ? error.message : String(error),
        pageErrors,
        failures: ["fatal-runner-error"],
      };
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const failures = Object.entries(results)
  .filter(([, result]) => result.failures.length)
  .map(([viewport, result]) => ({ viewport, failures: result.failures }));
const report = { viewports: results, failures };
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(`${screenshotDirectory}/report.json`, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  throw new Error(`A-M4 browser validation failed: ${JSON.stringify(failures)}`);
}

console.log("A-M4 retained-menu truth and real layout matrix passed.");
