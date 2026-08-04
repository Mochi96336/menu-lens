import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { designModels } from "../../research-history/catalog/presentation-models.mjs";
import { modelLivePresentationEntries } from "../../research-history/catalog/model-live-presentations.mjs";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_LIVE_PRESENTATION_DEBUG_PORT ?? 9450);
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
  throw new Error("No Chrome or Chromium binary was found for model live-presentation review.");
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

const routeByObjectId = new Map();
for (const model of designModels) {
  for (const section of model.sections) {
    for (const objectId of section.objectIds) {
      if (!routeByObjectId.has(objectId)) {
        routeByObjectId.set(objectId, { modelId: model.id, sectionId: section.id });
      }
    }
  }
}

const routePath = ({ modelId, sectionId, objectId, view = "focus" }) => {
  const params = new URLSearchParams({
    model: modelId,
    section: sectionId,
    variant: objectId,
    viewport: "390",
  });
  if (view === "focus") params.set("view", "focus");
  return `/models/?${params}`;
};

const pathForObject = (objectId, view = "focus") => {
  const route = routeByObjectId.get(objectId);
  if (!route) throw new Error(`No Design Model route owns ${objectId}.`);
  return routePath({ ...route, objectId, view });
};

const profileContracts = Object.freeze({
  multiscale: Object.freeze({ stage: ".scale-map", restaurant: ".multiscale-screen > header" }),
  spread: Object.freeze({ stage: ".spread-map", restaurant: ".spread-restaurant", hint: ".spread-hint" }),
  ribbon: Object.freeze({ stage: ".ribbon-viewport", restaurant: ".ribbon-restaurant", hint: ".ribbon-hint" }),
  fisheye: Object.freeze({ stage: ".fisheye-stage", restaurant: ".fisheye-restaurant", hint: ".fisheye-hint" }),
  matrix: Object.freeze({ stage: ".matrix-board", restaurant: ".matrix-restaurant", hint: ".matrix-hint" }),
  paper: Object.freeze({ stage: ".paper-viewport", restaurant: ".paper-restaurant", hint: ".paper-hint" }),
  loupe: Object.freeze({ stage: "#loupe-viewport", restaurant: ".paper-restaurant", hint: ".paper-hint" }),
  "landscape-camera": Object.freeze({ stage: ".landscape-viewport", restaurant: ".paper-restaurant", hint: ".paper-hint" }),
  "landscape-continuous": Object.freeze({ stage: ".landscape-viewport", restaurant: ".paper-restaurant", hint: ".paper-hint" }),
  "landscape-focus": Object.freeze({ stage: ".landscape-viewport", restaurant: ".paper-restaurant", hint: ".paper-hint" }),
  "rigid-sheet": Object.freeze({ stage: "#rigid-stage", restaurant: ".paper-restaurant", hint: ".paper-hint" }),
  trifold: Object.freeze({ stage: "#trifold-stage", restaurant: ".paper-restaurant", hint: ".paper-hint" }),
  "two-column": Object.freeze({ stage: "#window-stage", restaurant: ".paper-restaurant", hint: ".paper-hint" }),
  volume: Object.freeze({ stage: "#volume-stage", restaurant: ".depth-restaurant", hint: ".depth-hint" }),
  projection: Object.freeze({ stage: ".projection-plot", restaurant: ".projection-restaurant", hint: ".projection-hint" }),
  parallax: Object.freeze({ stage: ".parallax-stage", restaurant: ".parallax-restaurant", hint: ".parallax-hint" }),
});

const documentSurfaceCases = Object.freeze([
  Object.freeze({ objectId: "01", restaurant: ".restaurant-name" }),
  Object.freeze({ objectId: "05C", restaurant: ".restaurant-name" }),
  Object.freeze({ objectId: "07", restaurant: ".atlas-restaurant", hint: ".atlas-hint" }),
]);

const initialCoverageGroups = new Map();
for (const entry of modelLivePresentationEntries) {
  const route = routeByObjectId.get(entry.objectId);
  const contract = profileContracts[entry.profileId];
  if (!route) throw new Error(`No route owns mapped object ${entry.objectId}.`);
  if (!contract) throw new Error(`No browser contract exists for profile ${entry.profileId}.`);
  const groupKey = `${route.modelId}/${route.sectionId}`;
  if (!initialCoverageGroups.has(groupKey)) initialCoverageGroups.set(groupKey, { ...route, entries: [] });
  initialCoverageGroups.get(groupKey).entries.push({ ...entry, contract });
}

const interactionCases = Object.freeze([
  Object.freeze({
    name: "multiscale returns to categories",
    objectId: "06",
    enter: ".scale-category > button",
    state: "focus",
    toolbar: ".workspace-topbar",
    returnButton: "#collapse-all",
    returnText: "← 返回分類",
    returnAria: "返回分類",
    exitState: "overview",
  }),
  Object.freeze({
    name: "spread returns to categories",
    objectId: "08",
    enter: ".spread-category__focus",
    state: "focus",
    toolbar: ".spread-toolbar",
    returnButton: "#spread-overview",
    returnText: "← 返回分類",
    returnAria: "返回分類",
    exitState: "overview",
  }),
  Object.freeze({
    name: "ribbon returns to menu",
    objectId: "09",
    enter: ".ribbon-product summary",
    state: "focus",
    toolbar: ".ribbon-scale-bar",
    returnButton: "#ribbon-overview",
    returnText: "← 返回菜單",
    returnAria: "返回菜單",
    exitState: "overview",
  }),
  Object.freeze({
    name: "fisheye returns to category",
    objectId: "10",
    enter: ".fisheye-product[data-category-focused=\"true\"] summary",
    state: "focus",
    toolbar: ".fisheye-lens-switch",
    returnButton: "#fisheye-category-lens",
    returnText: "← 返回分類",
    returnAria: "返回分類",
    exitState: "overview",
  }),
  Object.freeze({
    name: "matrix returns to matrix",
    objectId: "11",
    enter: ".matrix-row__label",
    state: "focus",
    toolbar: ".matrix-toolbar",
    returnButton: "#matrix-overview",
    returnText: "← 返回矩陣",
    returnAria: "返回矩陣",
    exitState: "overview",
  }),
  Object.freeze({
    name: "paper returns to overview",
    objectId: "12",
    enter: ".paper-category__header",
    state: "focus",
    toolbar: ".paper-toolbar",
    returnButton: "#paper-overview",
    returnText: "← 返回全覽",
    returnAria: "返回全覽",
    exitState: "overview",
    cleanControl: ".paper-category__header",
  }),
  Object.freeze({
    name: "landscape returns to overview",
    objectId: "18",
    enter: ".paper-category__header",
    state: "focus",
    toolbar: ".paper-toolbar",
    returnButton: "#landscape-overview",
    returnText: "← 返回全覽",
    returnAria: "返回全覽",
    exitState: "overview",
    cleanControl: ".paper-category__header",
  }),
  Object.freeze({
    name: "focus geometry returns to overview",
    objectId: "22D",
    enter: ".paper-category__header",
    state: "focus",
    toolbar: ".paper-toolbar",
    returnButton: ".paper-toolbar > button:first-child",
    returnText: "← 返回全覽",
    returnAria: "返回全覽",
    exitState: "overview",
    cleanControl: ".paper-category__header",
  }),
  Object.freeze({
    name: "vertical landscape returns to overview",
    objectId: "24",
    enter: ".paper-category__header",
    state: "focus",
    toolbar: ".paper-toolbar",
    returnButton: "#vertical-overview",
    returnText: "← 返回全覽",
    returnAria: "返回全覽",
    exitState: "overview",
    cleanControl: ".paper-category__header",
  }),
  Object.freeze({
    name: "proportional landscape keeps located navigation",
    objectId: "18A",
    enter: "#proportional-next",
    continuous: true,
    toolbar: ".paper-toolbar",
    interactive: ["#proportional-previous", "#proportional-next"],
    visible: [".paper-location", "#proportional-location-title", "#proportional-location-meta"],
  }),
  Object.freeze({
    name: "rigid sheet keeps one return",
    objectId: "19",
    viewports: ["390"],
    enter: ".paper-category__header",
    state: "focus",
    toolbar: ".paper-toolbar",
    returnButton: "#rigid-overview",
    returnText: "← 返回全覽",
    returnAria: "返回全覽",
    exitState: "overview",
  }),
  Object.freeze({
    name: "trifold keeps one return",
    objectId: "20",
    viewports: ["390"],
    enter: ".paper-category__header",
    state: "focus",
    toolbar: ".paper-toolbar",
    returnButton: "#trifold-overview",
    returnText: "← 返回全覽",
    returnAria: "返回全覽",
    exitState: "overview",
  }),
  Object.freeze({
    name: "two column keeps one return",
    objectId: "21",
    viewports: ["390"],
    enter: ".paper-category__header",
    state: "focus",
    toolbar: ".paper-toolbar",
    returnButton: "#window-overview",
    returnText: "← 返回全覽",
    returnAria: "返回全覽",
    exitState: "overview",
  }),
  Object.freeze({
    name: "volume keeps one return",
    objectId: "25B",
    viewports: ["390"],
    enter: "#volume-layer-picker button",
    state: "focus",
    toolbar: ".depth-toolbar",
    returnButton: "#volume-overview",
    returnText: "← 返回全覽",
    returnAria: "返回全覽",
    exitState: "overview",
  }),
]);

const objectRootExpression = (objectId) => `
  [...document.querySelectorAll('.model-pooled-surface')]
    .find((candidate) => candidate.dataset.objectId === ${JSON.stringify(objectId)})
`;

const surfaceReadyExpression = (objectId) => `(() => {
  const root = ${objectRootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  return document.readyState === 'complete'
    && root?.dataset.liveState === 'ready'
    && frame
    && !frame.hidden
    && frame.contentDocument?.readyState === 'complete'
    && Boolean(frame.contentDocument.querySelector('#model-live-humanization-style'));
})()`;

const presentationStateExpression = (objectId, state) => `(() => {
  const root = ${objectRootExpression(objectId)};
  return root?.dataset.livePresentationState === ${JSON.stringify(state)};
})()`;

const centerSurfaceExpression = (objectId) => `(async () => {
  const root = ${objectRootExpression(objectId)};
  if (!root) return false;
  root.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return true;
})()`;

const snapshotExpression = (objectId, selectors = []) => `(() => {
  const root = ${objectRootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  const documentRoot = frame?.contentDocument;
  const styles = {};
  for (const selector of ${JSON.stringify(selectors)}) {
    const element = documentRoot?.querySelector(selector);
    const computed = element ? getComputedStyle(element) : null;
    const rect = element?.getBoundingClientRect();
    const viewportWidth = documentRoot?.documentElement.clientWidth ?? 0;
    const viewportHeight = documentRoot?.documentElement.clientHeight ?? 0;
    const centerX = rect ? rect.left + rect.width / 2 : 0;
    const centerY = rect ? rect.top + rect.height / 2 : 0;
    const centerInViewport = Boolean(rect)
      && centerX >= 0 && centerX <= viewportWidth
      && centerY >= 0 && centerY <= viewportHeight;
    const hit = centerInViewport ? documentRoot.elementFromPoint(centerX, centerY) : null;
    const opacity = computed ? Number.parseFloat(computed.opacity || '1') : 0;
    const rendered = Boolean(element && computed && rect)
      && computed.display !== 'none'
      && computed.visibility !== 'hidden'
      && computed.visibility !== 'collapse'
      && opacity > .01
      && rect.width > .5
      && rect.height > .5;
    styles[selector] = element ? {
      display: computed.display,
      visibility: computed.visibility,
      opacity,
      pointerEvents: computed.pointerEvents,
      position: computed.position,
      width: rect.width,
      height: rect.height,
      rendered,
      intersectsViewport: rect.right > 0
        && rect.bottom > 0
        && rect.left < viewportWidth
        && rect.top < viewportHeight,
      centerInViewport,
      hitSelf: Boolean(hit && (hit === element || element.contains(hit))),
      disabled: Boolean(element.matches?.(':disabled') || element.getAttribute('aria-disabled') === 'true'),
      text: element.textContent?.trim() ?? '',
      ariaLabel: element.getAttribute('aria-label'),
      ariaLive: element.getAttribute('aria-live'),
    } : null;
  }

  const forbiddenPattern = /(聚焦這個分類|恢復原比例|inline detail|菜單尺度|閱讀尺度|返回全部分類|返回全部料理)/i;
  const forbiddenControls = [...(documentRoot?.querySelectorAll('button[aria-label], summary[aria-label], [role=button][aria-label], [title]') ?? [])]
    .map((element) => ({
      tag: element.tagName,
      id: element.id,
      ariaLabel: element.getAttribute('aria-label'),
      title: element.getAttribute('title'),
    }))
    .filter((entry) => forbiddenPattern.test((entry.ariaLabel ?? '') + ' ' + (entry.title ?? '')));
  const noisyLiveRegions = [...(documentRoot?.querySelectorAll('[aria-live]:not([aria-live="off"])') ?? [])]
    .map((element) => ({ id: element.id, className: element.className, text: element.textContent?.trim() ?? '' }))
    .filter((entry) => forbiddenPattern.test(entry.text));

  const proportionalViewport = documentRoot?.querySelector('#proportional-viewport');
  const firstProportionalColumn = documentRoot?.querySelector('.proportional-column');
  const firstColumnRect = firstProportionalColumn?.getBoundingClientRect();
  const proportionalRect = proportionalViewport?.getBoundingClientRect();

  return {
    profile: root?.dataset.livePresentation ?? null,
    presentationState: root?.dataset.livePresentationState ?? null,
    humanizationStyle: Boolean(documentRoot?.querySelector('#model-live-humanization-style')),
    showAllText: document.querySelector('#show-all')?.textContent?.trim() ?? null,
    styles,
    forbiddenControls,
    noisyLiveRegions,
    proportional: proportionalViewport ? {
      scrollLeft: proportionalViewport.scrollLeft,
      firstColumnIntersects: Boolean(firstColumnRect && proportionalRect
        && firstColumnRect.right > proportionalRect.left
        && firstColumnRect.left < proportionalRect.right),
    } : null,
  };
})()`;

const pointerPointExpression = (objectId, selector) => `(() => {
  const root = ${objectRootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  const documentRoot = frame?.contentDocument;
  const element = documentRoot?.querySelector(${JSON.stringify(selector)});
  if (!frame || !documentRoot || !element) return null;
  const frameRect = frame.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const localX = rect.left + rect.width / 2;
  const localY = rect.top + rect.height / 2;
  const hit = documentRoot.elementFromPoint(localX, localY);
  return {
    x: frameRect.left + frame.clientLeft + localX,
    y: frameRect.top + frame.clientTop + localY,
    width: rect.width,
    height: rect.height,
    frameVisible: frameRect.right > 0
      && frameRect.bottom > 0
      && frameRect.left < window.innerWidth
      && frameRect.top < window.innerHeight,
    localInViewport: localX >= 0
      && localY >= 0
      && localX <= documentRoot.documentElement.clientWidth
      && localY <= documentRoot.documentElement.clientHeight,
    hitSelf: Boolean(hit && (hit === element || element.contains(hit))),
    disabled: Boolean(element.matches?.(':disabled') || element.getAttribute('aria-disabled') === 'true'),
    pointerEvents: getComputedStyle(element).pointerEvents,
  };
})()`;

const pointerClick = async (client, objectId, selector) => {
  await evaluate(client, centerSurfaceExpression(objectId));
  const point = await evaluate(client, pointerPointExpression(objectId, selector));
  if (!point) return { ok: false, reason: `could not find ${selector}` };
  if (!point.frameVisible || !point.localInViewport) return { ok: false, reason: `${selector} is outside the visible frame`, point };
  if (!point.hitSelf) return { ok: false, reason: `${selector} is covered at its center point`, point };
  if (point.disabled) return { ok: false, reason: `${selector} is disabled`, point };
  if (point.pointerEvents === "none") return { ok: false, reason: `${selector} ignores pointer input`, point };
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
  return { ok: true, point };
};

const requireHidden = (snapshot, selector, failures, label) => {
  const style = snapshot.styles[selector];
  if (!style) failures.push(`${label}: ${selector} is missing`);
  else if (style.rendered) failures.push(`${label}: ${selector} should be hidden`);
};

const requireVisible = (snapshot, selector, failures, label) => {
  const style = snapshot.styles[selector];
  if (!style) failures.push(`${label}: ${selector} is missing`);
  else if (!style.rendered) failures.push(`${label}: ${selector} should be visible`);
  else if (!style.intersectsViewport) failures.push(`${label}: ${selector} is outside the iframe viewport`);
};

const requireInteractive = (snapshot, selector, failures, label) => {
  const style = snapshot.styles[selector];
  requireVisible(snapshot, selector, failures, label);
  if (!style) return;
  if (!style.centerInViewport) failures.push(`${label}: ${selector} center is outside the iframe viewport`);
  if (!style.hitSelf) failures.push(`${label}: ${selector} is covered at its center`);
  if (style.pointerEvents === "none") failures.push(`${label}: ${selector} has pointer-events none`);
  if (style.disabled) failures.push(`${label}: ${selector} is disabled`);
  if (style.width < 30 || style.height < 30) {
    failures.push(`${label}: ${selector} is ${Math.round(style.width)}×${Math.round(style.height)}, below the 30px floor`);
  }
};

const checkLanguage = (snapshot, failures, label) => {
  if (snapshot.forbiddenControls.length) {
    failures.push(`${label}: stale control language ${JSON.stringify(snapshot.forbiddenControls)}`);
  }
  if (snapshot.noisyLiveRegions.length) {
    failures.push(`${label}: stale live-region language ${JSON.stringify(snapshot.noisyLiveRegions)}`);
  }
};

const navigate = async (client, path, viewport) => {
  const url = new URL(path, baseUrl);
  url.searchParams.set("viewport", viewport);
  await client.send("Page.navigate", { url: url.href });
  await waitFor(client, "document.readyState === 'complete'", `${url.pathname}${url.search} document`);
  await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
  return url;
};

const captureScreenshot = async (client, filename) => {
  const capture = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, outputDir), Buffer.from(capture.data, "base64"));
  return filename;
};

const slugify = (value) => value
  .toLowerCase()
  .replaceAll(/[^a-z0-9]+/g, "-")
  .replaceAll(/^-|-$/g, "");

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
  `--user-data-dir=/tmp/menu-lens-live-humanization-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create browser target: ${targetResponse.status}`);
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
    width: 1720,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 1720,
    screenHeight: 1100,
  });

  const failures = [];
  const initialCoverage = [];
  const documentCoverage = [];
  const interactions = [];

  for (const group of initialCoverageGroups.values()) {
    const path = routePath({
      modelId: group.modelId,
      sectionId: group.sectionId,
      objectId: group.entries[0].objectId,
      view: "all",
    });
    const url = await navigate(client, path, "390");
    for (const entry of group.entries) {
      await waitFor(client, surfaceReadyExpression(entry.objectId), `${entry.objectId} mapped surface`);
      await evaluate(client, centerSurfaceExpression(entry.objectId));
      await nextPaint(client);
      const selectors = [
        ".phone-status",
        entry.contract.restaurant,
        entry.contract.stage,
        ...(entry.contract.hint ? [entry.contract.hint] : []),
      ];
      const snapshot = await evaluate(client, snapshotExpression(entry.objectId, selectors));
      const caseFailures = [];
      if (snapshot.profile !== entry.profileId) {
        caseFailures.push(`profile ${JSON.stringify(snapshot.profile)} !== ${JSON.stringify(entry.profileId)}`);
      }
      if (!snapshot.humanizationStyle) caseFailures.push("humanization style is missing");
      requireHidden(snapshot, ".phone-status", caseFailures, "initial");
      requireHidden(snapshot, entry.contract.restaurant, caseFailures, "initial");
      requireVisible(snapshot, entry.contract.stage, caseFailures, "initial");
      if (entry.contract.hint && snapshot.styles[entry.contract.hint]) {
        requireHidden(snapshot, entry.contract.hint, caseFailures, "initial");
      }
      checkLanguage(snapshot, caseFailures, "initial");
      initialCoverage.push({
        objectId: entry.objectId,
        profile: entry.profileId,
        path: `${url.pathname}${url.search}`,
        snapshot,
        failures: caseFailures,
      });
      failures.push(...caseFailures.map((failure) => `mapped ${entry.objectId}: ${failure}`));
    }
  }

  for (const documentCase of documentSurfaceCases) {
    const url = await navigate(client, pathForObject(documentCase.objectId), "390");
    await waitFor(client, surfaceReadyExpression(documentCase.objectId), `${documentCase.objectId} document surface`);
    await evaluate(client, centerSurfaceExpression(documentCase.objectId));
    await nextPaint(client);
    const selectors = [
      ".phone-status",
      documentCase.restaurant,
      ...(documentCase.hint ? [documentCase.hint] : []),
    ];
    const snapshot = await evaluate(client, snapshotExpression(documentCase.objectId, selectors));
    const caseFailures = [];
    if (snapshot.profile !== null) caseFailures.push(`document profile should remain null, got ${snapshot.profile}`);
    requireHidden(snapshot, ".phone-status", caseFailures, "document");
    requireVisible(snapshot, documentCase.restaurant, caseFailures, "document");
    if (documentCase.hint) requireHidden(snapshot, documentCase.hint, caseFailures, "document");
    checkLanguage(snapshot, caseFailures, "document");
    documentCoverage.push({
      objectId: documentCase.objectId,
      path: `${url.pathname}${url.search}`,
      snapshot,
      failures: caseFailures,
    });
    failures.push(...caseFailures.map((failure) => `document ${documentCase.objectId}: ${failure}`));
  }

  for (const testCase of interactionCases) {
    const viewports = testCase.viewports ?? ["320", "390", "desktop"];
    for (const viewport of viewports) {
      const url = await navigate(client, pathForObject(testCase.objectId), viewport);
      await waitFor(client, surfaceReadyExpression(testCase.objectId), `${testCase.name} ${viewport} surface`);
      await evaluate(client, centerSurfaceExpression(testCase.objectId));
      await nextPaint(client);

      const contract = profileContracts[
        modelLivePresentationEntries.find(({ objectId }) => objectId === testCase.objectId)?.profileId
      ];
      const selectors = [
        ".phone-status",
        contract.restaurant,
        contract.stage,
        testCase.toolbar,
        testCase.returnButton,
        ...(testCase.interactive ?? []),
        ...(testCase.visible ?? []),
        ...(testCase.cleanControl ? [testCase.cleanControl] : []),
      ].filter(Boolean);
      const caseFailures = [];
      const initial = await evaluate(client, snapshotExpression(testCase.objectId, selectors));
      if (initial.showAllText !== "回模型列表") {
        caseFailures.push(`outer action ${JSON.stringify(initial.showAllText)} !== "回模型列表"`);
      }
      requireHidden(initial, ".phone-status", caseFailures, "initial");
      requireHidden(initial, contract.restaurant, caseFailures, "initial");
      requireVisible(initial, contract.stage, caseFailures, "initial");
      checkLanguage(initial, caseFailures, "initial");

      if (testCase.objectId === "18A") {
        requireVisible(initial, testCase.toolbar, caseFailures, "initial");
        for (const selector of testCase.visible) requireVisible(initial, selector, caseFailures, "initial");
        if (initial.proportional?.scrollLeft > 1) {
          caseFailures.push(`initial: proportional landscape starts at scrollLeft ${initial.proportional.scrollLeft}`);
        }
        if (!initial.proportional?.firstColumnIntersects) {
          caseFailures.push("initial: first proportional column is clipped outside the viewport");
        }
      } else {
        requireHidden(initial, testCase.toolbar, caseFailures, "initial");
      }

      const enter = await pointerClick(client, testCase.objectId, testCase.enter);
      if (!enter.ok) {
        caseFailures.push(`enter: ${enter.reason}`);
      } else if (testCase.state) {
        await waitFor(
          client,
          presentationStateExpression(testCase.objectId, testCase.state),
          `${testCase.name} ${viewport} ${testCase.state}`,
        );
      }
      await nextPaint(client);

      const focused = await evaluate(client, snapshotExpression(testCase.objectId, selectors));
      requireHidden(focused, ".phone-status", caseFailures, "focus");
      requireHidden(focused, contract.restaurant, caseFailures, "focus");
      requireVisible(focused, contract.stage, caseFailures, "focus");
      checkLanguage(focused, caseFailures, "focus");

      if (testCase.continuous) {
        requireVisible(focused, testCase.toolbar, caseFailures, "focus");
        for (const selector of testCase.visible) requireVisible(focused, selector, caseFailures, "focus");
        for (const selector of testCase.interactive) requireInteractive(focused, selector, caseFailures, "focus");
        const metaText = focused.styles["#proportional-location-meta"]?.text;
        if (!/^\d+ \/ 3$/.test(metaText ?? "")) {
          caseFailures.push(`focus: proportional location ${JSON.stringify(metaText)} should be a compact position`);
        }
      } else if (enter.ok) {
        requireVisible(focused, testCase.toolbar, caseFailures, "focus");
        requireInteractive(focused, testCase.returnButton, caseFailures, "focus");
        const returnStyle = focused.styles[testCase.returnButton];
        if (returnStyle?.text !== testCase.returnText) {
          caseFailures.push(`focus: return text ${JSON.stringify(returnStyle?.text)} !== ${JSON.stringify(testCase.returnText)}`);
        }
        if (returnStyle?.ariaLabel !== testCase.returnAria) {
          caseFailures.push(`focus: return aria-label ${JSON.stringify(returnStyle?.ariaLabel)} !== ${JSON.stringify(testCase.returnAria)}`);
        }
        if (testCase.cleanControl) {
          const ariaLabel = focused.styles[testCase.cleanControl]?.ariaLabel ?? "";
          if (/(聚焦|原比例|focus|scale|camera)/i.test(ariaLabel)) {
            caseFailures.push(`focus: ${testCase.cleanControl} keeps internal aria-label ${JSON.stringify(ariaLabel)}`);
          }
        }
      }

      let screenshot = null;
      if (viewport === "390") {
        screenshot = await captureScreenshot(client, `model-live-${slugify(testCase.name)}-390-focus.png`);
      }

      let returned = null;
      if (!testCase.continuous && enter.ok) {
        const exit = await pointerClick(client, testCase.objectId, testCase.returnButton);
        if (!exit.ok) {
          caseFailures.push(`return: ${exit.reason}`);
        } else {
          await waitFor(
            client,
            presentationStateExpression(testCase.objectId, testCase.exitState),
            `${testCase.name} ${viewport} ${testCase.exitState}`,
          );
          await nextPaint(client);
          returned = await evaluate(client, snapshotExpression(testCase.objectId, selectors));
          requireHidden(returned, testCase.toolbar, caseFailures, "returned");
          requireHidden(returned, contract.restaurant, caseFailures, "returned");
          requireVisible(returned, contract.stage, caseFailures, "returned");
          checkLanguage(returned, caseFailures, "returned");
        }
      }

      interactions.push({
        name: testCase.name,
        objectId: testCase.objectId,
        viewport,
        path: `${url.pathname}${url.search}`,
        initial,
        focused,
        returned,
        screenshot,
        failures: caseFailures,
      });
      failures.push(...caseFailures.map((failure) => `${testCase.name}/${viewport}: ${failure}`));
    }
  }

  const coveredObjects = new Set(initialCoverage.map(({ objectId }) => objectId));
  for (const { objectId } of modelLivePresentationEntries) {
    if (!coveredObjects.has(objectId)) failures.push(`mapped ${objectId}: missing initial browser coverage`);
  }

  const report = {
    browser,
    baseUrl,
    generatedAt: new Date().toISOString(),
    mappedObjectCount: modelLivePresentationEntries.length,
    documentSurfaceCases,
    initialCoverage,
    documentCoverage,
    interactions,
    failures,
  };
  await writeFile(new URL("model-live-presentation-results.json", outputDir), `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) {
    throw new Error(`Model live-presentation browser review failed:\n- ${failures.join("\n- ")}`);
  }
  socket.close();
  console.log(`Model live-presentation browser review: ${modelLivePresentationEntries.length} spatial objects and document surfaces pass shared humanization checks.`);
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
