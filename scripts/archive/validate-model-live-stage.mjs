import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { modelLiveStageHeightFor } from "../../research-history/model-live-surface.mjs";
import {
  modelLivePresentationEntries,
  modelLivePresentationFor,
  modelLivePresentationProfiles,
} from "../../research-history/catalog/model-live-presentations.mjs";

assert.equal(modelLiveStageHeightFor(320), 568, "320px spatial previews should keep the fixed phone stage.");
assert.equal(modelLiveStageHeightFor(390), 693, "390px spatial previews should keep the fixed phone stage.");
assert.equal(modelLiveStageHeightFor(1024), 640, "Desktop spatial previews should keep the fixed wide stage.");
assert.equal(modelLiveStageHeightFor("390"), 693, "String viewport values should resolve consistently.");
assert.equal(modelLiveStageHeightFor(777), 640, "Unknown widths should fall back to the desktop stage height.");

assert.equal(modelLivePresentationFor("01"), null, "Scrolling documents should keep their native document presentation.");
assert.equal(modelLivePresentationFor("05C"), null, "Ledger variants should not inherit fixed-canvas cleanup.");
assert.equal(modelLivePresentationFor("A-M3"), null, "Correction records should not pretend to be independent live surfaces.");
assert.equal(modelLivePresentationFor("A-M4"), null, "Correction records should not pretend to be independent live surfaces.");
assert.equal(modelLivePresentationFor("06")?.id, "multiscale");
assert.equal(modelLivePresentationFor("08A")?.id, "spread");
assert.equal(modelLivePresentationFor("09A")?.id, "ribbon");
assert.equal(modelLivePresentationFor("10A")?.id, "fisheye");
assert.equal(modelLivePresentationFor("12A")?.id, "paper");
assert.equal(modelLivePresentationFor("13")?.id, "loupe");
assert.equal(modelLivePresentationFor("18A")?.id, "landscape-continuous");
assert.equal(modelLivePresentationFor("19")?.id, "rigid-sheet");
assert.equal(modelLivePresentationFor("20")?.id, "trifold");
assert.equal(modelLivePresentationFor("21")?.id, "two-column");
assert.equal(modelLivePresentationFor("22D")?.id, "landscape-focus");
assert.equal(modelLivePresentationFor("24C")?.id, "landscape-camera");
assert.equal(modelLivePresentationFor("25B")?.id, "volume");
assert.equal(modelLivePresentationFor("25P")?.id, "projection");
assert.equal(modelLivePresentationFor("26C")?.id, "parallax");

assert.equal(modelLivePresentationEntries.length, 44, "All interactive presentation objects should remain enumerable.");
assert.equal(
  new Set(modelLivePresentationEntries.map(({ objectId }) => objectId)).size,
  modelLivePresentationEntries.length,
  "An object must not be assigned to more than one presentation profile.",
);
for (const { objectId, profileId } of modelLivePresentationEntries) {
  assert.equal(modelLivePresentationFor(objectId)?.id, profileId, `${objectId} should resolve to its exported profile.`);
  assert.ok(
    Object.values(modelLivePresentationProfiles).some((profile) => profile.id === profileId),
    `${objectId} references missing profile ${profileId}.`,
  );
}

const mutationFor = (profile, selector) =>
  profile.mutations.find((mutation) => mutation.selector === selector);

assert.equal(mutationFor(modelLivePresentationProfiles.multiscale, "#collapse-all")?.text, "← 返回全部分類");
assert.equal(mutationFor(modelLivePresentationProfiles.spread, "#spread-overview")?.text, "← 返回全部分類");
assert.equal(mutationFor(modelLivePresentationProfiles.ribbon, "#ribbon-overview")?.text, "← 返回全部料理");
assert.equal(mutationFor(modelLivePresentationProfiles.fisheye, "#fisheye-category-lens")?.text, "← 返回分類");
assert.equal(mutationFor(modelLivePresentationProfiles.matrix, "#matrix-overview")?.text, "← 返回矩陣");
assert.equal(
  mutationFor(modelLivePresentationProfiles.paper, ".paper-toolbar > button:first-child")?.text,
  "← 返回全覽",
);
assert.equal(
  mutationFor(modelLivePresentationProfiles.landscapeFocus, ".paper-toolbar > button:first-child")?.text,
  "← 返回全覽",
);
assert.equal(mutationFor(modelLivePresentationProfiles.volume, "#volume-overview")?.text, "← 返回全覽");

assert.equal(modelLivePresentationProfiles.spread.state.selector, ".spread-map");
assert.equal(modelLivePresentationProfiles.paper.state.selector, ".paper-viewport");
assert.equal(modelLivePresentationProfiles.landscapeCamera.state.selector, ".landscape-viewport");
assert.equal(modelLivePresentationProfiles.landscapeCamera.state.map.reading, "focus");
assert.equal(modelLivePresentationProfiles.landscapeContinuous.state, null, "18A navigation is continuous, not a return state.");
assert.ok(modelLivePresentationProfiles.landscapeFocus.state.activeSelectors.includes(".paper-category[data-focused=\"true\"]"));
assert.equal(modelLivePresentationProfiles.volume.state.selector, "#volume-stack");

const combinedCss = Object.values(modelLivePresentationProfiles).map((profile) => profile.css).join("\n");
assert.match(modelLivePresentationProfiles.spread.css, /#spread-overview/);
assert.match(modelLivePresentationProfiles.spread.css, /\.spread-hint/);
assert.match(modelLivePresentationProfiles.matrix.css, /#matrix-overview/);
assert.match(modelLivePresentationProfiles.paper.css, /button:first-child/);
assert.match(modelLivePresentationProfiles.paper.css, /\.paper-hint/);
assert.match(modelLivePresentationProfiles.fisheye.css, /#fisheye-category-lens/);
assert.match(modelLivePresentationProfiles.fisheye.css, /\.fisheye-hint/);
assert.match(modelLivePresentationProfiles.ribbon.css, /#ribbon-overview/);
assert.match(modelLivePresentationProfiles.multiscale.css, /#collapse-all/);
assert.match(modelLivePresentationProfiles.loupe.css, /\.paper-toolbar/);
assert.match(modelLivePresentationProfiles.landscapeContinuous.css, /\.paper-location/);
assert.match(modelLivePresentationProfiles.rigidSheet.css, /#rigid-overview/);
assert.match(modelLivePresentationProfiles.trifold.css, /#trifold-overview/);
assert.match(modelLivePresentationProfiles.twoColumn.css, /#window-overview/);
assert.match(modelLivePresentationProfiles.volume.css, /#volume-overview/);
assert.match(combinedCss, /\.phone-status\s*\{\s*display: none/s, "Mapped live prototypes should remove the fake phone status row.");
assert.match(combinedCss, /min-height: 3\.15rem/, "Focus returns should receive a small dedicated row instead of covering menu content.");
assert.match(combinedCss, /position: relative/, "Focus return rows should stay in normal flow.");
assert.doesNotMatch(
  combinedCss,
  /\.phone-screen\s*>\s*header|\[class\*=["']toolbar["']\]/,
  "Presentation cleanup must stay model-specific rather than hiding generic prototype chrome.",
);

const source = await readFile(
  new URL("../../research-history/model-live-surface.mjs", import.meta.url),
  "utf8",
);
const humanizationSource = await readFile(
  new URL("../../research-history/model-page-humanized.mjs", import.meta.url),
  "utf8",
);
const presentationSource = await readFile(
  new URL("../../research-history/catalog/model-live-presentations.mjs", import.meta.url),
  "utf8",
);
const browserReview = await readFile(
  new URL("./capture-model-page-review.mjs", import.meta.url),
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
const presentationBrowserReview = await readFile(
  new URL("./validate-model-live-presentation-browser.mjs", import.meta.url),
  "utf8",
);

assert.match(source, /frame\.setAttribute\("scrolling", "auto"\)/, "The base live surface should start as an internally scrollable fixed stage.");
assert.doesNotMatch(source, /frame\.style\.height\s*=\s*`\$\{height\}px`/, "Core measurement should not resize every model indiscriminately.");
assert.match(source, /root\.dataset\.liveContentHeight/, "Fixed-stage content height should remain observable.");
assert.match(source, /root\.dataset\.liveOverflow/, "Fixed-stage overflow should remain observable.");
assert.match(source, /fallback\.style\.position\s*=\s*"absolute"/, "Loading fallback must not double the stage height.");
assert.match(source, /modelLivePresentationFor\(key\)/, "Each live object should resolve its own profile.");
assert.match(source, /applyPresentationMutations/, "Presentation-only labels should be applied inside the live iframe.");
assert.match(source, /restorers\.reverse\(\)/, "Presentation label mutations should be reversible.");
assert.match(source, /MutationObserver/, "Presentation state should follow prototype state changes.");

assert.match(humanizationSource, /documentObjectIds = new Set\(\["01", "05", "05A", "05B", "05C", "07"\]\)/);
assert.match(humanizationSource, /frame\.setAttribute\("scrolling", "no"\)/);
assert.match(humanizationSource, /root\.dataset\.liveLayout = "document"/);
assert.match(humanizationSource, /root\.dataset\.liveNaturalHeight/);
assert.match(humanizationSource, /root\.dataset\.liveDocumentContentHeight/);
assert.match(humanizationSource, /root\.dataset\.liveDocumentOverflow/);
assert.doesNotMatch(humanizationSource, /root\.dataset\.liveOverflow = "false"/);
assert.match(humanizationSource, /requestFrame\.call\(documentRoot\.defaultView, sync\)/);
assert.match(humanizationSource, /contentResizeObserver\.observe\(liveTarget\)/);
assert.match(humanizationSource, /frameResizeObserver\.observe\(frame\)/);
assert.match(humanizationSource, /installDocumentInputForwarding/);
assert.match(humanizationSource, /restoreFixedStage/, "A reused surface must be able to return to the fixed-stage contract.");

assert.match(presentationSource, /assign\("multiscale", \["06"\]\)/);
assert.doesNotMatch(presentationSource, /assign\([^\n]*A-M3|assign\([^\n]*A-M4/);
assert.match(presentationSource, /assign\("spread", \["08", "08A"\]\)/);
assert.match(presentationSource, /assign\("landscapeContinuous", \["18A"\]\)/);
assert.match(presentationBrowserReview, /modelLivePresentationEntries/, "Browser review should derive coverage from the complete mapping.");
assert.match(presentationBrowserReview, /Input\.dispatchMouseEvent/, "Browser review should use real pointer input.");
assert.match(presentationBrowserReview, /elementFromPoint/, "Browser review should prove controls are not covered.");
assert.match(presentationBrowserReview, /expectedText|text/, "Browser review should verify human-readable control labels.");
assert.match(presentationBrowserReview, /captureScreenshot/, "390px focus states should leave visual evidence.");

assert.match(stageBrowserReview, /liveLayout === "document"/);
assert.match(stageBrowserReview, /liveLayout === "fixed"/);
assert.match(stageBrowserReview, /documentCases/);
assert.match(stageBrowserReview, /model-document-/);
assert.match(stageBrowserReview, /documentScrollable/);
assert.match(stageBrowserReview, /fixedOverflowSurfaceCount/);
assert.match(stageBrowserReview, /naturalDocumentSurfaceCount/);

assert.match(documentFlowReview, /stableDocumentSnapshot/);
assert.match(documentFlowReview, /liveDocumentContentHeight/);
assert.match(documentFlowReview, /Input\.dispatchMouseEvent/);
assert.match(documentFlowReview, /Input\.dispatchTouchEvent/);
assert.match(documentFlowReview, /Input\.dispatchKeyEvent/);
assert.match(documentFlowReview, /waitForOuterMovement/);
assert.match(documentFlowReview, /frame\.contentWindow\.scrollY === 0/);
assert.match(documentFlowReview, /07 detail collapse left stale document metadata/);
assert.match(documentFlowReview, /\["05", "05A", "05B", "05C"\]/);

assert.match(browserReview, /root\.dataset\.liveStageHeight/g);
assert.match(browserReview, /root\.dataset\.liveContentHeight/g);

console.log("Model live-stage validator: spatial prototypes retain fixed stages while document prototypes use stable measured outer-page flow with real input forwarding.");
