import { access, readFile } from "node:fs/promises";
import { loadArchiveCatalog, root } from "./load-catalog.mjs";

const catalog = await loadArchiveCatalog();
const archiveRoot = new URL("research-history/", root);

const requiredPaths = new Set([
  "index.html",
  "archive-index.css",
  "prototype-registry.js",
  "catalog/index.mjs",
  "catalog/extensions.mjs",
  "catalog/landscape-ablations.mjs",
  "catalog/closure-intakes.mjs",
  "catalog/all-extensions.mjs",
  "catalog/render-index.mjs",
  "originals/manifest.json",
]);

for (const object of catalog.objects) {
  if (object.entrypoint) requiredPaths.add(object.entrypoint);
  if (object.reviewDocument) requiredPaths.add(object.reviewDocument);
  if (object.evidencePath) requiredPaths.add(object.evidencePath);
  for (const asset of [...object.assets.styles, ...object.assets.scripts]) requiredPaths.add(asset);
}

await Promise.all([...requiredPaths].map((path) => access(new URL(path, archiveRoot))));

const [index, renderer, loader] = await Promise.all([
  readFile(new URL("index.html", archiveRoot), "utf8"),
  readFile(new URL("catalog/render-index.mjs", archiveRoot), "utf8"),
  readFile(new URL("scripts/archive/load-catalog.mjs", root), "utf8"),
]);

for (const contract of [
  '<script src="./prototype-registry.js"></script>',
  '<script type="module" src="./catalog/render-index.mjs"></script>',
  'id="archive-objects"',
  'id="archive-families"',
  'id="archive-originals"',
  'id="object-count"',
  'id="executable-count"',
  'id="study-count"',
  'id="type-filter"',
  'id="disposition-filter"',
  'id="catalog-empty"',
]) {
  if (!index.includes(contract)) throw new Error(`Archive index is missing v2 contract: ${contract}`);
}

for (const source of [renderer, loader]) {
  if (!source.includes("archiveExtensions") || !source.includes("all-extensions.mjs")) {
    throw new Error("Browser renderer and Node loader must both consume catalog/all-extensions.mjs.");
  }
}

for (const object of catalog.objects.filter((item) => item.entrypoint)) {
  const literalHref = `href="./${object.entrypoint.replace(/index\.html$/, "")}`;
  if (index.includes(literalHref)) {
    throw new Error(`Archive index must not hand-maintain catalog link ${literalHref}`);
  }
}

if (renderer.includes('review.href = `../')) {
  throw new Error("Archive review links must remain relative to the published research-history root.");
}

console.log(`Archive entrypoints: ${requiredPaths.size} paths verified without hand-written object links.`);
