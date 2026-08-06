import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { modelRouteBrowserCases as modelCases } from "./model-route-browser-cases.mjs";

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

const pressKey = async (client, key, code = key) => {
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", key, code });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key, code });
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
  const panel = document.querySelector('#model-section-panel');
  const buttons = [...route.querySelectorAll('button[data-section-id]')];
  const selected = buttons.find((button) => button.getAttribute('aria-selected') === 'true');
  const focused = buttons.find((button) => document.activeElement === button);
  const routeRect = route.getBoundingClientRect();
  const selectedRect = selected?.getBoundingClientRect();
  const rects = buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { id: button.dataset.sectionId, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height };
  });
  let overlaps = 0;
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const width = Math.min(rects[i].right, rects[j].right) - Math.max(rects[i].left, rects[j].left);
      const height = Math.min(rects[i].bottom, rects[j].bottom) - Math.max(rects[i].top, rects[j].top);
      if (width > 8 && height > 8) overlaps += 1;
    }
  }
  return {
    modelTitle: document.querySelector('#model-title')?.textContent,
    conceptLabel: document.querySelector('#model-diagram-signature')?.textContent,
    statement: document.querySelector('#model-diagram-statement')?.textContent,
    conceptHidden: document.querySelector('#model-concept')?.hidden,
    routeKind: route?.dataset.routeKind,
    nodeCount: buttons.length,
    labels: buttons.map((button) => button.textContent.trim()),
    selectedId: selected?.dataset.sectionId,
    focusedId: focused?.dataset.sectionId,
    selectedFocused: document.activeElement === selected,
    selectedVisible: Boolean(selectedRect)
      && selectedRect.left >= routeRect.left - 1
      && selectedRect.right <= routeRect.right + 1,
    rovingCount: buttons.filter((button) => button.tabIndex === 0).length,
    selectedTabIndex: selected?.tabIndex,
    controlsCorrect: buttons.every((button) => button.getAttribute('aria-controls') === panel?.id),
    panelLabelledBy: panel?.getAttribute('aria-labelledby'),
    selectedButtonId: selected?.id,
    currentLabel: document.querySelector('#section-current-label')?.textContent,
    routeNote: document.querySelector('#section-route-note')?.textContent,
    canonicalSummary: document.querySelector('#section-summary')?.textContent,
    vignetteType: document.querySelector('#model-concept-vignette')?.dataset.vignetteType,
    vignetteVariant: document.querySelector('#model-concept-vignette')?.dataset.vignetteVariant,
    vignettePreview: document.querySelector('#model-concept-vignette')?.dataset.preview,
    objectIds: [...document.querySelectorAll('#all-live-board .model-live-card')].map((card) => card.dataset.objectId),
    url: location.href,
    overflowStart: route?.dataset.overflowStart,
    overflowEnd: route?.dataset.overflowEnd,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    genericSelectedRole: [...document.querySelectorAll('.model-live-card__role')]
      .some((element) => !element.hidden && element.textContent === '已選取'),
    overlaps,
    minimumTargetHeight: rects.length ? Math.min(...rects.map((rect) => rect.height)) : 0,
  };
})()`;

const addFailure = (failures, label, state, checks) => {
  const failed = checks.filter(([passed]) => !passed).map(([, name]) => name);
  if (failed.length) failures.push(`${label}: ${failed.join(", ")} :: ${JSON.stringify(state)}`);
};

const assertModelCase = (failures, state, expected) => addFailure(failures, expected.model, state, [
  [state.modelTitle === expected.title, "model title"],
  [state.conceptHidden === false, "concept visible"],
  [Boolean(state.conceptLabel), "concept label"],
  [Boolean(state.statement), "model statement"],
  [state.routeKind === expected.kind, "route kind"],
  [state.nodeCount === expected.nodeCount, "node count"],
  [state.selectedId === expected.section, "selected section"],
  [state.vignetteType === expected.vignetteType, "vignette type"],
  [state.vignetteVariant === expected.vignetteVariant, "vignette variant"],
  [JSON.stringify(state.objectIds) === JSON.stringify(expected.objectIds), "object IDs"],
  [state.url.includes(`model=${expected.model}`) && state.url.includes(`section=${expected.section}`), "canonical URL"],
  [state.selectedVisible, "selected node visible"],
  [state.rovingCount === 1 && state.selectedTabIndex === 0, "selected roving tab"],
  [state.controlsCorrect && state.panelLabelledBy === state.selectedButtonId, "tab panel relation"],
  [state.overlaps === 0, "node overlap"],
  [!state.documentOverflow, "no document overflow"],
  [!state.genericSelectedRole, "no generic selected role"],
]);

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

  for (const expected of modelCases) {
    await client.send("Page.navigate", {
      url: `${baseUrl}/models/?model=${expected.model}&section=${expected.section}&variant=${encodeURIComponent(expected.variant)}&viewport=390`,
    });
    await waitFor(client, `(() => document.querySelector('#model-title')?.textContent === ${JSON.stringify(expected.title)}
      && document.querySelector('#section-tabs')?.dataset.routeKind === ${JSON.stringify(expected.kind)}
      && document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === ${JSON.stringify(expected.section)})()`, `${expected.model} diagram`);
    await settle(client);
    const state = await evaluate(client, stateExpression);
    assertModelCase(failures, state, expected);
    results.push({ name: expected.model, state });
    await capture(client, `model-diagram-${expected.model}-1792.png`);
  }

  await client.send("Page.navigate", {
    url: `${baseUrl}/models/?model=horizontal-navigation&section=spread&variant=08&viewport=390`,
  });
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'spread'`, "horizontal spread keyboard start");
  await settle(client);
  const committedSpread = await evaluate(client, stateExpression);

  await evaluate(client, `document.querySelector('[data-section-id="fisheye"]')
    .dispatchEvent(new PointerEvent('pointerenter'))`);
  await waitFor(client, `document.querySelector('#model-concept-vignette')?.dataset.vignetteVariant === 'fisheye'`, "Fisheye concept preview");
  await settle(client);
  const hover = await evaluate(client, stateExpression);
  addFailure(failures, "hover preview isolation", hover, [
    [hover.selectedId === "spread", "selection unchanged"],
    [hover.currentLabel === committedSpread.currentLabel, "current label committed"],
    [hover.routeNote === committedSpread.routeNote, "route note committed"],
    [hover.canonicalSummary === committedSpread.canonicalSummary, "canonical summary committed"],
    [hover.vignetteVariant === "fisheye" && hover.vignettePreview === "true", "hero preview"],
    [JSON.stringify(hover.objectIds) === JSON.stringify(["08", "08A"]), "cards unchanged"],
    [hover.url.includes("section=spread"), "URL unchanged"],
  ]);
  results.push({ name: "hover-preview-isolation", state: hover });

  await evaluate(client, `document.querySelector('[data-section-id="fisheye"]')
    .dispatchEvent(new PointerEvent('pointerleave'))`);
  await waitFor(client, `document.querySelector('#model-concept-vignette')?.dataset.vignetteVariant === 'spread'`, "Spread preview restore");

  await evaluate(client, `document.querySelector('[data-section-id="spread"]').focus()`);
  await pressKey(client, "ArrowRight", "ArrowRight");
  await waitFor(client, `document.activeElement?.dataset.sectionId === 'weighted-strip'`, "ArrowRight roving focus");
  await settle(client);
  const arrow = await evaluate(client, stateExpression);
  addFailure(failures, "keyboard preview", arrow, [
    [arrow.selectedId === "spread", "selection remains Spread"],
    [arrow.focusedId === "weighted-strip", "focus moves to Weighted Strip"],
    [arrow.rovingCount === 1, "single roving tab"],
    [arrow.conceptLabel === "Count-weighted viewport" && arrow.vignettePreview === "true", "focused concept preview"],
    [arrow.currentLabel === committedSpread.currentLabel && arrow.routeNote === committedSpread.routeNote, "committed route copy"],
  ]);

  await evaluate(client, "document.activeElement.click()");
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'weighted-strip'`, "focused route activation commits Weighted Strip");
  await settle(client);
  const committedWeightedStrip = await evaluate(client, stateExpression);
  addFailure(failures, "keyboard commit", committedWeightedStrip, [
    [committedWeightedStrip.selectedId === "weighted-strip", "Weighted Strip selected"],
    [committedWeightedStrip.selectedFocused, "focus retained"],
    [committedWeightedStrip.conceptLabel === "Count-weighted viewport" && committedWeightedStrip.vignettePreview === "false", "Weighted Strip committed"],
    [JSON.stringify(committedWeightedStrip.objectIds) === JSON.stringify(["17", "17A"]), "Weighted Strip objects"],
    [committedWeightedStrip.url.includes("section=weighted-strip"), "Weighted Strip URL"],
  ]);
  results.push({ name: "keyboard-route", state: committedWeightedStrip });

  await evaluate(client, "history.back()");
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'spread'`, "history back to Spread");
  await evaluate(client, "history.forward()");
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'weighted-strip'`, "history forward to Weighted Strip");

  await setViewport(client, 320);
  await client.send("Page.navigate", {
    url: `${baseUrl}/models/?model=landscape-paper&section=stopped-routes&variant=19&viewport=390`,
  });
  await waitFor(client, `document.querySelector('#section-tabs button[aria-selected="true"]')?.dataset.sectionId === 'stopped-routes'`, "320px Landscape route");
  await settle(client);
  await evaluate(client, `document.querySelector('#section-tabs').scrollIntoView({ block: 'start' })`);
  await settle(client);
  const mobile = await evaluate(client, stateExpression);
  addFailure(failures, "320px branch", mobile, [
    [mobile.routeKind === "branch", "branch kind"],
    [mobile.selectedId === "stopped-routes" && mobile.selectedVisible, "selected branch visible"],
    [mobile.minimumTargetHeight >= 44, "44px targets"],
    [mobile.overflowStart === "true", "left overflow cue"],
    [!mobile.documentOverflow, "no document overflow"],
  ]);
  results.push({ name: "landscape-320", state: mobile });
  await capture(client, "model-diagram-landscape-paper-320.png");

  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await client.send("Page.navigate", {
    url: `${baseUrl}/models/?model=paper-field&section=elastic-geometry&variant=15&viewport=390`,
  });
  await waitFor(client, `document.querySelector('#model-concept-vignette')?.dataset.vignetteVariant === 'elastic'`, "reduced-motion field");
  await settle(client);
  const reducedMotion = await evaluate(client, stateExpression);
  addFailure(failures, "reduced motion", reducedMotion, [
    [reducedMotion.routeKind === "field", "field route"],
    [reducedMotion.selectedId === "elastic-geometry", "elastic selected"],
    [reducedMotion.vignetteVariant === "elastic", "elastic final geometry"],
    [!reducedMotion.documentOverflow, "no overflow"],
  ]);
  results.push({ name: "reduced-motion-field", state: reducedMotion });

  await writeFile(
    new URL("model-route-results.json", outputDir),
    `${JSON.stringify({ browser, baseUrl, generatedAt: new Date().toISOString(), results, failures }, null, 2)}\n`,
  );
  if (failures.length) throw new Error(`Model route browser review failed:\n- ${failures.join("\n- ")}`);
  socket.close();
  console.log("Model route browser review: six models, four topologies, preview isolation, keyboard, history, 320px, and reduced motion verified.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
