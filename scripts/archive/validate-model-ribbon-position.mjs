import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modelPage = await readFile(
  new URL("../../research-history/models/index.html", import.meta.url),
  "utf8",
);
const ribbonPosition = await readFile(
  new URL("../../research-history/model-ribbon-position.mjs", import.meta.url),
  "utf8",
);
const ribbonBrowserReview = await readFile(
  new URL("./validate-model-ribbon-position-browser.mjs", import.meta.url),
  "utf8",
);
const rapidDragReview = await readFile(
  new URL("./validate-model-ribbon-rapid-drag-browser.mjs", import.meta.url),
  "utf8",
);
const canonicalRibbonCss = await readFile(
  new URL("../../research-history/horizontal-ribbon.css", import.meta.url),
  "utf8",
);

assert.match(modelPage, /model-ribbon-position\.mjs/);
assert.match(ribbonPosition, /new Set\(\["09", "09A"\]\)/);
assert.match(ribbonPosition, /data-model-ribbon-handle-ready="true"/);
assert.match(ribbonPosition, /--model-ribbon-handle-left/);
assert.match(ribbonPosition, /--model-ribbon-handle-width/);
assert.match(ribbonPosition, /role", "slider"/);
assert.match(ribbonPosition, /aria-controls", "ribbon-viewport"/);
assert.match(ribbonPosition, /aria-valuetext/);
assert.match(ribbonPosition, /aria-disabled", "false"/);
assert.match(ribbonPosition, /scrollbar-width: none/);
assert.match(ribbonPosition, /::-webkit-scrollbar/);
assert.match(ribbonPosition, /scrollToClientX/);
assert.match(ribbonPosition, /viewport\.scrollWidth - viewport\.clientWidth/);
assert.match(ribbonPosition, /scrollTo\(\{ left: \(handleLeft \/ travel\) \* maximum, behavior: "auto" \}\)/);
assert.match(ribbonPosition, /event\.stopImmediatePropagation\(\)/);
assert.match(ribbonPosition, /pointerdown/);
assert.match(ribbonPosition, /pointermove/);
assert.match(ribbonPosition, /PageDown/);
assert.match(ribbonPosition, /Home/);
assert.match(ribbonPosition, /End/);
assert.match(ribbonPosition, /liveRibbonNativeScrollbar/);
assert.match(ribbonPosition, /viewport\.dataset\.scale === "reading"[\s\S]*\? "hidden"[\s\S]*: "inactive"/);
assert.match(ribbonPosition, /liveRibbonHandleLeft/);
assert.match(ribbonPosition, /liveRibbonHandleWidth/);
assert.match(ribbonPosition, /liveRibbonPointerSettled/);
assert.match(ribbonPosition, /queueOverviewSettle/);
assert.match(ribbonPosition, /settleOverviewPointer/);
assert.match(ribbonPosition, /overviewSettleFrames >= 12/);
assert.match(ribbonPosition, /overviewStableFrames >= 3/);
assert.match(ribbonPosition, /overviewSettleFrames >= 24/);
assert.match(ribbonPosition, /ResizeObserver/);
assert.match(ribbonPosition, /MutationObserver/);
assert.doesNotMatch(
  ribbonPosition,
  /debugRibbon|spread-|08A|#spread/,
  "Ribbon position cleanup must not contain debug state or absorb Spread work.",
);

assert.match(canonicalRibbonCss, /\.ribbon-viewport\[data-scale="reading"\] \{ overflow-x: auto; \}/);
assert.match(canonicalRibbonCss, /\.ribbon-minimap__window[\s\S]*pointer-events: none/);
assert.doesNotMatch(
  canonicalRibbonCss,
  /model-ribbon-position-style|liveRibbonNativeScrollbar/,
  "Canonical Ribbon phase styling must remain unchanged.",
);

assert.match(ribbonBrowserReview, /\["09", "09A"\]/);
assert.match(ribbonBrowserReview, /\["320", "390", "desktop"\]/);
assert.match(ribbonBrowserReview, /Input\.dispatchMouseEvent/);
assert.match(ribbonBrowserReview, /type: "mouseWheel"/);
assert.match(ribbonBrowserReview, /Input\.dispatchKeyEvent/);
assert.match(ribbonBrowserReview, /prefers-reduced-motion/);
assert.match(ribbonBrowserReview, /unreachableProducts/);
assert.match(ribbonBrowserReview, /nativeScrollbar/);
assert.match(ribbonBrowserReview, /nativeEvidence/);
assert.match(ribbonBrowserReview, /handleWidthRatio/);
assert.match(ribbonBrowserReview, /handleLeftRatio/);
assert.match(ribbonBrowserReview, /handleHittable/);
assert.match(ribbonBrowserReview, /handleAriaDisabled/);
assert.match(ribbonBrowserReview, /handleAriaText/);
assert.match(ribbonBrowserReview, /dragHandleToRatio/);
assert.match(ribbonBrowserReview, /handle enters reading/);
assert.doesNotMatch(
  ribbonBrowserReview,
  /clickSelector\(client, objectId, "#ribbon-reading"\)/,
  "The hidden research scale switch must not masquerade as user-facing browser evidence.",
);
assert.match(ribbonBrowserReview, /#ribbon-overview/);
assert.match(ribbonBrowserReview, /captureScreenshot/);

assert.match(rapidDragReview, /variant: "09A"/);
assert.match(rapidDragReview, /viewport: "390"/);
assert.match(rapidDragReview, /type: "mousePressed"/);
assert.match(rapidDragReview, /type: "mouseMoved"/);
assert.match(rapidDragReview, /type: "mouseReleased"/);
assert.match(rapidDragReview, /liveRibbonPointerSettled === 'true'/);
assert.match(rapidDragReview, /handleCenterTop - targetX/);
assert.match(rapidDragReview, /actualProgress - expectedProgress/);
assert.match(rapidDragReview, /model-ribbon-rapid-overview-drag-09A-390\.png/);

console.log("Model Ribbon position validator: 09 / 09A expose one operable, directly mapped minimap handle, stabilize rapid overview drags across reading layout changes, hide native scrollbar chrome only while reading after readiness, and retain complete Ribbon reachability.");
