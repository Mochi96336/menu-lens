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

console.log("Model live humanization validator: shared chrome, language, and continuous navigation are explicit and browser-reviewed.");
