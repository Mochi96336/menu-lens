import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_RIBBON_RAPID_DRAG_DEBUG_PORT ?? 9455);
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
  throw new Error("No Chrome or Chromium binary was found for Ribbon rapid-drag review.");
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

const nextPaint = (client) => evaluate(
  client,
  "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
);

const rootExpression = `
  [...document.querySelectorAll('.model-pooled-surface')]
    .find((candidate) => candidate.dataset.objectId === "09A")
`;

const geometryExpression = `(() => {
  const root = ${rootExpression};
  const frame = root?.querySelector('iframe.model-live-frame');
  const doc = frame?.contentDocument;
  const viewport = doc?.querySelector('#ribbon-viewport');
  const minimap = doc?.querySelector('#ribbon-minimap');
  const handle = doc?.querySelector('.ribbon-minimap__window');
  if (!root || !frame || !doc || !viewport || !minimap || !handle) return null;
  const frameRect = frame.getBoundingClientRect();
  const minimapRect = minimap.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  return {
    scale: viewport.dataset.scale,
    settled: root.dataset.liveRibbonPointerSettled ?? null,
    current: Number(root.dataset.liveRibbonScrollLeft),
    maximum: Number(root.dataset.liveRibbonMaxScroll),
    handleLeftRatio: Number(root.dataset.liveRibbonHandleLeft),
    handleWidthRatio: Number(root.dataset.liveRibbonHandleWidth),
    frameLeft: frameRect.left,
    minimapLeft: minimapRect.left,
    minimapWidth: minimapRect.width,
    handleLeft: handleRect.left,
    handleWidth: handleRect.width,
    handleCenterTop: frameRect.left + handleRect.left + handleRect.width / 2,
  };
})()`;

const pointExpression = (selector) => `(() => {
  const root = ${rootExpression};
  const frame = root.querySelector('iframe.model-live-frame');
  frame.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const frameRect = frame.getBoundingClientRect();
  const element = frame.contentDocument.querySelector(${JSON.stringify(selector)});
  const rect = element.getBoundingClientRect();
  return {
    x: frameRect.left + rect.left + rect.width / 2,
    y: frameRect.top + rect.top + rect.height / 2,
    left: frameRect.left + rect.left,
    right: frameRect.left + rect.right,
    width: rect.width,
  };
})()`;

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
  `--user-data-dir=/tmp/menu-lens-ribbon-rapid-drag-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create Ribbon rapid-drag target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 1440,
    screenHeight: 960,
  });

  const params = new URLSearchParams({
    model: "horizontal-navigation",
    section: "ribbon",
    variant: "09A",
    viewport: "390",
    view: "focus",
  });
  const path = `/models/?${params}`;
  await client.send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitFor(client, `(() => {
    const root = ${rootExpression};
    const frame = root?.querySelector('iframe.model-live-frame');
    return root?.dataset.liveState === 'ready'
      && root?.dataset.liveRibbonHandle === 'ready'
      && frame?.contentDocument?.querySelector('#ribbon-viewport')?.dataset.scale === 'overview';
  })()`, "09A/390 overview handle");
  await nextPaint(client);
  await delay(100);

  const handle = await evaluate(client, pointExpression(".ribbon-minimap__window"));
  const minimap = await evaluate(client, pointExpression("#ribbon-minimap"));
  const targetX = minimap.left + minimap.width * .75;

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: handle.x,
    y: handle.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: handle.x,
    y: handle.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: targetX,
    y: handle.y,
    button: "left",
    buttons: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: targetX,
    y: handle.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });

  await waitFor(client, `(() => {
    const root = ${rootExpression};
    const frame = root.querySelector('iframe.model-live-frame');
    return frame.contentDocument.querySelector('#ribbon-viewport').dataset.scale === 'reading'
      && root.dataset.liveRibbonPointerSettled === 'true'
      && Number(root.dataset.liveRibbonMaxScroll) > 0;
  })()`, "09A/390 rapid overview drag settles");
  await nextPaint(client);
  await delay(120);

  const result = await evaluate(client, geometryExpression);
  assert.ok(result, "Rapid-drag geometry is missing.");
  assert.equal(result.scale, "reading");
  assert.equal(result.settled, "true");
  assert.ok(result.maximum > 0, "Rapid drag did not enter a scrollable Ribbon.");
  assert.ok(
    Math.abs(result.handleCenterTop - targetX) <= 2,
    `Rapid drag handle center ${result.handleCenterTop} did not settle under pointer ${targetX}.`,
  );

  const travel = Math.max(1, result.minimapWidth - result.handleWidth);
  const targetLocal = targetX - result.frameLeft - result.minimapLeft;
  const expectedProgress = Math.max(0, Math.min(1,
    (targetLocal - result.handleWidth / 2) / travel,
  ));
  const actualProgress = result.current / result.maximum;
  assert.ok(
    Math.abs(actualProgress - expectedProgress) <= .006,
    `Rapid drag mapped to ${actualProgress}, expected ${expectedProgress}.`,
  );

  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(
    new URL("model-ribbon-rapid-overview-drag-09A-390.png", outputDir),
    Buffer.from(screenshot.data, "base64"),
  );
  await writeFile(
    new URL("model-ribbon-rapid-drag-results.json", outputDir),
    `${JSON.stringify({ browser, baseUrl, generatedAt: new Date().toISOString(), path, targetX, result }, null, 2)}\n`,
  );
  socket.close();
  console.log("Model Ribbon rapid-drag browser review: a press-move-release from the overview handle remains under the final pointer after the reading layout and scrollbar geometry settle.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
