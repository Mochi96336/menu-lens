import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { modelLiveStageHeightFor } from "../../research-history/model-live-surface.mjs";

assert.equal(modelLiveStageHeightFor(320), 568, "320px previews should use one 16:9 stage height.");
assert.equal(modelLiveStageHeightFor(390), 693, "390px previews should use one 16:9 stage height.");
assert.equal(modelLiveStageHeightFor(1024), 640, "Desktop previews should use one 16:10 stage height.");
assert.equal(modelLiveStageHeightFor("390"), 693, "String viewport values should resolve consistently.");
assert.equal(modelLiveStageHeightFor(777), 640, "Unknown widths should fall back to the desktop stage height.");

const source = await readFile(
  new URL("../../research-history/model-live-surface.mjs", import.meta.url),
  "utf8",
);
const browserReview = await readFile(
  new URL("./capture-model-page-review.mjs", import.meta.url),
  "utf8",
);

assert.match(source, /frame\.setAttribute\("scrolling", "auto"\)/, "The fixed stage must remain internally scrollable.");
assert.doesNotMatch(source, /frame\.style\.height\s*=\s*`\$\{height\}px`/, "Measured content height must not resize the outer stage.");
assert.match(source, /root\.dataset\.liveContentHeight/, "Natural content height should remain observable.");
assert.match(source, /root\.dataset\.liveOverflow/, "Stage overflow should remain observable.");
assert.match(source, /fallback\.style\.position\s*=\s*"absolute"/, "Loading fallback must not double the fixed stage height.");
assert.doesNotMatch(
  browserReview,
  /frame\.style\.height\) - liveRoot\.getBoundingClientRect\(\)\.height/,
  "Browser review must not restore the natural-height iframe contract.",
);
assert.match(browserReview, /root\.dataset\.liveStageHeight/g, "Browser review should verify the fixed stage height.");
assert.match(browserReview, /root\.dataset\.liveContentHeight/g, "Browser review should still require measured content height.");

console.log("Model live-stage validator: fixed 320px, 390px, and desktop heights preserve internal scrolling.");
