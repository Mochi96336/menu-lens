import { access, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archive = new URL("research-history/", root);
const evidence = new URL("docs/research-history/reviews/05a/", root);
const required = [
  "phases/05a-minimal-ledger/index.html",
  "minimal-ledger.css",
  "minimal-ledger.js",
  "menu-fixture.js",
  "prototype-registry.js",
];
const screenshots = [
  "parent-320.webp", "parent-390.webp", "parent-desktop.webp",
  "child-320.webp", "child-390.webp", "child-desktop.webp", "child-390-detail.webp",
  "browser-checks.json",
];
await Promise.all([
  ...required.map((path) => access(new URL(path, archive))),
  ...screenshots.map((path) => access(new URL(path, evidence))),
]);

const sandbox = { window: {} };
runInNewContext(await readFile(new URL("menu-fixture.js", archive), "utf8"), sandbox);
runInNewContext(await readFile(new URL("minimal-ledger.js", archive), "utf8"), sandbox);
const menu = sandbox.window.menuLensResearchMenu;
const render = sandbox.window.renderMenuLensMinimalLedger;
if (!menu || menu.categories.length !== 6 || menu.products.length !== 30 || typeof render !== "function") {
  throw new Error("05A must use the shared 6-category / 30-product fixture and renderer.");
}

const markup = render(menu);
const productIds = [...markup.matchAll(/data-product-id="([^"]+)"/g)].map((match) => match[1]);
const categoryIds = [...markup.matchAll(/data-category-id="([^"]+)"/g)].map((match) => match[1]);
const expectedProducts = menu.categories.flatMap((category) =>
  menu.products.filter((product) => product.categoryId === category.id).map((product) => product.id),
);
if (productIds.length !== 30 || new Set(productIds).size !== 30 || productIds.join("|") !== expectedProducts.join("|")) {
  throw new Error("05A must render 30 unique Products once in canonical order.");
}
if (categoryIds.join("|") !== menu.categories.map((category) => category.id).join("|")) {
  throw new Error("05A must preserve all categories in canonical order.");
}

for (const className of ["minimal-ledger-name-wrap", "minimal-ledger-cue", "minimal-ledger-price", "minimal-ledger-disclosure", "minimal-ledger-description", "minimal-ledger-close"]) {
  if ([...markup.matchAll(new RegExp(`class="[^"]*${className}`, "g"))].length !== 30) {
    throw new Error(`05A must render ${className} exactly 30 times.`);
  }
}
for (const summary of markup.matchAll(/<summary class="minimal-ledger-summary">([\s\S]*?)<\/summary>/g)) {
  const row = summary[1];
  const order = ["minimal-ledger-name-wrap", "minimal-ledger-cue", "minimal-ledger-price", "minimal-ledger-disclosure"].map((name) => row.indexOf(name));
  if (order.some((index) => index < 0) || !order.every((value, index) => index === 0 || order[index - 1] < value)) {
    throw new Error("05A collapsed DOM order must remain name → cue → price → detail control.");
  }
  if (row.includes("minimal-ledger-description") || row.includes("<dl>")) {
    throw new Error("05A collapsed rows must not duplicate full description or metadata.");
  }
}
for (const product of menu.products) {
  if (!markup.includes(product.description)) throw new Error(`05A detail is missing ${product.id} description.`);
}
for (const forbidden of ["選這道", "加入購物車", "Candidate workspace", "comparison selection"]) {
  if (markup.includes(forbidden)) throw new Error(`05A must remain transaction-free: ${forbidden}`);
}

const html = await readFile(new URL("phases/05a-minimal-ledger/index.html", archive), "utf8");
for (const text of ["../../minimal-ledger.css", "../../minimal-ledger.js", "../05-ledger-document/", "唯一變因"] ) {
  if (!html.includes(text)) throw new Error(`05A page is missing ${text}.`);
}
const styles = await readFile(new URL("minimal-ledger.css", archive), "utf8");
for (const text of ["overflow-x: clip", "minmax(0, 1fr) 4.85rem 2.9rem", '"name price disclosure"', '"cue price disclosure"', "text-overflow: ellipsis", ":focus-visible", "@media (max-width: 340px)", "@media (prefers-reduced-motion: reduce)"]) {
  if (!styles.includes(text)) throw new Error(`05A stylesheet is missing ${text}.`);
}
for (const forbidden of ["overflow-x: auto", "table-layout:", "position: fixed", "border-radius: 1rem"]) {
  if (styles.includes(forbidden)) throw new Error(`05A stylesheet must not introduce ${forbidden}.`);
}

const registrySandbox = { window: {} };
runInNewContext(await readFile(new URL("prototype-registry.js", archive), "utf8"), registrySandbox);
const prototype = registrySandbox.window.menuLensPrototypeRegistry.prototypes.find((entry) => entry.id === "05A");
if (!prototype || prototype.parentId !== "05" || prototype.family !== "document" || prototype.validationProfile !== "minimal-ledger") {
  throw new Error("05A must remain a document-family child of 05 with the minimal-ledger profile.");
}

const checks = JSON.parse(await readFile(new URL("browser-checks.json", evidence), "utf8"));
for (const viewport of ["320", "390", "desktop"]) {
  const result = checks[viewport];
  if (!result || result.horizontalOverflow || result.categories !== 6 || result.products !== 30 || result.uniqueProducts !== 30) {
    throw new Error(`05A browser check failed at ${viewport}.`);
  }
}
if (!checks.pointer?.closed || !checks.pointer?.focusReturned || !checks.keyboard?.openedWithEnter || !checks.keyboard?.closedWithEscape || !checks.keyboard?.focusReturned) {
  throw new Error("05A pointer or keyboard continuity evidence failed.");
}
if (checks.detailSwitch?.openCount !== 1 || checks.reset?.openCount !== 0 || !checks.reducedMotion?.matches || checks.reducedMotion?.transitionDuration !== "0s") {
  throw new Error("05A detail, reset, or reduced-motion evidence failed.");
}

console.log("05A Minimal Ledger validation passed: 6 categories, 30 Products, minimal rows, inline detail and browser evidence.");
