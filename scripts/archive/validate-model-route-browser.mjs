import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_ROUTE_DEBUG_PORT ?? 9447);
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
  throw new Error("No Chrome or Chromium binary was found for model-route review.");
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

const setViewport = (client, width, height = 1000) => client.send(
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
  await evaluate(client, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
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
  const buttons = [...route.querySelectorAll('button[data-section-id]')];
  const selected = buttons.find((button) => button.getAttribute('aria-selected') === 'true');
  const routeRect = route.getBoundingClientRect();
  const selectedRect = selected?.getBoundingClientRect();
  return {
    modelTitle: document.querySelector('#model-title')?.textContent,
    signature: document.querySelector('#model-diagram-signature')?.textContent,
    statement: document.querySelector('#model-diagram-statement')?.textContent,
    conceptHidden: document.querySelector('#model-concept')?.hidden,
    routeKind: route?.dataset.routeKind,
    labels: buttons.map((button) => button.textContent.trim()),
    selectedId: selected?.dataset.sectionId,
    selectedFocused: document.activeElement === selected,
    selectedVisible: Boolean(selectedRect)
      && selectedRect.left >= routeRect.left - 1
      && selectedRect.right <= routeRect.right + 1,
    currentLabel: document.querySelector('#section-current-label')?.textContent,
    currentNote: document.querySelector('#section-summary')?.textContent,
    vignetteType: document.querySelector('#model-concept-vignette')?.dataset.vignetteType,
    vignettePreview: document.querySelector('#model-concept-vignette')?.dataset.preview,
    objectIds: [...document.querySelectorAll('#all-live-board .model-live-card')]
      .map((card) => card.dataset.objectId),
    url: location.href,
    overflowStart: route?.dataset.overflowStart,
    overflowEnd: route?.dataset.overflowEnd,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    genericSelectedRole: [...document.querySelectorAll('.model-live-card__role')]
      .some((element) => !element.hidden && element.textContent === '已選取'),
  };
})()`;

const assertState = (failures, label, state, expected) => {
  const checks = [
    [state.modelTitle === "Horizontal Navigation", "model title"],
    [state.signature === "Horizontal sequence", "signature"],
    [state.statement === "由市場基準逐步增加分類展寬、料理序列與局部焦點。", "statement"],
    [state.conceptHidden === false, "concept visible"],
    [state.routeKind === "sequence", "route kind"],
    [JSON.stringify(state.labels) === JSON.stringify(["市場基準", "分類 Spread", "料理 Ribbon", "Fisheye"]), "route labels"],
    [state.selectedId === expected.selectedId, "selected section"],
    [state.currentLabel === expected.currentLabel, "current label"],
    [state.vignetteType === expected.vignetteType, "vignette type"],
    [JSON.stringify(state.objectIds) === JSON.stringify(expected.objectIds), "object IDs"],
    [state.url.includes(`section=${expected.selectedId}`), "URL section"],
    [state.selectedVisible, "selected node visible"],
    [!state.documentOverflow, "no document overflow"],
    [!state.genericSelectedRole, "no generic selected role"],
  ];
  const failed = checks.filter(([passed]) => !passed).map(([, name]) => name);
  if (failed.length) failures.push(`${label}: ${failed.join(", ")} :: ${JSON.stringify(state)}`);
};

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
  `--user-data-dir=/tmp/menu-lens-model-route-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create model-route target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  const failures = [];
  const results = [];
  await setViewport(client, 1792);
  await client.send("Page.navigate", {
    url: `${baseUrl}/models/?model=horizontal-navigation&section=spread&variant=08&viewport=390`,
  });
  await waitFor(client, `(() => document.querySelector('#section-tabs')?.dataset.routeKind === 'sequence'
    && document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'spread'
    && document.querySelectorAll('#all-live-board .model-live-card').length === 2)()`, "desktop Spread route");
  await settle(client);
  const spread = await evaluate(client, stateExpression);
  assertState(failures, "desktop spread", spread, {
    selectedId: "spread",
    currentLabel: "分類 Spread",
    vignetteType: "expanded-band",
    objectIds: ["08", "08A"],
  });
  results.push({ name: "desktop-spread", state: spread });
  await capture(client, "horizontal-route-spread-1792.png");

  await evaluate(client, `document.querySelector('[data-section-id="fisheye"]')
    .dispatchEvent(new PointerEvent('pointerenter'))`);
  await waitFor(client, `(() => document.querySelector('#model-concept-vignette')?.dataset.vignetteType === 'fisheye-axis'
    && document.querySelector('#section-current-label')?.textContent === 'Fisheye')()`, "Fisheye hover preview");
  await settle(client);
  const hover = await evaluate(client, stateExpression);
  if (hover.selectedId !== "spread"
    || !hover.url.includes("section=spread")
    || JSON.stringify(hover.objectIds) !== JSON.stringify(["08", "08A"])
    || hover.vignetteType !== "fisheye-axis"
    || hover.vignettePreview !== "true") {
    failures.push(`hover preview changed committed state: ${JSON.stringify(hover)}`);
  }
  results.push({ name: "hover-preview", state: hover });

  await evaluate(client, `document.querySelector('[data-section-id="fisheye"]')
    .dispatchEvent(new PointerEvent('pointerleave'))`);
  await waitFor(client, `(() => document.querySelector('#model-concept-vignette')?.dataset.vignetteType === 'expanded-band'
    && document.querySelector('#section-current-label')?.textContent === '分類 Spread')()`, "Spread hover restore");

  await evaluate(client, `document.querySelector('[data-section-id="fisheye"]').click()`);
  await waitFor(client, `(() => document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'fisheye'
    && [...document.querySelectorAll('#all-live-board .model-live-card')].map((card) => card.dataset.objectId).join(',') === '10,10A')()`, "Fisheye click commit");
  await settle(client);
  const clicked = await evaluate(client, stateExpression);
  assertState(failures, "clicked fisheye", clicked, {
    selectedId: "fisheye",
    currentLabel: "Fisheye",
    vignetteType: "fisheye-axis",
    objectIds: ["10", "10A"],
  });
  if (!clicked.selectedFocused) failures.push(`clicked Fisheye node did not retain focus: ${JSON.stringify(clicked)}`);
  results.push({ name: "clicked-fisheye", state: clicked });
  await capture(client, "horizontal-route-fisheye-1792.png");

  await evaluate(client, "history.back()");
  await waitFor(client, `(() => document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'spread')()`, "history back to Spread");
  await settle(client);
  const back = await evaluate(client, stateExpression);
  assertState(failures, "history back", back, {
    selectedId: "spread",
    currentLabel: "分類 Spread",
    vignetteType: "expanded-band",
    objectIds: ["08", "08A"],
  });
  results.push({ name: "history-back", state: back });

  await evaluate(client, "history.forward()");
  await waitFor(client, `(() => document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'fisheye')()`, "history forward to Fisheye");
  await settle(client);
  const forward = await evaluate(client, stateExpression);
  assertState(failures, "history forward", forward, {
    selectedId: "fisheye",
    currentLabel: "Fisheye",
    vignetteType: "fisheye-axis",
    objectIds: ["10", "10A"],
  });
  results.push({ name: "history-forward", state: forward });

  await setViewport(client, 390);
  await settle(client);
  const mobile = await evaluate(client, stateExpression);
  assertState(failures, "mobile fisheye", mobile, {
    selectedId: "fisheye",
    currentLabel: "Fisheye",
    vignetteType: "fisheye-axis",
    objectIds: ["10", "10A"],
  });
  results.push({ name: "mobile-fisheye", state: mobile });
  await capture(client, "horizontal-route-fisheye-390.png");

  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await client.send("Page.navigate", {
    url: `${baseUrl}/models/?model=horizontal-navigation&section=spread&variant=08&viewport=390`,
  });
  await waitFor(client, `(() => document.querySelector('#model-concept-vignette')?.dataset.vignetteType === 'expanded-band')()`, "reduced-motion route");
  await settle(client);
  const reducedMotion = await evaluate(client, stateExpression);
  assertState(failures, "reduced motion", reducedMotion, {
    selectedId: "spread",
    currentLabel: "分類 Spread",
    vignetteType: "expanded-band",
    objectIds: ["08", "08A"],
  });
  results.push({ name: "reduced-motion", state: reducedMotion });

  await writeFile(
    new URL("model-route-results.json", outputDir),
    `${JSON.stringify({ browser, baseUrl, generatedAt: new Date().toISOString(), results, failures }, null, 2)}\n`,
  );
  if (failures.length) {
    throw new Error(`Model route browser review failed:\n- ${failures.join("\n- ")}`);
  }
  socket.close();
  console.log("Model route browser review: sequence, vignette preview, click, history, mobile, and reduced motion verified.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
