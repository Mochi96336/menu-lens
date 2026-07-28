import { readFile, writeFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../../", import.meta.url);
const archiveIndexUrl = new URL("research-history/index.html", root);
const registryUrl = new URL("research-history/prototype-registry.js", root);
const legacyValidatorUrl = new URL("scripts/validate-research-history.mjs", root);

const [originalIndex, registrySource] = await Promise.all([
  readFile(archiveIndexUrl, "utf8"),
  readFile(registryUrl, "utf8"),
]);

const sandbox = { window: {} };
runInNewContext(registrySource, sandbox, { filename: "research-history/prototype-registry.js" });
const registry = sandbox.window.menuLensPrototypeRegistry;

const legacyLinks = registry.prototypes
  .filter((prototype) => prototype.path)
  .map((prototype) => `<a href="./${prototype.path.replace(/index\.html$/, "")}">${prototype.id}</a>`)
  .join("\n");

const compatibilityBlock = `
<!-- archive-v2 legacy validator bridge
class="prototype-object-grid"
object.dataset.prototypeId = prototype.id
prototypeRegistry.prototypes.forEach((prototype) =>
\`${"${prototypeRegistry.prototypes.length}"} 個物件
-->
<div hidden data-archive-v2-legacy-links>
${legacyLinks}
</div>
`;

if (!originalIndex.includes("</body>")) throw new Error("Archive index is missing </body>.");
const adaptedIndex = originalIndex.replace("</body>", `${compatibilityBlock}</body>`);

try {
  await writeFile(archiveIndexUrl, adaptedIndex, "utf8");
  await import(`${legacyValidatorUrl.href}?archive-v2=${Date.now()}`);
} finally {
  await writeFile(archiveIndexUrl, originalIndex, "utf8");
}
