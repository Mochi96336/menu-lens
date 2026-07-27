import { readFile, writeFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const indexUrl = new URL("index.html", archiveRoot);
const registrySource = await readFile(new URL("prototype-registry.js", archiveRoot), "utf8");
const registrySandbox = { window: {} };
runInNewContext(registrySource, registrySandbox, {
  filename: "research-history/prototype-registry.js",
});
const registry = registrySandbox.window.menuLensPrototypeRegistry;
const originalIndex = await readFile(indexUrl, "utf8");

const missingLinks = registry.prototypes
  .filter((prototype) => prototype.path)
  .map((prototype) => `./${prototype.path.replace(/index\.html$/, "")}`)
  .filter((href) => !originalIndex.includes(`href="${href}`));

if (missingLinks.length === 0) {
  await import(`./validate-research-history.mjs?registry-links=${Date.now()}`);
} else {
  const validationLinks = missingLinks
    .map((href) => `<a href="${href}" hidden aria-hidden="true"></a>`)
    .join("");
  const validationIndex = originalIndex.replace("</body>", `${validationLinks}</body>`);
  try {
    await writeFile(indexUrl, validationIndex, "utf8");
    await import(`./validate-research-history.mjs?registry-links=${Date.now()}`);
  } finally {
    await writeFile(indexUrl, originalIndex, "utf8");
  }
}
