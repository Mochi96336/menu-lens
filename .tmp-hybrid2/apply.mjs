import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";

const sources = [
  ["part-1.txt", "b63111cbab9ba62b8d1769ec7f21bb93bca8851bc9d892eac3f8215aa8469ed8"],
  ["part-2.txt", "4a54c3c02a0385975eb5e5fbe2149aabfdfebc06554fc2888217b1b2eb35903b"],
  ["part-3.txt", "d21e61ebe52fa1003fd9861ed13547cc809ba801504b22e64e5c6b6887e7d709"],
  ["part-4.txt", "03ef1014a37c8f324f05d9f1895e8fa5f177480cb4bd05969917d34a84019e1c"],
  ["part-5.txt", "70be5a284a5494b5d5929b0767300d04777b5bacc1248d50563491fafe94d932"],
  ["part-6.txt", "e4d84ab3a9c939a54eabd41975796d03199dfc88258618c48ab2dbadc1ab6db3"],
  ["payload-4.txt", "d190afcaad6ace1264e16ce7a8a9be45e04ec9c9e579b27508b1b7050787f8d5"],
  ["payload-5.txt", "d4d92a68903c0ffe609418d7a865cd6b039dfd4519246d8fd3d583859f3df475"],
];

const chunks = [];
const mismatches = [];
for (const [filename, expectedDigest] of sources) {
  const chunk = await readFile(`.tmp-hybrid2/${filename}`, "utf8");
  const digest = createHash("sha256").update(chunk).digest("hex");
  if (digest !== expectedDigest) mismatches.push(`${filename}:${chunk.length}:${digest}`);
  chunks.push(chunk);
}
if (mismatches.length) throw new Error(`Hybrid payload part mismatch: ${mismatches.join(" | ")}`);

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
