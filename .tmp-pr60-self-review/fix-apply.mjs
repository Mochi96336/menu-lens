import { readFile, writeFile } from "node:fs/promises";

const path = ".tmp-pr60-self-review/apply.mjs";
let source = await readFile(path, "utf8");
const from = String.raw`  [
    "record study source action",
    \`    titleDeduplicated: !document.querySelector('#current-object-title').textContent.match(/^(\\S+) · \\1\\b/),
   }))()\` ,
    \`    titleDeduplicated: !document.querySelector('#current-object-title').textContent.match(/^(\\S+) · \\1\\b/),
    sourceActionText: document.querySelector('#current-exact-link').textContent,
  }))()\`,
  ],`;
const to = String.raw`  [
    "record study source action",
    \`    parentRecordVisible: !document.querySelector('#parent-record-link').hidden,
    imageLoaded: document.querySelector('#current-preview img')?.naturalWidth > 0,
    iframeCount: document.querySelectorAll('#workbench iframe').length,\`,
    \`    parentRecordVisible: !document.querySelector('#parent-record-link').hidden,
    imageLoaded: document.querySelector('#current-preview img')?.naturalWidth > 0,
    iframeCount: document.querySelectorAll('#workbench iframe').length,
    sourceActionText: document.querySelector('#current-exact-link').textContent,\`,
  ],`;
if (!source.includes(from)) throw new Error("Could not find the faulty study action matcher.");
source = source.replace(from, to);
await writeFile(path, source);
