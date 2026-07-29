import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [html, controller, renderer, fixture, styles] = await Promise.all([
  read("research-history/phases/06-multiscale-menu-map/index.html"),
  read("research-history/multiscale-menu-controller.js"),
  read("research-history/multiscale-menu-renderer.js"),
  read("research-history/menu-fixture.js"),
  read("research-history/multiscale-return.css"),
]);

assert(html.includes('id="scale-label" aria-live="polite">完整菜單 · 6 分類 30 道</strong>'), "06 must expose the complete-menu scope before JavaScript runs.");
assert(html.includes('aria-label="回到全店概覽"'), "The compact reset control must retain its full accessible name.");
assert(html.includes(">回全店</button>"), "A-M4 must preserve the compact visible reset label from repaired A-M3.");
assert(controller.includes("const overviewLabel = `完整菜單 · ${categories.length} 分類 ${details.length} 道`;"), "Overview truth must derive its category and Product counts from rendered content.");
assert(controller.includes("? `閱讀 ${categoryName(target)} · 其餘料理未篩除`"), "Focused state must explicitly state that other Products were not filtered.");
assert(controller.includes(".split(' · ')[0]"), "Focused truth copy must use the category name without repeating its Product count.");
assert(controller.includes("applyExpandedState(null);"), "Controller must initialize and return to the same complete-menu truth state.");
assert(styles.includes("overflow: clip"), "A-M4 must inherit the repaired sticky containment from A-M3.");
assert(styles.includes("white-space: nowrap"), "A-M4 must inherit the compact single-row topbar contract.");
assert(styles.includes("@media (max-width: 340px)"), "A-M4 must retain its 320px truth-label fit rule.");
assert(styles.includes("font-size: .84rem"), "A-M4 must fit the full focused truth wording without clipping at 320px.");

for (const required of [
  "returnContext",
  "viewportTop",
  "settleLayout",
  "window.scrollBy",
  "focus({ preventScroll: true })",
  "screen.dataset.focused",
]) {
  assert(controller.includes(required), `A-M3 return-continuity contract missing: ${required}`);
}

for (const forbidden of [
  "localStorage",
  "sessionStorage",
  "URLSearchParams",
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "sendBeacon",
  "Candidate",
  "comparison",
  "cart",
  "recommend",
  "ranking",
  "aria-hidden",
  ".hidden =",
  "style.display",
]) {
  assert(!controller.includes(forbidden), `A-M4 must not add filtering, persistence, transaction, or hiding behavior: ${forbidden}`);
}

assert(renderer.includes("menu.products.filter((product) => product.categoryId === category.id)"), "Renderer must preserve canonical category membership.");
assert(renderer.includes("data-product-id"), "Renderer must preserve stable Product identity.");
assert(!renderer.includes("未篩除"), "Retained-menu truth belongs to the scale state, not repeated Product or category summaries.");

const categoryBlock = fixture.split("categories: [")[1]?.split("products: [")[0] ?? "";
const productBlock = fixture.split("products: [")[1] ?? "";
const categoryIds = [...categoryBlock.matchAll(/\bid:\s*"[^"]+"/g)];
const productIds = [...productBlock.matchAll(/\bid:\s*"[^"]+"/g)];
assert(categoryIds.length === 6, `Expected 6 fixture categories, received ${categoryIds.length}.`);
assert(productIds.length === 30, `Expected 30 fixture Products, received ${productIds.length}.`);

console.log("A-M4 retained-menu truth validation passed.");
