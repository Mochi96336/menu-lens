import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const path = "scripts/archive/generate-model-previews.mjs";
let source = await readFile(path, "utf8");
const start = source.indexOf("const preparePreviewTarget =");
const end = source.indexOf("const readClip =", start);
if (start < 0 || end <= start) throw new Error("Could not locate generated preview preparation block.");
const replacement = [
  "const preparePreviewTarget = (client, selector) => evaluate(client, `(async () => {",
  "  const element = document.querySelector(${JSON.stringify(selector)});",
  "  if (!element) return { missing: true, failedImages: [] };",
  "  let style = document.querySelector('#model-preview-capture-style');",
  "  if (!style) {",
  "    style = document.createElement('style');",
  "    style.id = 'model-preview-capture-style';",
  "    document.head.append(style);",
  "  }",
  "  style.textContent = [",
  "    '*, *::before, *::after {',",
  "    '  animation-delay: 0s !important;',",
  "    '  animation-duration: 0s !important;',",
  "    '  transition-delay: 0s !important;',",
  "    '  transition-duration: 0s !important;',",
  "    '  caret-color: transparent !important;',",
  "    '}',",
  "  ].join(String.fromCharCode(10));",
  "  window.scrollTo(0, 0);",
  "  element.scrollTop = 0;",
  "  const images = [...element.querySelectorAll('img')];",
  "  await Promise.all(images.map((image) => {",
  "    if (image.complete) return Promise.resolve();",
  "    return new Promise((resolve) => {",
  "      const done = () => resolve();",
  "      image.addEventListener('load', done, { once: true });",
  "      image.addEventListener('error', done, { once: true });",
  "      setTimeout(done, 5000);",
  "    });",
  "  }));",
  "  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));",
  "  return {",
  "    missing: false,",
  "    failedImages: images.filter((image) => image.naturalWidth === 0).map((image) => image.currentSrc || image.src),",
  "  };",
  "})()`);",
  "",
].join("\n");
source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
await writeFile(path, source);
await rm(fileURLToPath(import.meta.url));
console.log("Preview target preparation rebuilt.");
