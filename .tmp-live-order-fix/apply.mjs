import { readFile, writeFile, rm } from "node:fs/promises";

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
};

const rendererPath = "research-history/model-page.mjs";
let renderer = await readFile(rendererPath, "utf8");
renderer = replaceOnce(
  renderer,
  `  if (activeViewMode === "compare" && !canCompare) activeViewMode = "focus";

  elements.currentObjectTitle.textContent = objectLabel(activeObject);`,
  `  if (activeViewMode === "compare" && !canCompare) activeViewMode = "focus";
  setViewModeState(canCompare);

  elements.currentObjectTitle.textContent = objectLabel(activeObject);`,
  "reveal stage before live sync",
);
renderer = replaceOnce(
  renderer,
  `  if (activeViewMode === "all") renderAllPreviews();
  else elements.allPreviewGrid.replaceChildren();
  setViewModeState(canCompare);
  renderViewportState();`,
  `  if (activeViewMode === "all") renderAllPreviews();
  else elements.allPreviewGrid.replaceChildren();
  renderViewportState();`,
  "remove late stage visibility update",
);
await writeFile(rendererPath, renderer);

const adapterPath = "research-history/model-live-surface.mjs";
let adapter = await readFile(adapterPath, "utf8");
adapter = replaceOnce(
  adapter,
  `  const showFallback = (message, failed = false) => {
    frame.hidden = true;
    fallback.hidden = false;
    status.textContent = message;
    fallback.dataset.failed = String(failed);
    setState(failed ? "fallback" : "loading");
  };

  const showFrame = () => {
    fallback.hidden = true;
    frame.hidden = false;
    delete fallback.dataset.failed;
    setState("ready");
  };`,
  `  const showFallback = (message, failed = false, keepFrameMounted = Boolean(source)) => {
    frame.hidden = !keepFrameMounted;
    frame.style.visibility = keepFrameMounted ? "hidden" : "";
    frame.style.pointerEvents = keepFrameMounted ? "none" : "";
    fallback.hidden = false;
    status.textContent = message;
    fallback.dataset.failed = String(failed);
    setState(failed ? "fallback" : "loading");
  };

  const showFrame = () => {
    fallback.hidden = true;
    frame.hidden = false;
    frame.style.visibility = "visible";
    frame.style.pointerEvents = "auto";
    delete fallback.dataset.failed;
    setState("ready");
  };`,
  "keep iframe mounted while fallback is visible",
);
adapter = replaceOnce(
  adapter,
  `    activeTarget = match.target;
    activeSelector = match.selector;
    ensureDocumentStyle(frameDocument);`,
  `    activeTarget = match.target;
    activeSelector = match.selector;
    frame.hidden = false;
    ensureDocumentStyle(frameDocument);`,
  "mount iframe before measuring live root without disabling interaction",
);
adapter = replaceOnce(
  adapter,
  `      frame.removeAttribute("src");
      showFallback("此研究物件沒有獨立可操作畫面。", true);`,
  `      frame.removeAttribute("src");
      showFallback("此研究物件沒有獨立可操作畫面。", true, false);`,
  "fully hide frame without executable source",
);
await writeFile(adapterPath, adapter);

const cssPath = "research-history/model-page-workbench.css";
let css = await readFile(cssPath, "utf8");
css = replaceOnce(
  css,
  `.model-page .model-live-frame,
.model-page .model-live-fallback {
  width: var(--model-live-width, 390px);
  max-width: none;
}`,
  `.model-page .model-live-frame,
.model-page .model-live-fallback {
  grid-area: 1 / 1;
  width: var(--model-live-width, 390px);
  max-width: none;
}`,
  "overlay live frame and fallback",
);
await writeFile(cssPath, css);

await rm(".tmp-live-order-fix", { recursive: true, force: true });
console.log("Live frames remain measurable and operable while the static fallback is visible.");
