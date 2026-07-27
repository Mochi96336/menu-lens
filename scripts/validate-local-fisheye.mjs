import { access, readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const archiveRoot = new URL("research-history/", root);
const childPath = "phases/10a-local-fisheye/index.html";

await Promise.all([
  access(new URL(childPath, archiveRoot)),
  access(new URL("local-fisheye.css", archiveRoot)),
  access(new URL("local-fisheye.js", archiveRoot)),
]);

const registrySource = await readFile(new URL("prototype-registry.js", archiveRoot), "utf8");
const registrySandbox = { window: {} };
runInNewContext(registrySource, registrySandbox, { filename: "research-history/prototype-registry.js" });
const child = registrySandbox.window.menuLensPrototypeRegistry.prototypes.find((prototype) => prototype.id === "10A");
if (!child) throw new Error("Prototype registry must contain 10A Local Fisheye.");
if (child.parentId !== "10" || child.family !== "horizontal") {
  throw new Error("10A must remain a horizontal child of 10.");
}
if (child.path !== childPath || child.validationProfile !== "fisheye-local") {
  throw new Error("10A must retain its registered path and local-fisheye validation profile.");
}

const childHtml = await readFile(new URL(childPath, archiveRoot), "utf8");
for (const reference of [
  '<link rel="stylesheet" href="../../fisheye-ribbon.css" />',
  '<link rel="stylesheet" href="../../local-fisheye.css" />',
  '<script src="../../menu-fixture.js"></script>',
  '<script src="../../fisheye-ribbon-renderer.js"></script>',
  '<script src="../../local-fisheye.js" defer></script>',
]) {
  if (!childHtml.includes(reference)) throw new Error(`10A is missing ${reference}.`);
}
if (childHtml.includes("選這道") || childHtml.includes("加入購物車")) {
  throw new Error("10A must remain a menu-reading study without an order action.");
}

const controllerSource = await readFile(new URL("local-fisheye.js", archiveRoot), "utf8");
const controllerSandbox = { window: {} };
runInNewContext(controllerSource, controllerSandbox, { filename: "research-history/local-fisheye.js" });
const helpers = controllerSandbox.window.MenuLensLocalFisheye;
if (!helpers || typeof helpers.computeProductLayout !== "function") {
  throw new Error("10A must expose a pure computeProductLayout helper.");
}

const productCount = 30;
const categoryEndIndices = [7, 13, 19, 23, 27, 29];
const epsilon = 1e-8;
const cumulativeBoundaries = (layout) => {
  let position = 0;
  const boundaries = [];
  layout.bases.forEach((basis, index) => {
    position += basis;
    if (categoryEndIndices.includes(index)) boundaries.push(position);
  });
  return boundaries;
};

for (const focusIndex of [0, 1, 2, 15, 27, 28, 29]) {
  const layout = helpers.computeProductLayout(productCount, focusIndex);
  const total = layout.bases.reduce((sum, basis) => sum + basis, 0);
  if (Math.abs(total - 100) > epsilon) throw new Error(`10A allocation must total 100%; received ${total}.`);
  if (layout.bases.length !== productCount || layout.bases.some((basis) => !Number.isFinite(basis) || basis <= 0)) {
    throw new Error("10A must allocate a positive finite width to all 30 products.");
  }
  layout.bases.forEach((basis, index) => {
    const distance = Math.abs(index - focusIndex);
    if (distance > helpers.LOCAL_RADIUS && Math.abs(basis - layout.farBasis) > epsilon) {
      throw new Error(`10A far product ${index} changed width at focus ${focusIndex}.`);
    }
  });
  const focusBasis = layout.bases[focusIndex];
  const neighbourIndex = focusIndex < productCount - 1 ? focusIndex + 1 : focusIndex - 1;
  const firstNeighbour = layout.bases[neighbourIndex] ?? 0;
  if (focusBasis <= firstNeighbour || focusBasis < 40) {
    throw new Error("10A focus product must retain the largest readable allocation.");
  }
}

for (const [from, to] of [[0, 1], [1, 2], [14, 15], [28, 29]]) {
  const first = helpers.computeProductLayout(productCount, from);
  const second = helpers.computeProductLayout(productCount, to);
  const firstBoundaries = cumulativeBoundaries(first);
  const secondBoundaries = cumulativeBoundaries(second);
  const localMin = Math.min(from, to) - helpers.LOCAL_RADIUS;
  const localMax = Math.max(from, to) + helpers.LOCAL_RADIUS;
  categoryEndIndices.forEach((endIndex, boundaryIndex) => {
    if (endIndex >= localMin && endIndex <= localMax) return;
    if (Math.abs(firstBoundaries[boundaryIndex] - secondBoundaries[boundaryIndex]) > epsilon) {
      throw new Error(`10A moved far category boundary ${boundaryIndex} from focus ${from} to ${to}.`);
    }
  });
}

for (const bannedMechanism of ["scrollLeft", "scrollTo(", "enableMenuLensHorizontalDrag", "snap"]) {
  if (controllerSource.includes(bannedMechanism)) {
    throw new Error(`10A must not add a scrolling or snapping mechanism: ${bannedMechanism}`);
  }
}

console.log("10A Local Fisheye validation passed: fixed ±2 neighbourhood, stable far widths, stable far category boundaries, 30 products.");
