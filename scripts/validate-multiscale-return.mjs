import { access, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archive = new URL("research-history/", root);
const evidence = new URL("docs/research-history/reviews/06-return-continuity/", root);

await Promise.all([
  "menu-fixture.js",
  "multiscale-menu-renderer.js",
  "multiscale-menu-controller.js",
  "multiscale-return.css",
  "phases/06-multiscale-menu-map/index.html",
].map((path) => access(new URL(path, archive))));
await Promise.all([
  "README.md",
  "browser-checks.json",
  "parent-child-contact-sheet.svg",
].map((path) => access(new URL(path, evidence))));

const sandbox = { window: {} };
runInNewContext(await readFile(new URL("menu-fixture.js", archive), "utf8"), sandbox);
runInNewContext(await readFile(new URL("multiscale-menu-renderer.js", archive), "utf8"), sandbox);
const menu = sandbox.window.menuLensResearchMenu;
const render = sandbox.window.renderMenuLensMultiscaleMap;
if (!menu || menu.categories.length !== 6 || menu.products.length !== 30 || typeof render !== "function") {
  throw new Error("A-M3 must preserve the 06 fixture and renderer contract.");
}

const markup = render(menu);
const productIds = [...markup.matchAll(/data-product-id="([^"]+)"/g)].map((match) => match[1]);
const categoryIds = [...markup.matchAll(/data-category="([^"]+)"/g)].map((match) => match[1]);
if (productIds.length !== 30 || new Set(productIds).size !== 30) {
  throw new Error("A-M3 must retain 30 unique Products exactly once.");
}
if (categoryIds.join("|") !== menu.categories.map((category) => category.id).join("|")) {
  throw new Error("A-M3 must preserve canonical category order.");
}
for (const product of menu.products) {
  for (const value of [product.name, product.cue, `NT$${product.price}`]) {
    if (!markup.includes(value)) throw new Error(`A-M3 lost parent content for ${product.id}: ${value}`);
  }
}

const html = await readFile(new URL("phases/06-multiscale-menu-map/index.html", archive), "utf8");
for (const text of [
  "../../multiscale-return.css",
  "../../multiscale-menu-controller.js",
  'class="phone-screen multiscale-screen"',
  'data-focused="false"',
  "window.createMenuLensMultiscaleController",
  'aria-label="回到全店概覽"',
  ">回全店</button>",
  "全店尺度",
]) {
  if (!html.includes(text)) throw new Error(`A-M3 page is missing ${text}.`);
}
for (const forbidden of ["retained-menu", "30 道仍在同一份菜單", "Product landmark", "代表料理", "推薦料理"]) {
  if (html.includes(forbidden)) throw new Error(`A-M3 must not include A-M4 or 06A content: ${forbidden}.`);
}

const controller = await readFile(new URL("multiscale-menu-controller.js", archive), "utf8");
for (const text of [
  "returnContext",
  "viewportTop",
  "getBoundingClientRect",
  "currentTop - context.viewportTop",
  "window.scrollBy",
  "behavior: 'auto'",
  "focus({ preventScroll: true })",
  "details.forEach",
  "removeAttribute('open')",
  "requestAnimationFrame(() => requestAnimationFrame(callback))",
  "screen.dataset.focused",
]) {
  if (!controller.includes(text)) throw new Error(`A-M3 controller is missing ${text}.`);
}
for (const forbidden of ["candidate", "comparison", "cart", "orderTotal", "featured", "recommended"]) {
  if (controller.toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`A-M3 controller must not add ${forbidden}.`);
}

const styles = await readFile(new URL("multiscale-return.css", archive), "utf8");
for (const text of [
  ".phone-frame",
  "overflow: clip",
  '.multiscale-screen[data-focused="true"] .workspace-topbar',
  "position: sticky",
  "min-height: 2.6rem",
  "white-space: nowrap",
  "scroll-margin-top: 3.3rem",
  "@media (prefers-reduced-motion: reduce)",
]) {
  if (!styles.includes(text)) throw new Error(`A-M3 stylesheet is missing ${text}.`);
}
for (const forbidden of ["display: none", "visibility: hidden", ".scale-category-copy", ".scale-category-title", ".scale-category-price"]) {
  if (styles.includes(forbidden)) throw new Error(`A-M3 must not alter summary information with ${forbidden}.`);
}

const checks = JSON.parse(await readFile(new URL("browser-checks.json", evidence), "utf8"));
for (const viewport of ["320", "390", "desktop"]) {
  const result = checks[viewport];
  if (!result) throw new Error(`Missing A-M3 browser evidence for ${viewport}.`);
  for (const mode of ["parent", "child"]) {
    const initial = result[mode].initial;
    if (initial.categories !== 6 || initial.products !== 30 || initial.uniqueProducts !== 30 || initial.overflow) {
      throw new Error(`${viewport} ${mode} fixture or overflow evidence failed.`);
    }
  }
  if (Math.abs(result.child.sourceTopDelta) > 1 || !result.child.focusReturned || !result.child.resetVisibleAtDeepRead) {
    throw new Error(`${viewport} child return continuity failed.`);
  }
  if (result.child.deep.expanded !== 1 || result.child.deep.openDetails !== 1 || result.child.deep.resetPosition !== "sticky") {
    throw new Error(`${viewport} child deep-read state failed.`);
  }
  if (result.child.restored.expanded !== 0 || result.child.restored.openDetails !== 0 || !result.child.restored.resetDisabled) {
    throw new Error(`${viewport} child reset state failed.`);
  }
  if (Math.abs(result.parent.sourceTopDelta) < 100 || result.parent.focusReturned || result.parent.resetVisibleAtDeepRead) {
    throw new Error(`${viewport} parent control no longer demonstrates the original continuity failure.`);
  }
}

if (!checks.keyboard?.spaceReset || !checks.keyboard?.focusReturned || Math.abs(checks.keyboard?.sourceTopDelta ?? 999) > 1 || checks.keyboard?.openDetails !== 0) {
  throw new Error("A-M3 keyboard return continuity failed.");
}
if (!checks.reducedMotion?.reduced || checks.reducedMotion?.htmlScroll !== "auto" || checks.reducedMotion?.resetPosition !== "sticky") {
  throw new Error("A-M3 reduced-motion evidence failed.");
}

console.log("A-M3 Multi-scale Return Continuity validation passed.");
