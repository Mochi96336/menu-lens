import { access, readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const requiredSnapshots = [
  "phases/01-complete-menu/index.html",
  "phases/02-relational-reading/index.html",
  "phases/03-candidate-comparison/index.html",
  "phases/05-ledger-document/index.html",
  "phases/06-multiscale-menu-map/index.html",
];

const requiredFiles = [
  "index.html",
  "history.css",
  "evidence.css",
  "menu-fixture.js",
  ...requiredSnapshots,
];

await Promise.all(requiredFiles.map((path) => access(new URL(path, archiveRoot))));

const archiveIndex = await readFile(new URL("index.html", archiveRoot), "utf8");
for (const snapshot of requiredSnapshots) {
  const href = `./${snapshot.replace(/index\.html$/, "")}`;
  if (!archiveIndex.includes(`href="${href}"`)) {
    throw new Error(`Research archive index does not link to ${href}`);
  }
}

const fixtureSource = await readFile(new URL("menu-fixture.js", archiveRoot), "utf8");
const fixtureSandbox = { window: {} };
runInNewContext(fixtureSource, fixtureSandbox, { filename: "research-history/menu-fixture.js" });
const menu = fixtureSandbox.window.menuLensResearchMenu;

if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.products)) {
  throw new Error("Research fixture must expose categories and products.");
}
if (menu.categories.length !== 6) {
  throw new Error(`Research fixture must contain 6 categories; received ${menu.categories.length}.`);
}
if (menu.products.length !== 30) {
  throw new Error(`Research fixture must contain 30 products; received ${menu.products.length}.`);
}

const categoryIds = new Set(menu.categories.map((category) => category.id));
const productIds = new Set();
for (const product of menu.products) {
  if (productIds.has(product.id)) throw new Error(`Duplicate research ProductId: ${product.id}`);
  productIds.add(product.id);
  if (!categoryIds.has(product.categoryId)) {
    throw new Error(`Research product ${product.id} references unknown category ${product.categoryId}.`);
  }
}

for (const snapshot of requiredSnapshots) {
  const html = await readFile(new URL(snapshot, archiveRoot), "utf8");
  if (!html.startsWith("<!doctype html>")) {
    throw new Error(`${snapshot} must remain a standalone HTML document.`);
  }
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  inlineScripts.forEach((source, index) => {
    new Script(source, { filename: `${snapshot}#inline-script-${index + 1}` });
  });
}

console.log("Research archive validation passed: 5 snapshots, 6 categories, 30 products.");
