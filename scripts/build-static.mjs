import { cp, mkdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);

await mkdir(new URL("dist/", root), { recursive: true });
await cp(
  new URL("research-history/", root),
  new URL("dist/", root),
  { recursive: true },
);
