import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { loadArchiveCatalog, root } from "./load-catalog.mjs";
import { designModels } from "../../research-history/catalog/presentation-models.mjs";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputRoot = new URL("../../dist/previews/", import.meta.url);
const browserCandidates = [
  process.env.BROWSER_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const viewportProfiles = [
  { id: "320", width: 320, height: 1100 },
  { id: "390", width: 390, height: 1100 },
  { id: "desktop", width: 1024, height: 1100 },
];

const findBrowser = async () => {
  for (const candidate of browserCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next browser path.
    }
  }
  throw new Error("No Chrome or Chromium binary was found for model preview generation.");
};

const waitForHttp = async (url, attempts = 300) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server or DevTools endpoint is not ready yet.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }
}

const evaluate = async (client, expression) => {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(details.exception?.description ?? details.text ?? "Runtime evaluation failed.");
  }
  return result.result?.value;
};

const setViewport = (client, profile) => client.send("Emulation.setDeviceMetricsOverride", {
  width: profile.width,
  height: profile.height,
  deviceScaleFactor: 1,
  mobile: profile.width <= 480,
  screenWidth: profile.width,
  screenHeight: profile.height,
});

const waitForPreviewTarget = async (client, expectedPath) => {
  let lastState = null;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      lastState = await evaluate(client, `(() => {
        const candidates = [
          ['#prototype', document.querySelector('#prototype')],
          ['#comparison', document.querySelector('#comparison')],
          ['#study', document.querySelector('#study')],
          ['#studies', document.querySelector('#studies')],
        ];
        const match = candidates.find(([, element]) => element);
        return {
          ready: location.pathname.endsWith(${JSON.stringify(expectedPath)})
            && document.readyState === 'complete'
            && Boolean(match?.[1]),
          selector: match?.[0] ?? null,
          href: location.href,
          readyState: document.readyState,
        };
      })()`);
      if (lastState?.ready) {
        await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
        await delay(250);
        return lastState.selector;
      }
    } catch (error) {
      lastState = { error: error.message };
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for preview target ${expectedPath}: ${JSON.stringify(lastState)}`);
};

const readClip = (client, selector) => evaluate(client, `(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element) return null;
  element.scrollIntoView({ block: 'start', inline: 'start' });
  const rect = element.getBoundingClientRect();
  const x = Math.max(0, rect.left + window.scrollX);
  const y = Math.max(0, rect.top + window.scrollY);
  return {
    x,
    y,
    width: Math.max(1, Math.min(rect.width, 1400)),
    height: Math.max(1, Math.min(rect.height, 1000)),
  };
})()`);

const catalog = await loadArchiveCatalog();
const visibleIds = new Set(
  designModels.flatMap((model) => model.sections.flatMap((section) => section.objectIds)),
);
const objects = catalog.objects.filter((object) => visibleIds.has(object.id) && object.entrypoint);

await mkdir(outputRoot, { recursive: true });
await waitForHttp(`${baseUrl}/models/`);
const browser = await findBrowser();
const debugPort = Number(process.env.MODEL_PREVIEW_DEBUG_PORT ?? 9333);
const browserProcess = spawn(browser, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/menu-lens-preview-${process.pid}`,
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

let browserStderr = "";
browserProcess.stderr.on("data", (chunk) => { browserStderr += String(chunk); });

try {
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const targetResponse = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
  if (!targetResponse.ok) throw new Error(`Could not create preview target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  const runtimeErrors = [];
  client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    runtimeErrors.push(exceptionDetails?.exception?.description ?? exceptionDetails?.text ?? "Runtime exception");
  });
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  const manifest = {
    generatedAt: new Date().toISOString(),
    objects: {},
  };

  for (const object of objects) {
    const objectDir = new URL(`${encodeURIComponent(object.id)}/`, outputRoot);
    await mkdir(objectDir, { recursive: true });
    manifest.objects[object.id] = { entrypoint: object.entrypoint, viewports: {} };

    for (const profile of viewportProfiles) {
      await setViewport(client, profile);
      const path = `/${object.entrypoint}`;
      await client.send("Page.navigate", { url: `${baseUrl}${path}` });
      const selector = await waitForPreviewTarget(client, path);
      const clip = await readClip(client, selector);
      if (!clip) throw new Error(`${object.id} has no capturable preview target.`);
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: true,
        clip: { ...clip, scale: 1 },
      });
      const filename = `${profile.id}.png`;
      await writeFile(new URL(filename, objectDir), Buffer.from(screenshot.data, "base64"));
      manifest.objects[object.id].viewports[profile.id] = {
        path: `previews/${encodeURIComponent(object.id)}/${filename}`,
        selector,
        width: Math.round(clip.width),
        height: Math.round(clip.height),
      };
    }
  }

  if (runtimeErrors.length) {
    throw new Error(`Prototype runtime errors while generating previews: ${runtimeErrors.join(" | ")}`);
  }
  await writeFile(
    new URL("manifest.json", outputRoot),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  socket.close();
  console.log(`Model previews: ${objects.length} objects × ${viewportProfiles.length} viewports generated.`);
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
