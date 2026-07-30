import { gunzipSync } from "node:zlib";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";

const chunks = [];
for (let index = 1; index <= 6; index += 1) {
  chunks.push(await readFile(`.tmp-hybrid/payload-${index}.txt`, "utf8"));
}
const payload = JSON.parse(gunzipSync(Buffer.from(chunks.join(""), "base64")).toString("utf8"));
for (const [path, content] of Object.entries(payload)) {
  const slash = path.lastIndexOf("/");
  if (slash > 0) await mkdir(path.slice(0, slash), { recursive: true });
  await writeFile(path, content);
}
await rm(".tmp-hybrid", { recursive: true, force: true });
console.log(`Hybrid viewer payload applied: ${Object.keys(payload).length} files.`);
