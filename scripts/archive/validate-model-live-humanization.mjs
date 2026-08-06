import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const bootstrap = await readFile(
  new URL("../../research-history/model-page-humanized.mjs", import.meta.url),
  "utf8",
);
const modelPage = await readFile(
  new URL("../../research-history/models/index.html", import.meta.url),
  "utf8",
);
const browserReview = await readFile(
  new URL("./validate-model-live-presentation-browser.mjs", import.meta.url),
  "utf8",
);
const stageBrowserReview = await readFile(
  new URL("./validate-model-live-stage-browser.mjs", import.meta.url),
  "utf8",
);
const documentFlowReview = await readFile(
  new URL("./validate-model-document-flow-browser.mjs", import.meta.url),
  "utf8",
);

assert.match(bootstrap, /import "\.\/model-page\.mjs"/, "Humanization must extend the canonical Model page renderer.");
assert.match(bootstrap, /\.phone-status\s*\{\s*display: none/s, "Every Model live preview should remove the fake phone status row.");
assert.match(bootstrap, /\.multiscale-screen > header/);
assert.match(bootstrap, /\.paper-restaurant/);
assert.match(bootstrap, /\.projection-restaurant/);
assert.match(bootstrap, /\.atlas-hint/);
assert.match(bootstrap, /#collapse-all[\s\S]*← 返回分類/);
assert.match(bootstrap, /#spread-overview[\s\S]*← 返回分類/);
assert.match(bootstrap, /#ribbon-overview[\s\S]*← 返回菜單/);
assert.doesNotMatch(bootstrap, /← 返回全部分類|← 返回全部料理/);
assert.match(bootstrap, /聚焦這個分類/);
assert.match(bootstrap, /恢復原比例/);
assert.match(bootstrap, /inline detail/);
assert.match(bootstrap, /aria-live", "off"/);
assert.match(bootstrap, /objectId === "18A"/);
assert.match(bootstrap, /#proportional-location-meta/);
assert.match(bootstrap, /上一個分類欄/);
assert.match(bootstrap, /grid-template-areas: "previous location next"/);
assert.match(bootstrap, /MutationObserver/, "Dynamic prototype labels must remain sanitized after state changes.");

assert.match(
  bootstrap,
  /documentObjectIds = new Set\(\["01", "05", "05A", "05B", "05C", "07"\]\)/,
  "Only the document family and market document baseline should use natural flow.",
);
assert.match(bootstrap, /html\.model-live-document[\s\S]*overflow-y: hidden/);
assert.match(bootstrap, /html\.model-live-document[\s\S]*touch-action: pan-x/);
assert.match(bootstrap, /html\.model-live-document \.phone-screen[\s\S]*min-height: 0/);
assert.match(bootstrap, /html\.model-live-document \.atlas-scroll[\s\S]*overflow-y: visible/);
assert.match(bootstrap, /outerHumanizationCss/);
assert.match(bootstrap, /data-model-live-document-flow/);
assert.match(bootstrap, /--model-live-document-height/);
assert.match(bootstrap, /frame\.setAttribute\("scrolling", "no"\)/);
assert.match(bootstrap, /root\.dataset\.liveLayout = "document"/);
assert.match(bootstrap, /root\.dataset\.liveNaturalHeight/);
assert.match(bootstrap, /root\.dataset\.liveDocumentContentHeight/);
assert.match(bootstrap, /root\.dataset\.liveDocumentOverflow = "false"/);
assert.doesNotMatch(
  bootstrap,
  /root\.dataset\.liveOverflow = "false"/,
  "Document flow must not race the base fixed-stage overflow metadata.",
);
assert.match(bootstrap, /requestFrame\.call\(documentRoot\.defaultView, sync\)/);
assert.match(bootstrap, /contentResizeObserver\.observe\(liveTarget\)/);
assert.match(bootstrap, /frameResizeObserver\.observe\(frame\)/);
assert.match(bootstrap, /installDocumentInputForwarding/);
assert.match(bootstrap, /addEventListener\("wheel"/);
assert.match(bootstrap, /addEventListener\("pointermove"/);
assert.match(bootstrap, /addEventListener\("keydown"/);
assert.match(bootstrap, /parentView\.scrollBy/);
assert.match(bootstrap, /"open"/, "Inline document details must trigger a natural-height resync.");

assert.match(modelPage, /<button id="show-all" type="button" hidden>回模型列表<\/button>/);
assert.match(modelPage, /src="\.\.\/model-page-humanized\.mjs"/);
assert.doesNotMatch(modelPage, />返回整組<|>返回群組</);

assert.match(browserReview, /modelLivePresentationEntries/, "Browser review must retain full mapped-object coverage.");
assert.match(browserReview, /documentSurfaceCases/, "Document-like models must receive the global phone-row cleanup too.");
assert.match(browserReview, /Input\.dispatchMouseEvent/, "Interaction review must use real pointer input.");
assert.match(browserReview, /elementFromPoint/, "Interactive controls must be hit tested.");
assert.match(browserReview, /← 返回分類/);
assert.match(browserReview, /← 返回菜單/);
assert.match(browserReview, /回模型列表/);
assert.match(browserReview, /captureScreenshot/, "390px focused states should leave visual evidence.");

assert.match(stageBrowserReview, /documentCases/, "Live-stage browser review must include explicit document routes.");
assert.match(stageBrowserReview, /liveLayout === "document"/);
assert.match(stageBrowserReview, /surface\.scrolling !== "no"/);
assert.match(stageBrowserReview, /\.atlas-product summary/);
assert.match(stageBrowserReview, /document-natural-flow/);

assert.match(documentFlowReview, /stableDocumentSnapshot/);
assert.match(documentFlowReview, /liveDocumentContentHeight/);
assert.match(documentFlowReview, /Input\.dispatchMouseEvent/);
assert.match(documentFlowReview, /type: "mouseWheel"/);
assert.match(documentFlowReview, /Input\.dispatchTouchEvent/);
assert.match(documentFlowReview, /Input\.dispatchKeyEvent/);
assert.match(documentFlowReview, /PageDown/);
assert.match(documentFlowReview, /ArrowDown/);
assert.match(documentFlowReview, /Space/);
assert.match(documentFlowReview, /window\.scrollY/);
assert.match(documentFlowReview, /frameBefore/);
assert.match(documentFlowReview, /Math\.abs\(frame\.contentWindow\.scrollY - \$\{frameBefore\}\)/);
assert.match(documentFlowReview, /\["05", "05A", "05B", "05C"\]/);

console.log("Model live humanization validator: shared chrome, stable document metadata, real outer-page input forwarding, language, and continuous navigation are explicit and browser-reviewed.");
