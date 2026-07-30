import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";

const chunks = [];
for (let index = 1; index <= 5; index += 1) {
  chunks.push(await readFile(`.tmp-hybrid2/payload-${index}.txt`, "utf8"));
}
const encoded = chunks.join("");
const digest = createHash("sha256").update(encoded).digest("hex");
const expected = "26027badd09c97a73e7e2d97600d1ae6a651e344b3bc1a81df482c0c1bca3813";
if (digest !== expected) throw new Error(`Hybrid payload hash mismatch: ${digest}`);

const payload = JSON.parse(gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"));
for (const [path, content] of Object.entries(payload)) {
  const slash = path.lastIndexOf("/");
  if (slash > 0) await mkdir(path.slice(0, slash), { recursive: true });
  await writeFile(path, content);
}
await rm(".tmp-hybrid2", { recursive: true, force: true });
console.log(`Hybrid viewer payload applied: ${Object.keys(payload).length} files.`);
