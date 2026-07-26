import { access, readFile } from "node:fs/promises";
import { Script, runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);

const reconstructedSnapshots = [
  "phases/01-complete-menu/index.html",
  "phases/02-relational-reading/index.html",
  "phases/03-candidate-comparison/index.html",
  "phases/05-ledger-document/index.html",
  "phases/06-multiscale-menu-map/index.html",
];

const originalSnapshots = [
  {
    slug: "01-complete-menu",
    path: "originals/01-complete-menu/index.html",
    pullRequest: 3,
    commit: "087619c3cac4e7b019d58265b6233b3ff04e28f2",
  },
  {
    slug: "02-prototype-c",
    path: "originals/02-prototype-c/index.html",
    pullRequest: 4,
    commit: "b554f8a4784188d414ee2d82a434a0e1515d3579",
  },
  {
    slug: "03a-candidate-marks",
    path: "originals/03a-candidate-marks/index.html",
    pullRequest: 4,
    commit: "53963f4ad15a145e3d8f8e1e25d0a5a5e4b925c2",
  },
  {
    slug: "03b-candidate-workspace",
    path: "originals/03b-candidate-workspace/index.html",
    pullRequest: 4,
    commit: "5251bfcd6eafab132617891ed7bc98d6d3a551ca",
  },
  {
    slug: "04-bounded-comparison",
    path: "originals/04-bounded-comparison/index.html",
    pullRequest: 4,
    commit: "923be38046b28baf9ba4687a020290bd6a0afbf4",
  },
];

const requiredFiles = [
  "index.html",
  "history.css",
  "evidence.css",
  "menu-fixture.js",
  "originals/manifest.json",
  ...reconstructedSnapshots,
  ...originalSnapshots.flatMap(({ slug, path }) => [path, `originals/${slug}/ORIGIN.txt`]),
];

await Promise.all(requiredFiles.map((path) => access(new URL(path, archiveRoot))));

const archiveIndex = await readFile(new URL("index.html", archiveRoot), "utf8");
for (const snapshot of reconstructedSnapshots) {
  const href = `./${snapshot.replace(/index\.html$/, "")}`;
  if (!archiveIndex.includes(`href="${href}`)) {
    throw new Error(`Research archive index does not link to reconstruction ${href}`);
  }
}
for (const { path } of originalSnapshots) {
  const href = `./${path.replace(/index\.html$/, "")}`;
  if (!archiveIndex.includes(`href="${href}`)) {
    throw new Error(`Research archive index does not link to original snapshot ${href}`);
  }
}

const manifest = JSON.parse(await readFile(new URL("originals/manifest.json", archiveRoot), "utf8"));
if (!manifest || !Array.isArray(manifest.snapshots)) {
  throw new Error("Original snapshot manifest must expose a snapshots array.");
}
if (manifest.snapshots.length !== originalSnapshots.length) {
  throw new Error(
    `Original snapshot manifest must contain ${originalSnapshots.length} entries; received ${manifest.snapshots.length}.`,
  );
}

for (const expected of originalSnapshots) {
  const actual = manifest.snapshots.find((snapshot) => snapshot.slug === expected.slug);
  if (!actual) throw new Error(`Original snapshot manifest is missing ${expected.slug}.`);
  if (actual.sourceType !== "original_implementation") {
    throw new Error(`${expected.slug} must remain labelled original_implementation.`);
  }
  if (actual.repository !== "a20030824/menu-lens") {
    throw new Error(`${expected.slug} has an unexpected source repository.`);
  }
  if (actual.pullRequest !== expected.pullRequest) {
    throw new Error(`${expected.slug} must point to PR #${expected.pullRequest}.`);
  }
  if (actual.commit !== expected.commit) {
    throw new Error(`${expected.slug} must remain pinned to ${expected.commit}.`);
  }
  const origin = await readFile(new URL(`originals/${expected.slug}/ORIGIN.txt`, archiveRoot), "utf8");
  if (!origin.includes(`commit=${expected.commit}`)) {
    throw new Error(`${expected.slug}/ORIGIN.txt does not record its pinned commit.`);
  }
  const html = await readFile(new URL(expected.path, archiveRoot), "utf8");
  if (!html.startsWith("<!doctype html>")) {
    throw new Error(`${expected.path} must remain the standalone historical build entry.`);
  }
  if (!html.includes('<script type="module" src="./src/main.js"></script>')) {
    throw new Error(`${expected.path} must retain its original built module entry.`);
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

for (const snapshot of reconstructedSnapshots) {
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

console.log(
  `Research archive validation passed: ${originalSnapshots.length} original builds, ${reconstructedSnapshots.length} reconstructions/hypotheses, 6 categories, 30 products.`,
);
