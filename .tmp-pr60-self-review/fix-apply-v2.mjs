import { readFile, writeFile } from "node:fs/promises";

const path = ".tmp-pr60-self-review/apply.mjs";
let source = await readFile(path, "utf8");
const labelIndex = source.indexOf('    "record study source action",');
const nextLabelIndex = source.indexOf('    "require active all-view card visibility",', labelIndex);
if (labelIndex < 0 || nextLabelIndex < 0) throw new Error("Could not locate study-action patch labels.");
const start = source.lastIndexOf("  [", labelIndex);
const end = source.lastIndexOf("  [", nextLabelIndex);
if (start < 0 || end <= start) throw new Error("Could not locate study-action patch boundaries.");
const replacement = `  [
    "record study source action",
    \`    parentRecordVisible: !document.querySelector('#parent-record-link').hidden,
    imageLoaded: document.querySelector('#current-preview img')?.naturalWidth > 0,
    iframeCount: document.querySelectorAll('#workbench iframe').length,\`,
    \`    parentRecordVisible: !document.querySelector('#parent-record-link').hidden,
    imageLoaded: document.querySelector('#current-preview img')?.naturalWidth > 0,
    iframeCount: document.querySelectorAll('#workbench iframe').length,
    sourceActionText: document.querySelector('#current-exact-link').textContent,\`,
  ],
`;
source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
await writeFile(path, source);
