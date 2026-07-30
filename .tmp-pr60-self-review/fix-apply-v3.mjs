import { readFile, writeFile } from "node:fs/promises";

const path = ".tmp-pr60-self-review/apply.mjs";
let source = await readFile(path, "utf8");
const from = String.raw`  style.textContent = \`
    *, *::before, *::after {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      transition-delay: 0s !important;
      transition-duration: 0s !important;
      caret-color: transparent !important;
    }
  \`;`;
const to = String.raw`  style.textContent = [
    '*, *::before, *::after {',
    '  animation-delay: 0s !important;',
    '  animation-duration: 0s !important;',
    '  transition-delay: 0s !important;',
    '  transition-duration: 0s !important;',
    '  caret-color: transparent !important;',
    '}',
  ].join('\\n');`;
if (!source.includes(from)) throw new Error("Could not locate nested preview capture template literal.");
source = source.replace(from, to);
await writeFile(path, source);
