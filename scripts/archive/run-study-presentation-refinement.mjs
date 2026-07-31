import { readFile, writeFile } from "node:fs/promises";

const patchPath = new URL("./apply-study-presentation-refinement.mjs", import.meta.url);
let source = await readFile(patchPath, "utf8");
const oldBlock = `  source = replaceOnce(
    source,
    \`      inspectorBelow: document.querySelector('#inspector').getBoundingClientRect().top
        > board.getBoundingClientRect().bottom - 4,
\`,
    \`      inspectorBelow: document.querySelector('#inspector').getBoundingClientRect().top
        > board.getBoundingClientRect().bottom - 4,
      compareToggleAttribute: document.querySelector('#compare-parent').hasAttribute('aria-pressed'),
\`,
    "browser review comparison action metric",
  );`;
const newBlock = `  source = replaceOnce(
    source,
    \`      parentReused: parentFrame === window.__parentBoardFrame
        && parentFrame.contentWindow.__parentMarker === '18',
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      inspectorBelow: document.querySelector('#inspector').getBoundingClientRect().top
        > board.getBoundingClientRect().bottom - 4,
\`,
    \`      parentReused: parentFrame === window.__parentBoardFrame
        && parentFrame.contentWindow.__parentMarker === '18',
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      inspectorBelow: document.querySelector('#inspector').getBoundingClientRect().top
        > board.getBoundingClientRect().bottom - 4,
      compareToggleAttribute: document.querySelector('#compare-parent').hasAttribute('aria-pressed'),
\`,
    "browser review comparison action metric",
  );`;
const count = source.split(oldBlock).length - 1;
if (count !== 1) throw new Error(`Expected one comparison matcher block, found ${count}.`);
source = source.replace(oldBlock, newBlock);
await writeFile(patchPath, source, "utf8");
await import(`${patchPath.href}?run=${Date.now()}`);

const metadataPath = new URL("../../research-history/catalog/study-presentations.mjs", import.meta.url);
let metadata = await readFile(metadataPath, "utf8");
const titleReplacements = [
  ['  "12A-S1": Object.freeze({\n    method: "盲測比較",', '  "12A-S1": Object.freeze({\n    title: "Blinded Reader Comparison",\n    method: "盲測比較",'],
  ['  "25P-S1": Object.freeze({\n    method: "陌生讀者任務",', '  "25P-S1": Object.freeze({\n    title: "Unfamiliar-reader Study",\n    method: "陌生讀者任務",'],
];
for (const [before, after] of titleReplacements) {
  const matches = metadata.split(before).length - 1;
  if (matches !== 1) throw new Error(`Expected one study title insertion point, found ${matches}.`);
  metadata = metadata.replace(before, after);
}
await writeFile(metadataPath, metadata, "utf8");

const pagePath = new URL("../../research-history/model-page.mjs", import.meta.url);
let page = await readFile(pagePath, "utf8");
const oldDisplayTitle = [
  "const displayTitle = (object) => {",
  "  const title = String(object?.title ?? \"\");",
  "  const prefix = `${object?.id ?? \"\"} `;",
  "  return prefix.trim() && title.startsWith(prefix) ? title.slice(prefix.length).trim() : title;",
  "};",
].join("\n");
const newDisplayTitle = [
  "const displayTitle = (object) => {",
  "  const explicitTitle = studyPresentations[object?.id]?.title;",
  "  if (explicitTitle) return explicitTitle;",
  "  const title = String(object?.title ?? \"\");",
  "  const prefix = `${object?.id ?? \"\"} `;",
  "  return prefix.trim() && title.startsWith(prefix) ? title.slice(prefix.length).trim() : title;",
  "};",
].join("\n");
const displayMatches = page.split(oldDisplayTitle).length - 1;
if (displayMatches !== 1) throw new Error(`Expected one displayTitle block, found ${displayMatches}.`);
page = page.replace(oldDisplayTitle, newDisplayTitle);
await writeFile(pagePath, page, "utf8");

const validatorPath = new URL("./validate-model-page-renderer.mjs", import.meta.url);
let validator = await readFile(validatorPath, "utf8");
const oldSelector = 'studyCard?.querySelector(".model-live-card__select strong")?.textContent';
const newSelector = 'studyCard?.querySelector(".model-live-card__select")?.children[0]?.textContent';
const selectorMatches = validator.split(oldSelector).length - 1;
if (selectorMatches !== 1) throw new Error(`Expected one fake-DOM study-card selector, found ${selectorMatches}.`);
validator = validator.replace(oldSelector, newSelector);
await writeFile(validatorPath, validator, "utf8");
