import { readFile, writeFile, rm } from "node:fs/promises";

const path = "research-history/model-page.mjs";
let source = await readFile(path, "utf8");

const before = `  if (activeViewMode === "compare" && !canCompare) activeViewMode = "focus";

  elements.currentObjectTitle.textContent = objectLabel(activeObject);`;
const after = `  if (activeViewMode === "compare" && !canCompare) activeViewMode = "focus";
  setViewModeState(canCompare);

  elements.currentObjectTitle.textContent = objectLabel(activeObject);`;
if (!source.includes(before)) throw new Error("Could not locate live-stage visibility insertion point.");
source = source.replace(before, after);

const oldTail = `  if (activeViewMode === "all") renderAllPreviews();
  else elements.allPreviewGrid.replaceChildren();
  setViewModeState(canCompare);
  renderViewportState();`;
const newTail = `  if (activeViewMode === "all") renderAllPreviews();
  else elements.allPreviewGrid.replaceChildren();
  renderViewportState();`;
if (!source.includes(oldTail)) throw new Error("Could not locate the late view-mode update.");
source = source.replace(oldTail, newTail);

await writeFile(path, source);
await rm(".tmp-live-order-fix", { recursive: true, force: true });
console.log("Live stage is now revealed before iframe measurement.");
