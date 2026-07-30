import { readFile, writeFile } from "node:fs/promises";

const path = ".tmp-pr60-self-review/apply.mjs";
let source = await readFile(path, "utf8");
const marker = "  ].join('\\\\\\\\n');";
if (!source.includes(marker)) throw new Error(`Could not locate preview CSS join marker: ${marker}`);
source = source.replace(marker, "  ].join(String.fromCharCode(10));");
await writeFile(path, source);
