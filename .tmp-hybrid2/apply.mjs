import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";

const expectedChunks = [
  "74bea89322cc277970319c1aba459f363a08130645827c04724994eb2b779935",
  "da1d4c01432307da0022d53707bca655955123e8a463720a9d2a4e2150e72fe8",
  "68cb5800b32f770a9f8ec013a102e63d20c638f28d00e685ce18ae84ed51bb5d",
  "d190afcaad6ace1264e16ce7a8a9be45e04ec9c9e579b27508b1b7050787f8d5",
  "d4d92a68903c0ffe609418d7a865cd6b039dfd4519246d8fd3d583859f3df475",
];
const chunks = [];
const mismatches = [];
for (let index = 1; index <= expectedChunks.length; index += 1) {
  const chunk = await readFile(`.tmp-hybrid2/payload-${index}.txt`, "utf8");
  const digest = createHash("sha256").update(chunk).digest("hex");
  if (digest !== expectedChunks[index - 1]) mismatches.push(`${index}:${chunk.length}:${digest}`);
  chunks.push(chunk);
}
if (mismatches.length) throw new Error(`Hybrid payload chunk mismatch: ${mismatches.join(" | ")}`);

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
