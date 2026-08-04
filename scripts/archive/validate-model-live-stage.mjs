import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { modelLiveStageHeightFor } from "../../research-history/model-live-surface.mjs";
import {
  modelLivePresentationEntries,
  modelLivePresentationFor,
  modelLivePresentationProfiles,
} from "../../research-history/catalog/model-live-presentations.mjs";

assert.equal(modelLiveStageHeightFor(320), 568, "320px previews should use one 16:9 stage height.");
assert.equal(modelLiveStageHeightFor(390), 693, "390px previews should use one 16:9 stage height.");
assert.equal(modelLiveStageHeightFor(1024), 640, "Desktop previews should use one 16:10 stage height.");
assert.equal(modelLiveStageHeightFor("390"), 693, "String viewport values should resolve consistently.");
assert.equal(modelLiveStageHeightFor(777), 640, "Unknown widths should fall back to the desktop stage height.");

assert.equal(modelLivePresentationFor("01"), null, "The scrolling document should keep its native header flow.");
assert.equal(modelLivePresentationFor("05C"), null, "Ledger variants should not inherit fixed-canvas cleanup.");
assert.equal(modelLivePresentationFor("A-M3"), null, "Non-interactive correction records should not pretend to be live multiscale surfaces.");
assert.equal(modelLivePresentationFor("A-M4"), null, "Non-interactive correction records should not pretend to be live multiscale surfaces.");
assert.equal(modelLivePresentationFor("06")?.id, "multiscale", "06 should preserve a compact focus return control.");
assert.equal(modelLivePresentationFor("08")?.id, "spread", "08 should remove its redundant full-width toolbar.");
assert.equal(modelLivePresentationFor("08A")?.id, "spread", "08A should share 08 presentation cleanup.");
assert.equal(modelLivePresentationFor("09A")?.id, "ribbon", "09A should retain only a compact reading return.");
assert.equal(modelLivePresentationFor("10A")?.id, "fisheye", "10A should retain its lens control without the location bar.");
assert.equal(modelLivePresentationFor("12A")?.id, "paper", "Paper variants should use paper-specific state cleanup.");
assert.equal(modelLivePresentationFor("13")?.id, "loupe", "The always-active loupe should use compact floating controls instead of paper focus cleanup.");
assert.equal(modelLivePresentationFor("18A")?.id, "landscape-continuous", "18A should keep compact previous/next navigation without pretending to have a reading mode.");
assert.equal(modelLivePresentationFor("19")?.id, "rigid-sheet", "19 should keep its own reading return contract.");
assert.equal(modelLivePresentationFor("20")?.id, "trifold", "20 should keep its own folded-panel return contract.");
assert.equal(modelLivePresentationFor("21")?.id, "two-column", "21 should keep its own window return contract.");
assert.equal(modelLivePresentationFor("22D")?.id, "landscape-focus", "Focus-geometry variants should rely on their direct category reset.");
assert.equal(modelLivePresentationFor("24C")?.id, "landscape-camera", "Vertical landscape variants should retain a compact reading return.");
assert.equal(modelLivePresentationFor("25B")?.id, "volume", "25B should retain only a compact layer-to-overview return.");
assert.equal(modelLivePresentationFor("25P")?.id, "projection", "25P should remove only redundant restaurant identity.");
assert.equal(modelLivePresentationFor("26C")?.id, "parallax", "Parallax corrections should share the parallax profile.");

assert.equal(modelLivePresentationEntries.length, 44, "Every interactive presentation object should remain enumerable for browser coverage.");
assert.equal(
  new Set(modelLivePresentationEntries.map(({ objectId }) => objectId)).size,
  modelLivePresentationEntries.length,
  "An object must not be assigned to more than one live-presentation profile.",
);
for (const { objectId, profileId } of modelLivePresentationEntries) {
  assert.equal(modelLivePresentationFor(objectId)?.id, profileId, `${objectId} should resolve to its exported profile entry.`);
  assert.ok(
    Object.values(modelLivePresentationProfiles).some((profile) => profile.id === profileId),
    `${objectId} references missing profile ${profileId}.`,
  );
}

assert.equal(modelLivePresentationProfiles.spread.state.selector, ".spread-map");
assert.equal(modelLivePresentationProfiles.paper.state.selector, ".paper-viewport");
assert.equal(modelLivePresentationProfiles.landscapeCamera.state.selector, ".landscape-viewport");
assert.equal(modelLivePresentationProfiles.landscapeCamera.state.map.reading, "focus");
assert.equal(modelLivePresentationProfiles.landscapeContinuous.state, null, "18A navigation is continuous, not overview/reading stateful.");
assert.ok(modelLivePresentationProfiles.landscapeFocus.state.activeSelectors.includes(".paper-category[data-focused=\"true\"]"));
assert.equal(modelLivePresentationProfiles.volume.state.selector, "#volume-stack");
assert.match(modelLivePresentationProfiles.spread.css, /\.spread-toolbar/);
assert.match(modelLivePresentationProfiles.ribbon.css, /#ribbon-overview/);
assert.match(modelLivePresentationProfiles.multiscale.css, /#collapse-all/);
assert.match(modelLivePresentationProfiles.fisheye.css, /\.fisheye-lens-switch/);
assert.match(modelLivePresentationProfiles.loupe.css, /\.paper-toolbar/);
assert.match(modelLivePresentationProfiles.landscapeContinuous.css, /\.paper-location/);
assert.match(modelLivePresentationProfiles.landscapeContinuous.css, /\.paper-toolbar button/);
assert.match(modelLivePresentationProfiles.rigidSheet.css, /#rigid-overview/);
assert.match(modelLivePresentationProfiles.trifold.css, /#trifold-overview/);
assert.match(modelLivePresentationProfiles.twoColumn.css, /#window-overview/);
assert.match(modelLivePresentationProfiles.volume.css, /#volume-overview/);
assert.doesNotMatch(
  Object.values(modelLivePresentationProfiles).map((profile) => profile.css).join("\n"),
  /\.phone-screen\s*>\s*header|\[class\*=["']toolbar["']\]/,
  "Presentation cleanup must stay model-specific instead of hiding generic prototype chrome.",
);

const source = await readFile(
  new URL("../../research-history/model-live-surface.mjs", import.meta.url),
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
const presentationBrowserReview = await readFile(
  new URL("./validate-model-live-presentation-browser.mjs", import.meta.url),
  "utf8",
);

assert.match(source, /frame\.setAttribute\("scrolling", "auto"\)/, "The fixed stage must remain internally scrollable.");
assert.doesNotMatch(source, /frame\.style\.height\s*=\s*`\$\{height\}px`/, "Measured content height must not resize the outer stage.");
assert.match(source, /root\.dataset\.liveContentHeight/, "Natural content height should remain observable.");
assert.match(source, /root\.dataset\.liveOverflow/, "Stage overflow should remain observable.");
assert.match(source, /fallback\.style\.position\s*=\s*"absolute"/, "Loading fallback must not double the fixed stage height.");
assert.match(source, /modelLivePresentationFor\(key\)/, "Each live object should resolve its own presentation profile.");
assert.match(source, /data-model-live-presentation-state|modelLivePresentationState/, "Live state should drive contextual header cleanup.");
assert.match(source, /MutationObserver/, "Presentation state must follow prototype state changes without changing the prototype source.");
assert.match(presentationSource, /assign\("multiscale", \["06"\]\)/, "Only the interactive 06 surface should receive the multiscale profile.");
assert.doesNotMatch(presentationSource, /assign\([^\n]*A-M3|assign\([^\n]*A-M4/, "Correction records must remain outside live-presentation mapping.");
assert.match(presentationSource, /assign\("spread", \["08", "08A"\]\)/, "Parent and child spread objects should share one explicit profile.");
assert.match(presentationSource, /assign\("landscapeCamera", \[/, "Camera-scale landscape variants should be listed explicitly.");
assert.match(presentationSource, /assign\("landscapeContinuous", \["18A"\]\)/, "18A must not inherit a nonexistent scale-state contract.");
assert.match(presentationSource, /assign\("landscapeFocus", \[/, "Direct-reset landscape variants should use their own state contract.");
assert.match(presentationSource, /assign\("rigidSheet", \["19"\]\)/, "19 must not inherit the landscape viewport contract.");
assert.match(presentationSource, /assign\("trifold", \["20"\]\)/, "20 must not inherit the landscape viewport contract.");
assert.match(presentationSource, /assign\("twoColumn", \["21"\]\)/, "21 must not inherit the landscape viewport contract.");
assert.match(presentationBrowserReview, /modelLivePresentationEntries/, "Browser review should derive initial coverage from the complete interactive presentation mapping.");
assert.match(presentationBrowserReview, /Input\.dispatchMouseEvent/, "Browser review should use hit-tested pointer input instead of DOM click shortcuts.");
assert.match(presentationBrowserReview, /elementFromPoint/, "Browser review should prove compact controls are not covered by another element.");
assert.match(presentationBrowserReview, /captureScreenshot/, "390px focus states should leave visual evidence.");
assert.doesNotMatch(
  browserReview,
  /frame\.style\.height\) - liveRoot\.getBoundingClientRect\(\)\.height/,
  "Browser review must not restore the natural-height iframe contract.",
);
assert.match(browserReview, /root\.dataset\.liveStageHeight/g, "Browser review should verify the fixed stage height.");
assert.match(browserReview, /root\.dataset\.liveContentHeight/g, "Browser review should still require measured content height.");

console.log("Model live-stage validator: fixed stages now apply explicit, enumerable interaction contracts without flattening distinct models.");
