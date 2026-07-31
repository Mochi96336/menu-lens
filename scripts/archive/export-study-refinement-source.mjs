import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const outputRoot = join(root, "dist", "__validated-source");
const paths = [
  "research-history/catalog/study-presentations.mjs",
  "research-history/model-page.mjs",
  "research-history/model-object-inspector.mjs",
  "research-history/models/index.html",
  "research-history/model-page-workbench.css",
  "scripts/archive/validate-model-page-renderer.mjs",
  "scripts/archive/capture-model-page-review.mjs",
];

for (const relativePath of paths) {
  const target = join(outputRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, relativePath), target);
}

console.log(`Exported ${paths.length} validated study-refinement source files.`);
