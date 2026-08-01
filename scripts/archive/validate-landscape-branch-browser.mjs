import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.LANDSCAPE_BRANCH_DEBUG_PORT ?? 9449);
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
      // Try the next candidate.
    }
  }
  throw new Error("No Chrome or Chromium binary was found for Landscape branch review.");
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

const waitFor = async (client, expression, label, attempts = 300) => {
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

const setViewport = (client, width, height = 1050) => client.send(
  "Emulation.setDeviceMetricsOverride",
  {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 480,
    screenWidth: width,
    screenHeight: height,
  },
);

const settle = async (client) => {
  await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
  await evaluate(client, "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
};

const capture = async (client, filename) => {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, outputDir), Buffer.from(screenshot.data, "base64"));
};

const stateExpression = `(() => {
  const route = document.querySelector('#section-tabs');
  const canvas = route?.querySelector('.model-route__canvas--branch');
  const svg = route?.querySelector('.model-route__lines');
  const buttons = [...(route?.querySelectorAll('button[data-section-id]') ?? [])];
  const selected = buttons.find((button) => button.getAttribute('aria-selected') === 'true');
  const routeRect = route?.getBoundingClientRect();
  const selectedRect = selected?.getBoundingClientRect();
  const canvasRect = canvas?.getBoundingClientRect();
  const rects = buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    const markerRect = button.querySelector('.model-route__marker')?.getBoundingClientRect();
    return {
      id: button.dataset.sectionId,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      centerX: (rect.left + rect.right) / 2,
      centerY: (rect.top + rect.bottom) / 2,
      markerCenterX: markerRect ? (markerRect.left + markerRect.right) / 2 : null,
      markerCenterY: markerRect ? (markerRect.top + markerRect.bottom) / 2 : null,
    };
  });
  let overlaps = 0;
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const width = Math.min(rects[i].right, rects[j].right) - Math.max(rects[i].left, rects[j].left);
      const height = Math.min(rects[i].bottom, rects[j].bottom) - Math.max(rects[i].top, rects[j].top);
      if (width > 8 && height > 8) overlaps += 1;
    }
  }
  const segments = [...(svg?.querySelectorAll('path[data-route-segment]') ?? [])].map((path) => ({
    segment: path.dataset.routeSegment,
    target: path.dataset.routeTarget ?? null,
    d: path.getAttribute('d'),
  }));
  return {
    selectedId: selected?.dataset.sectionId,
    labels: buttons.map((button) => button.dataset.sectionId),
    lineCount: svg?.querySelectorAll('line').length ?? 0,
    segments,
    canvasWidth: canvasRect?.width ?? 0,
    canvasHeight: canvasRect?.height ?? 0,
    nodeRects: rects,
    overlaps,
    selectedVisible: Boolean(routeRect && selectedRect)
      && selectedRect.left >= routeRect.left - 1
      && selectedRect.right <= routeRect.right + 1,
    linesDisplay: svg ? getComputedStyle(svg).display : null,
    minimumTargetHeight: rects.length ? Math.min(...rects.map((rect) => rect.height)) : 0,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    url: location.href,
  };
})()`;

const failures = [];
const results = [];
const check = (condition, message, state) => {
  if (!condition) failures.push(`${message}: ${JSON.stringify(state)}`);
};
const segmentCount = (state, segment) => state.segments.filter((item) => item.segment === segment).length;
const activeSegment = (state) => state.segments.find((item) => item.segment === "active");

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
  `--user-data-dir=/tmp/menu-lens-landscape-branch-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create Landscape branch target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  await setViewport(client, 1792);
  await client.send("Page.navigate", {
    url: `${baseUrl}/models/?model=landscape-paper&section=core&variant=18&viewport=390`,
  });
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'core'`, "Landscape core route");
  await settle(client);
  const core = await evaluate(client, stateExpression);
  const rootRect = core.nodeRects.find(({ id }) => id === "core");
  const peerRects = core.nodeRects.filter(({ id }) => id !== "core");
  const peerMarkerXs = peerRects.map(({ markerCenterX }) => markerCenterX);
  const peerMarkerYs = peerRects.map(({ markerCenterY }) => markerCenterY);
  const peersMidpoint = (Math.min(...peerMarkerXs) + Math.max(...peerMarkerXs)) / 2;
  check(core.lineCount === 0, "Landscape branch must not render radial line elements", core);
  check(segmentCount(core, "stem") === 1, "Landscape branch requires one shared stem", core);
  check(segmentCount(core, "rail") === 1, "Landscape branch requires one shared horizontal rail", core);
  check(segmentCount(core, "drop") === 5, "Landscape branch requires five peer drops", core);
  check(segmentCount(core, "active") === 0, "Core selection must not color the whole branch tree", core);
  check(Math.max(...peerMarkerYs) - Math.min(...peerMarkerYs) <= 2, "Landscape peers must share one visual y-axis", core);
  check(peerMarkerXs.every((value, index) => index === 0 || value > peerMarkerXs[index - 1]), "Landscape peers must preserve horizontal canonical order", core);
  check(rootRect?.markerCenterY < Math.min(...peerMarkerYs) - 70, "Landscape root must sit clearly above its peers", core);
  check(Math.abs((rootRect?.markerCenterX ?? 0) - peersMidpoint) <= 2, "Landscape root must stay centered above the peer rail", core);
  check(core.canvasWidth <= 1100, "Landscape branch canvas must remain compact on wide screens", core);
  check(core.canvasHeight <= 240, "Landscape branch canvas must not become vertically excessive", core);
  check(core.overlaps === 0, "Landscape branch nodes must not overlap", core);
  check(!core.documentOverflow, "Landscape desktop route must not overflow the document", core);
  results.push({ name: "core", state: core });
  await capture(client, "model-diagram-landscape-rail-1792.png");

  await evaluate(client, `document.querySelector('[data-section-id="stopped-routes"]').click()`);
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'stopped-routes'`, "Landscape stopped route");
  await settle(client);
  const stopped = await evaluate(client, stateExpression);
  const stoppedActive = activeSegment(stopped);
  check(stopped.lineCount === 0, "Active Landscape branch must remain path-based", stopped);
  check(segmentCount(stopped, "active") === 1, "Selected peer requires one active overlay", stopped);
  check(stoppedActive?.target === "stopped-routes", "Active overlay must target stopped-routes", stopped);
  check(/^M\s[\d.]+\s[\d.]+\sV\s[\d.]+\sH\s[\d.]+\sV\s[\d.]+$/.test(stoppedActive?.d ?? ""), "Active overlay must follow stem-rail-drop geometry", stopped);
  check(stopped.url.includes("section=stopped-routes"), "Landscape selection must update the URL", stopped);
  results.push({ name: "stopped-routes", state: stopped });

  await evaluate(client, "history.back()");
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'core'`, "Landscape history back");
  await settle(client);
  const restored = await evaluate(client, stateExpression);
  check(segmentCount(restored, "active") === 0, "History back to core must remove active overlay", restored);
  check(segmentCount(restored, "drop") === 5, "History back must preserve all peer drops", restored);
  results.push({ name: "history-back", state: restored });

  await setViewport(client, 320, 900);
  await client.send("Page.navigate", {
    url: `${baseUrl}/models/?model=landscape-paper&section=stopped-routes&variant=21&viewport=390`,
  });
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'stopped-routes'`, "Landscape mobile route");
  await settle(client);
  const mobile = await evaluate(client, stateExpression);
  check(mobile.linesDisplay === "none", "Landscape mobile route must hide two-dimensional branch lines", mobile);
  check(JSON.stringify(mobile.labels) === JSON.stringify([
    "core",
    "reading-grammar",
    "focus-geometry",
    "reading-surface",
    "vertical-writing",
    "stopped-routes",
  ]), "Landscape mobile route must preserve canonical order", mobile);
  check(mobile.selectedVisible, "Landscape mobile selected node must be visible", mobile);
  check(mobile.minimumTargetHeight >= 44, "Landscape mobile targets must remain at least 44px tall", mobile);
  check(!mobile.documentOverflow, "Landscape mobile route must not overflow the document", mobile);
  results.push({ name: "mobile", state: mobile });
  await capture(client, "model-diagram-landscape-rail-320.png");

  await writeFile(
    new URL("landscape-branch-results.json", outputDir),
    `${JSON.stringify({ failures, results }, null, 2)}\n`,
  );

  if (failures.length) throw new Error(`Landscape branch browser review failed:\n- ${failures.join("\n- ")}`);
  console.log("Landscape branch browser review passed: balanced rail routing and mobile fallback verified.");
  socket.close();
} finally {
  browserProcess.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => browserProcess.once("exit", resolve)),
    delay(1000),
  ]);
  if (browserProcess.exitCode && browserProcess.exitCode !== 0 && browserStderr) {
    console.error(browserStderr);
  }
}
