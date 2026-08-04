import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { routeGeometryCases as cases } from "./model-route-browser-cases.mjs";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.ROUTE_GEOMETRY_DEBUG_PORT ?? 9451);
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
  throw new Error("No Chrome or Chromium binary was found for route geometry review.");
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
  const canvas = route?.querySelector('.model-route__canvas');
  const svg = route?.querySelector('.model-route__lines');
  const buttons = [...(route?.querySelectorAll('button[data-section-id]') ?? [])];
  const selected = buttons.find((button) => button.getAttribute('aria-selected') === 'true');
  const routeRect = route?.getBoundingClientRect();
  const selectedRect = selected?.getBoundingClientRect();
  const nodes = buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    const marker = button.querySelector('.model-route__marker')?.getBoundingClientRect();
    return {
      id: button.dataset.sectionId,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      markerX: marker ? (marker.left + marker.right) / 2 : null,
      markerY: marker ? (marker.top + marker.bottom) / 2 : null,
    };
  });
  let overlaps = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const width = Math.min(nodes[i].right, nodes[j].right) - Math.max(nodes[i].left, nodes[j].left);
      const height = Math.min(nodes[i].bottom, nodes[j].bottom) - Math.max(nodes[i].top, nodes[j].top);
      if (width > 8 && height > 8) overlaps += 1;
    }
  }
  const segments = [...(svg?.querySelectorAll('path[data-route-segment]') ?? [])].map((path) => ({
    segment: path.dataset.routeSegment,
    target: path.dataset.routeTarget ?? null,
    d: path.getAttribute('d'),
  }));
  return {
    layout: route?.dataset.routeLayout,
    selectedId: selected?.dataset.sectionId,
    labels: buttons.map((button) => button.dataset.sectionId),
    lineCount: svg?.querySelectorAll('line').length ?? 0,
    segments,
    nodes,
    overlaps,
    canvasWidth: canvas?.getBoundingClientRect().width ?? 0,
    canvasHeight: canvas?.getBoundingClientRect().height ?? 0,
    selectedVisible: Boolean(routeRect && selectedRect)
      && selectedRect.left >= routeRect.left - 1
      && selectedRect.right <= routeRect.right + 1,
    linesDisplay: svg ? getComputedStyle(svg).display : null,
    minimumTargetHeight: nodes.length ? Math.min(...nodes.map((node) => node.height)) : 0,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    overflowStart: route?.dataset.overflowStart,
    overflowEnd: route?.dataset.overflowEnd,
  };
})()`;

const failures = [];
const results = [];
const check = (condition, message, state) => {
  if (!condition) failures.push(`${message}: ${JSON.stringify(state)}`);
};
const segmentCount = (state, segment) => state.segments.filter((item) => item.segment === segment).length;

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
  `--user-data-dir=/tmp/menu-lens-route-geometry-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create route geometry target: ${targetResponse.status}`);
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
  for (const expected of cases) {
    await client.send("Page.navigate", {
      url: `${baseUrl}/models/?model=${expected.model}&section=${expected.section}&viewport=390`,
    });
    await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === ${JSON.stringify(expected.section)}`, `${expected.model} desktop route`);
    await settle(client);
    const state = await evaluate(client, stateExpression);
    check(state.layout === expected.layout, `${expected.model} layout type`, state);
    check(state.canvasWidth <= expected.desktopMaxWidth, `${expected.model} compact desktop width`, state);
    check(state.overlaps === 0, `${expected.model} node overlap`, state);
    check(!state.documentOverflow, `${expected.model} desktop document overflow`, state);

    if (expected.layout === "compact-sequence") {
      check(state.lineCount === expected.directLines, `${expected.model} direct lineage line count`, state);
      check(state.segments.length === 0, `${expected.model} compact sequence must remain direct`, state);
    }

    if (expected.layout === "balanced-rail") {
      const root = state.nodes[0];
      const peers = state.nodes.slice(1);
      const peerYs = peers.map(({ markerY }) => markerY);
      const peerXs = peers.map(({ markerX }) => markerX);
      check(state.lineCount === 0, `${expected.model} balanced rail must be path based`, state);
      check(segmentCount(state, "stem") === 1, `${expected.model} one stem`, state);
      check(segmentCount(state, "rail") === 1, `${expected.model} one rail`, state);
      check(segmentCount(state, "drop") === expected.drops, `${expected.model} peer drops`, state);
      check(root.markerY < Math.min(...peerYs), `${expected.model} root above peers`, state);
      check(Math.max(...peerYs) - Math.min(...peerYs) <= 2, `${expected.model} peers share y axis`, state);
      check(peerXs.every((x, index) => index === 0 || x > peerXs[index - 1]), `${expected.model} peer x order`, state);
      check(Math.abs(root.markerX - ((peerXs[0] + peerXs[peerXs.length - 1]) / 2)) <= 2, `${expected.model} root centered`, state);
    }

    if (expected.layout === "parallel-rail") {
      const xs = state.nodes.map(({ markerX }) => markerX);
      const ys = state.nodes.map(({ markerY }) => markerY);
      check(state.lineCount === 0, `${expected.model} must not render sequential lines`, state);
      check(segmentCount(state, "rail") === 1, `${expected.model} one grouping rail`, state);
      check(segmentCount(state, "drop") === expected.drops, `${expected.model} equal parallel drops`, state);
      check(segmentCount(state, "active") === 1, `${expected.model} one selected drop`, state);
      check(Math.max(...ys) - Math.min(...ys) <= 2, `${expected.model} parallel nodes share y axis`, state);
      check(xs.every((x, index) => index === 0 || x > xs[index - 1]), `${expected.model} parallel x order`, state);
    }

    results.push({ name: `${expected.model}-desktop`, state });
    await capture(client, `model-geometry-${expected.model}-1792.png`);
  }

  for (const width of [390, 320]) {
    await setViewport(client, width, 960);
    for (const expected of cases) {
      await client.send("Page.navigate", {
        url: `${baseUrl}/models/?model=${expected.model}&section=${expected.mobileSection}&viewport=390`,
      });
      await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === ${JSON.stringify(expected.mobileSection)}`, `${expected.model} ${width}px route`);
      await settle(client);
      const state = await evaluate(client, stateExpression);
      check(state.layout === expected.layout, `${expected.model} ${width}px layout identity`, state);
      check(state.linesDisplay === "none", `${expected.model} ${width}px hides desktop geometry`, state);
      check(state.selectedVisible, `${expected.model} ${width}px selected node visible`, state);
      check(state.minimumTargetHeight >= 44, `${expected.model} ${width}px target height`, state);
      check(state.overlaps === 0, `${expected.model} ${width}px node overlap`, state);
      check(!state.documentOverflow, `${expected.model} ${width}px document overflow`, state);
      results.push({ name: `${expected.model}-${width}`, state });
      await capture(client, `model-geometry-${expected.model}-${width}.png`);
    }
  }

  await writeFile(
    new URL("route-geometry-results.json", outputDir),
    `${JSON.stringify({ failures, results }, null, 2)}\n`,
  );

  if (failures.length) throw new Error(`Route geometry browser review failed:\n- ${failures.join("\n- ")}`);
  console.log("Route geometry browser review passed: all desktop layouts and all-model mobile fallbacks verified.");
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
