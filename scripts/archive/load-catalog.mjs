import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { buildArchiveCatalog } from "../../research-history/catalog/index.mjs";

const root = new URL("../../", import.meta.url);

export async function loadArchiveCatalog() {
  const registrySource = await readFile(new URL("research-history/prototype-registry.js", root), "utf8");
  const sandbox = { window: {} };
  runInNewContext(registrySource, sandbox, {
    filename: "research-history/prototype-registry.js",
  });
  return buildArchiveCatalog(sandbox.window.menuLensPrototypeRegistry);
}

export { root };
