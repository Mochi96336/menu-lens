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
