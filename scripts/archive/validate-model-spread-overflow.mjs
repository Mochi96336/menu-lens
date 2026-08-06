import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const modelPage = await readFile(
  new URL("../../research-history/models/index.html", import.meta.url),
  "utf8",
);
const spreadCleanup = await readFile(
  new URL("../../research-history/model-spread-overflow.mjs", import.meta.url),
  "utf8",
);
const spreadBrowserReview = await readFile(
  new URL("./validate-model-spread-overflow-browser.mjs", import.meta.url),
  "utf8",
);
const canonicalSpreadCss = await readFile(
  new URL("../../research-history/menu-spread.css", import.meta.url),
  "utf8",
);

assert.match(modelPage, /model-page-humanized\.mjs/);
assert.match(modelPage, /model-spread-overflow\.mjs/);
assert.match(spreadCleanup, /new Set\(\["08", "08A"\]\)/);
assert.match(spreadCleanup, /data-model-live-presentation-state="focus"/);
assert.match(spreadCleanup, /\.spread-phone[\s\S]*height: auto/);
assert.match(spreadCleanup, /\.spread-toolbar[\s\S]*position: fixed/);
assert.match(spreadCleanup, /\.spread-map[\s\S]*overflow-y: clip/);
assert.match(spreadCleanup, /\.spread-category\[data-focused="true"\][\s\S]*overflow: visible/);
assert.match(spreadCleanup, /\.spread-category__focus[\s\S]*position: fixed/);
assert.match(spreadCleanup, /--model-spread-header-left/);
assert.match(spreadCleanup, /--model-spread-header-width/);
assert.match(spreadCleanup, /model-spread-measuring/);
assert.match(spreadCleanup, /liveSpreadVerticalOwner/);
assert.match(spreadCleanup, /liveSpreadNestedVertical/);
assert.match(spreadCleanup, /liveSpreadLandmarks/);
assert.match(spreadCleanup, /spreadMap\.addEventListener\("scroll", queueGeometry/);
assert.match(spreadCleanup, /view\.addEventListener\("resize", queueGeometry/);
assert.match(spreadCleanup, /attributeFilter: \["data-mode", "data-focused", "open"\]/);
assert.doesNotMatch(
  spreadCleanup,
  /ribbon-|09A|#ribbon/,
  "Spread cleanup must not absorb Ribbon work.",
);

assert.match(canonicalSpreadCss, /\.spread-category\[data-focused="true"\][\s\S]*overflow-y: auto/);
assert.doesNotMatch(
  canonicalSpreadCss,
  /model-spread-single-scroll-style|liveSpreadVerticalOwner/,
  "Canonical Spread phase styling must remain unchanged.",
);

assert.match(spreadBrowserReview, /\["08", "08A"\]/);
assert.match(spreadBrowserReview, /\["320", "390", "desktop"\]/);
assert.match(spreadBrowserReview, /focusedScrollableY/);
assert.match(spreadBrowserReview, /mapScrollableY/);
assert.match(spreadBrowserReview, /maxFrameScroll/);
assert.match(spreadBrowserReview, /last Product stayed below viewport/);
assert.match(spreadBrowserReview, /first Product stayed below viewport/);
assert.match(spreadBrowserReview, /compressed category header is not sticky/);
assert.match(spreadBrowserReview, /inline detail expands iframe document/);
assert.match(spreadBrowserReview, /#spread-overview/);
assert.match(spreadBrowserReview, /captureScreenshot/);

console.log("Model Spread overflow validator: 08 / 08A use one iframe vertical owner with pinned real category controls, complete Product reachability, and Model-only cleanup.");
