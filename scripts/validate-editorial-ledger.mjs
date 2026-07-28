import { access, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archive = new URL("research-history/", root);
const evidence = new URL("docs/research-history/reviews/05b/", root);
const required = [
  "phases/05-ledger-document/index.html",
  "phases/05b-editorial-rhythm/index.html",
  "editorial-ledger.css",
  "editorial-ledger.js",
  "evidence.css",
  "menu-fixture.js",
];
const evidenceFiles = ["parent-child-contact-sheet.svg", "browser-checks.json"];
await Promise.all([
  ...required.map((path) => access(new URL(path, archive))),
  ...evidenceFiles.map((path) => access(new URL(path, evidence))),
]);

const sandbox = { window: {} };
runInNewContext(await readFile(new URL("menu-fixture.js", archive), "utf8"), sandbox);
runInNewContext(await readFile(new URL("editorial-ledger.js", archive), "utf8"), sandbox);
const menu = sandbox.window.menuLensResearchMenu;
const render = sandbox.window.renderMenuLensEditorialLedger;
if (!menu || menu.categories.length !== 6 || menu.products.length !== 30 || typeof render !== "function") {
  throw new Error("05B must use the shared 6-category / 30-product fixture and renderer.");
}

const markup = render(menu);
const productIds = [...markup.matchAll(/data-product-id="([^"]+)"/g)].map((match) => match[1]);
const categoryIds = [...markup.matchAll(/data-category-id="([^"]+)"/g)].map((match) => match[1]);
const expectedProducts = menu.categories.flatMap((category) =>
  menu.products.filter((product) => product.categoryId === category.id).map((product) => product.id),
);
if (productIds.length !== 30 || new Set(productIds).size !== 30 || productIds.join("|") !== expectedProducts.join("|")) {
  throw new Error("05B must render 30 unique Products once in canonical order.");
}
if (categoryIds.join("|") !== menu.categories.map((category) => category.id).join("|")) {
  throw new Error("05B must preserve all categories in canonical order.");
}

const countClass = (source, className) =>
  [...source.matchAll(/class="([^"]*)"/g)]
    .filter((match) => match[1].split(/\s+/).includes(className)).length;

for (const className of [
  "editorial-ledger-opener", "editorial-ledger-index", "editorial-ledger-summary",
  "editorial-ledger-meta", "editorial-ledger-description",
]) {
  if (countClass(markup, className) !== 6) {
    throw new Error(`05B must render ${className} exactly six times.`);
  }
}
for (const className of ["ledger-row", "ledger-product-name", "ledger-product-copy", "ledger-cue", "ledger-price", "ledger-detail"]) {
  if (countClass(markup, className) !== 30) {
    throw new Error(`05B must preserve parent row class ${className} exactly 30 times.`);
  }
}
for (const category of menu.categories) {
  if (!markup.includes(category.summary) || !markup.includes(category.description) || !markup.includes(category.priceRange)) {
    throw new Error(`05B category opener is missing fixture-backed content for ${category.id}.`);
  }
}
for (const product of menu.products) {
  for (const value of [product.name, product.description, product.cue, `NT$${product.price}`]) {
    if (!markup.includes(value)) throw new Error(`05B row is missing parent content for ${product.id}: ${value}`);
  }
}
for (const forbidden of ["選這道", "加入購物車", "Candidate", "comparison selection", "代表料理", "推薦料理"]) {
  if (markup.includes(forbidden)) throw new Error(`05B must remain a complete document without ${forbidden}.`);
}

const childHtml = await readFile(new URL("phases/05b-editorial-rhythm/index.html", archive), "utf8");
for (const text of [
  "../../history.css", "../../evidence.css", "../../editorial-ledger.css", "../../editorial-ledger.js",
  "../05-ledger-document/", "唯一變因", "Product row、欄位與 inline detail 保持 05 原樣",
]) {
  if (!childHtml.includes(text)) throw new Error(`05B page is missing ${text}.`);
}
const parentHtml = await readFile(new URL("phases/05-ledger-document/index.html", archive), "utf8");
if (!parentHtml.includes('class="ledger-row"') || !parentHtml.includes('class="ledger-product-copy"')) {
  throw new Error("05 parent row contract changed unexpectedly.");
}

const styles = await readFile(new URL("editorial-ledger.css", archive), "utf8");
for (const text of [
  "overflow-x: clip", "grid-template-columns: 3.25rem minmax(0, 1fr) auto",
  ".editorial-ledger-summary", ".editorial-ledger-category:first-child",
  "@media (max-width: 340px)", "@media (prefers-reduced-motion: reduce)",
]) {
  if (!styles.includes(text)) throw new Error(`05B stylesheet is missing ${text}.`);
}
for (const forbidden of ["overflow-x: auto", "border-radius:", "position: fixed", "display: none", "table-layout:"]) {
  if (styles.includes(forbidden)) throw new Error(`05B stylesheet must not introduce ${forbidden}.`);
}

const contactSheet = await readFile(new URL("parent-child-contact-sheet.svg", evidence), "utf8");
for (const text of ["Parent 05 · 320px", "Child 05B · 320px", "Parent 05 · 390px", "Child 05B · 390px", "Parent 05 · desktop", "Child 05B · desktop", "Child 05B · 390px detail"]) {
  if (!contactSheet.includes(text)) throw new Error(`05B view record is missing ${text}.`);
}

const checks = JSON.parse(await readFile(new URL("browser-checks.json", evidence), "utf8"));
for (const viewport of ["320", "390", "desktop"]) {
  const result = checks[viewport];
  if (!result || result.horizontalOverflow || result.categories !== 6 || result.products !== 30 || result.uniqueProducts !== 30) {
    throw new Error(`05B browser check failed at ${viewport}.`);
  }
  if (!result.rowGeometryMatchesParent || result.categoryMarginTopChild <= result.categoryMarginTopParent) {
    throw new Error(`05B must change category rhythm without changing Product row geometry at ${viewport}.`);
  }
  if (result.editorialSummaries !== 6 || result.soldOutWithinViewport !== true || !result.productOrderMatchesParent) {
    throw new Error(`05B category truth, order, or sold-out layout failed at ${viewport}.`);
  }
}
if (!checks.pointer?.opened || !checks.pointer?.closed || !checks.keyboard?.openedWithSpace || !checks.keyboard?.closedWithSpace || !checks.keyboard?.focusRetained) {
  throw new Error("05B pointer or keyboard detail behavior failed.");
}
if (checks.detailSwitch?.openCount !== 1 || checks.reset?.openCount !== 0 || !checks.reducedMotion?.matches || checks.reducedMotion?.transitionDuration !== "0s") {
  throw new Error("05B detail, reset, or reduced-motion evidence failed.");
}

console.log("05B Editorial Ledger validation passed: category rhythm changed; 05 Product rows and detail behavior retained.");
