import { access, readFile } from "node:fs/promises";
import { loadArchiveCatalog, root } from "./load-catalog.mjs";

const catalog = await loadArchiveCatalog();
const archiveRoot = new URL("research-history/", root);

const requiredPaths = new Set([
  "index.html",
  "archive-index.css",
  "prototype-registry.js",
  "catalog/index.mjs",
  "catalog/render-index.mjs",
  "originals/manifest.json",
]);

for (const object of catalog.objects) {
  if (object.entrypoint) requiredPaths.add(object.entrypoint);
  for (const asset of [...object.assets.styles, ...object.assets.scripts]) requiredPaths.add(asset);
}

await Promise.all([...requiredPaths].map((path) => access(new URL(path, archiveRoot))));

const index = await readFile(new URL("index.html", archiveRoot), "utf8");
for (const contract of [
  '<script src="./prototype-registry.js"></script>',
  '<script type="module" src="./catalog/render-index.mjs"></script>',
  'id="archive-objects"',
  'id="archive-families"',
  'id="archive-originals"',
]) {
  if (!index.includes(contract)) throw new Error(`Archive index is missing v2 contract: ${contract}`);
}

for (const object of catalog.objects.filter((item) => item.entrypoint)) {
  const literalHref = `href="./${object.entrypoint.replace(/index\.html$/, "")}`;
  if (index.includes(literalHref)) {
    throw new Error(`Archive index must not hand-maintain catalog link ${literalHref}`);
  }
}

console.log(`Archive entrypoints: ${requiredPaths.size} paths verified without hand-written object links.`);
