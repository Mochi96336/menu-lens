import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_LIVE_STAGE_DEBUG_PORT ?? 9448);
const browserCandidates = [
  process.env.BROWSER_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const findBrowser = async () => {
  for (const candidate of browserCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next browser path.
    }
  }
  throw new Error("No Chrome or Chromium binary was found for model live-stage review.");
};

const waitForHttp = async (url, attempts = 300) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server or DevTools is not ready yet.
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
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

const evaluate = async (client, expression) => {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description
      ?? response.exceptionDetails.text
      ?? "Runtime evaluation failed.");
  }
  return response.result?.value;
};

const waitFor = async (client, expression, label, attempts = 400) => {
  let lastValue = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      lastValue = await evaluate(client, expression);
      if (lastValue) return lastValue;
    } catch (error) {
      lastValue = { error: error.message };
    }
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(lastValue)}`);
};

const setViewport = (client, width = 1720, height = 1100) => client.send(
  "Emulation.setDeviceMetricsOverride",
  {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: width,
    screenHeight: height,
  },
);

const models = [
  "complete-document",
  "horizontal-navigation",
  "paper-field",
  "landscape-paper",
  "multiscale-focus",
  "depth-projection",
];
const viewports = [
  { value: "320", expectedHeight: 568 },
  { value: "390", expectedHeight: 693 },
  { value: "desktop", expectedHeight: 640 },
];

await mkdir(outputDir, { recursive: true });
await waitForHttp(`${baseUrl}/models/`);
const browser = await findBrowser();
const browserProcess = spawn(browser, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/menu-lens-live-stage-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create model live-stage target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await setViewport(client);

  const results = [];
  const failures = [];
  let overflowSurfaceCount = 0;
  let fallbackSurfaceCount = 0;

  for (const model of models) {
    for (const viewport of viewports) {
      const path = `/models/?model=${model}&viewport=${viewport.value}&view=all`;
      await client.send("Page.navigate", { url: `${baseUrl}${path}` });
      await waitFor(client, `(() => {
        const cards = [...document.querySelectorAll('#all-live-board .model-live-card:not([hidden])')];
        return document.readyState === 'complete'
          && cards.length > 0
          && cards.every((card) => {
            const root = card.querySelector('.model-pooled-surface');
            const frame = root?.querySelector('iframe.model-live-frame');
            const fallback = root?.querySelector('.model-live-fallback');
            if (root?.dataset.liveState === 'ready') return Boolean(frame && !frame.hidden);
            if (root?.dataset.liveState === 'fallback') return Boolean(fallback && !fallback.hidden);
            return false;
          });
      })()`, `${model} ${viewport.value} live stages`);
      await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
      await evaluate(client, `new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)))`);

      const metrics = await evaluate(client, `(() => {
        const cards = [...document.querySelectorAll('#all-live-board .model-live-card:not([hidden])')];
        const surfaces = cards.map((card) => {
          const root = card.querySelector('.model-pooled-surface');
          const frame = root.querySelector('iframe.model-live-frame');
          const fallback = root.querySelector('.model-live-fallback');
          const state = root.dataset.liveState;
          const renderedStage = state === 'ready' ? frame : fallback;
          const frameDocument = state === 'ready' ? frame.contentDocument : null;
          const contentHeightValue = root.dataset.liveContentHeight;
          return {
            objectId: root.dataset.objectId ?? card.dataset.objectId,
            state,
            renderedHeight: Math.round(renderedStage.getBoundingClientRect().height),
            frameHidden: frame.hidden,
            fallbackHidden: fallback.hidden,
            scrolling: frame.getAttribute('scrolling'),
            liveHeight: Number(root.dataset.liveHeight),
            stageHeight: Number(root.dataset.liveStageHeight),
            contentHeight: contentHeightValue === undefined ? null : Number(contentHeightValue),
            overflow: root.dataset.liveOverflow === 'true',
            documentScrollable: Boolean(frameDocument)
              && frameDocument.documentElement.scrollHeight > frame.contentWindow.innerHeight + 1,
          };
        });
        return {
          model: new URL(location.href).searchParams.get('model'),
          viewport: new URL(location.href).searchParams.get('viewport'),
          surfaces,
        };
      })()`);

      const surfaceFailures = metrics.surfaces.filter((surface) => {
        const commonFailure = surface.renderedHeight !== viewport.expectedHeight
          || surface.liveHeight !== viewport.expectedHeight
          || surface.stageHeight !== viewport.expectedHeight;
        if (commonFailure) return true;
        if (surface.state === "fallback") {
          return !surface.frameHidden || surface.fallbackHidden || surface.contentHeight !== null;
        }
        return surface.state !== "ready"
          || surface.frameHidden
          || !surface.fallbackHidden
          || surface.scrolling !== "auto"
          || !Number.isFinite(surface.contentHeight)
          || surface.contentHeight <= 0
          || (surface.overflow && !surface.documentScrollable);
      });
      overflowSurfaceCount += metrics.surfaces.filter((surface) => surface.overflow).length;
      fallbackSurfaceCount += metrics.surfaces.filter((surface) => surface.state === "fallback").length;
      results.push({ path, expectedHeight: viewport.expectedHeight, ...metrics });
      if (metrics.model !== model
        || metrics.viewport !== viewport.value
        || surfaceFailures.length) {
        failures.push(`${model}/${viewport.value}: ${JSON.stringify({ metrics, surfaceFailures })}`);
      }
    }
  }

  if (overflowSurfaceCount === 0) {
    failures.push("No model surface exceeded its fixed stage, so internal scrolling was not exercised.");
  }
  if (fallbackSurfaceCount === 0) {
    failures.push("No entrypoint-free model object exercised the fixed fallback stage.");
  }

  const report = {
    browser,
    baseUrl,
    generatedAt: new Date().toISOString(),
    overflowSurfaceCount,
    fallbackSurfaceCount,
    cases: results,
    failures,
  };
  await writeFile(
    new URL("model-live-stage-results.json", outputDir),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (failures.length) {
    throw new Error(`Model live-stage browser review failed:\n- ${failures.join("\n- ")}`);
  }
  socket.close();
  console.log("Model live-stage browser review: six models share fixed 320px, 390px, and desktop stages across live and fallback surfaces.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
