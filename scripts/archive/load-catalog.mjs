import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { buildArchiveCatalog } from "../../research-history/catalog/index.mjs";
import { archiveExtensions } from "../../research-history/catalog/extensions.mjs";
import { archiveLegacyOverrides } from "../../research-history/catalog/legacy-overrides.mjs";

const root = new URL("../../", import.meta.url);

export async function loadArchiveCatalog() {
  const registrySource = await readFile(new URL("research-history/prototype-registry.js", root), "utf8");
  const sandbox = { window: {} };
  runInNewContext(registrySource, sandbox, {
    filename: "research-history/prototype-registry.js",
  });
  return buildArchiveCatalog(
    sandbox.window.menuLensPrototypeRegistry,
    archiveExtensions,
    archiveLegacyOverrides,
  );
}

export { root };
