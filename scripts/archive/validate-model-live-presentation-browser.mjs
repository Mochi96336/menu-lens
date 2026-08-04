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

const routePath = ({ modelId, sectionId, objectId, view = "all" }) => {
  const params = new URLSearchParams({
    model: modelId,
    section: sectionId,
    variant: objectId,
    viewport: "390",
  });
  if (view === "focus") params.set("view", "focus");
  return `/models/?${params}`;
};

const statusHidden = [".phone-status"];
const profileInitialContracts = Object.freeze({
  multiscale: {
    hidden: [".workspace-topbar", ...statusHidden],
    visible: [".multiscale-screen > header", ".scale-map"],
  },
  spread: {
    hidden: [".spread-toolbar", ...statusHidden],
    visible: [".spread-restaurant", ".spread-map"],
  },
  ribbon: {
    hidden: [".ribbon-scale-bar", ...statusHidden],
    visible: [".ribbon-restaurant", ".ribbon-viewport"],
  },
  fisheye: {
    hidden: [".fisheye-toolbar", ".fisheye-lens-switch", ".fisheye-hint", ...statusHidden],
    visible: [".fisheye-restaurant", ".fisheye-stage"],
  },
  matrix: {
    hidden: [".matrix-toolbar", ...statusHidden],
    visible: [".matrix-restaurant", ".matrix-board"],
  },
  paper: {
    hidden: [".paper-toolbar", ...statusHidden],
    visible: [".paper-restaurant", ".paper-viewport"],
  },
  loupe: {
    hidden: [".paper-restaurant", ".paper-location", ...statusHidden],
    visible: [".paper-toolbar", "#loupe-center", "#loupe-viewport"],
    absolute: [".paper-toolbar"],
    interactive: ["#loupe-center", ".paper-toolbar button:not(:disabled)"],
  },
  "landscape-camera": {
    hidden: [".paper-toolbar", ...statusHidden],
    visible: [".paper-restaurant", ".landscape-viewport"],
  },
  "landscape-continuous": {
    hidden: [".paper-restaurant", ".paper-location", ...statusHidden],
    visible: [".paper-toolbar", ".landscape-viewport"],
    absolute: [".paper-toolbar"],
    interactive: [".paper-toolbar button:not(:disabled)"],
  },
  "landscape-focus": {
    hidden: [".paper-toolbar", ...statusHidden],
    visible: [".paper-restaurant", ".landscape-viewport"],
  },
  "rigid-sheet": {
    hidden: [".paper-toolbar", ...statusHidden],
    visible: [".paper-restaurant", "#rigid-minimap", "#rigid-stage"],
  },
  trifold: {
    hidden: [".paper-toolbar", ...statusHidden],
    visible: [".paper-restaurant", "#trifold-stage"],
  },
  "two-column": {
    hidden: [".paper-toolbar", ...statusHidden],
    visible: [".paper-restaurant", "#window-map", "#window-stage"],
  },
  volume: {
    hidden: [".depth-toolbar", ...statusHidden],
    visible: [".depth-restaurant", "#volume-layer-picker", "#volume-stage"],
  },
  projection: {
    hidden: [".projection-restaurant", ...statusHidden],
    visible: [".projection-controls", ".projection-plot"],
  },
  parallax: {
    hidden: [".parallax-restaurant", ...statusHidden],
    visible: [".parallax-stage"],
  },
});

const initialCoverageGroups = new Map();
for (const entry of modelLivePresentationEntries) {
  const route = routeByObjectId.get(entry.objectId);
  if (!route) throw new Error(`No Design Model route owns presentation object ${entry.objectId}.`);
  const contract = profileInitialContracts[entry.profileId];
  if (!contract) throw new Error(`No initial browser contract exists for profile ${entry.profileId}.`);
  const groupKey = `${route.modelId}/${route.sectionId}`;
  if (!initialCoverageGroups.has(groupKey)) initialCoverageGroups.set(groupKey, { ...route, entries: [] });
  initialCoverageGroups.get(groupKey).entries.push({ ...entry, contract });
}

const returnExpectation = ({
  toolbar,
  button,
  text,
  hidden = [],
  visible = [],
}) => ({
  hidden: [...hidden, ...statusHidden],
  visible: [toolbar, button, ...visible],
  absolute: [toolbar],
  interactive: [button],
  expectedText: { [button]: text },
  expectedAriaLabel: { [button]: text.replace(/^←\s*/, "") },
});

const interactionViewports = ["320", "390", "desktop"];
const interactionCases = [
  {
    name: "complete document keeps natural header flow",
    path: "/models/?model=complete-document&section=baseline&variant=01&view=focus",
    objectId: "01",
    profile: null,
    initial: { visible: [".restaurant-name"] },
  },
  {
    name: "multiscale exposes one return to all categories",
    path: "/models/?model=multiscale-focus&section=model&variant=06&view=focus",
    objectId: "06",
    profile: "multiscale",
    initial: profileInitialContracts.multiscale,
    enter: { click: ".scale-category > button", state: "focus" },
    focus: returnExpectation({
      toolbar: ".workspace-topbar",
      button: "#collapse-all",
      text: "← 返回全部分類",
      hidden: [".multiscale-screen > header", "#scale-label"],
      visible: [".scale-map"],
    }),
    exit: { click: "#collapse-all", state: "overview" },
    returned: profileInitialContracts.multiscale,
  },
  {
    name: "spread exposes one return to all categories",
    path: "/models/?model=horizontal-navigation&section=spread&variant=08&view=focus",
    objectId: "08",
    profile: "spread",
    initial: profileInitialContracts.spread,
    enter: { click: ".spread-category__focus", state: "focus" },
    focus: returnExpectation({
      toolbar: ".spread-toolbar",
      button: "#spread-overview",
      text: "← 返回全部分類",
      hidden: [".spread-restaurant", ".spread-location", "#spread-previous", "#spread-next"],
      visible: [".spread-map"],
    }),
    exit: { click: "#spread-overview", state: "overview" },
    returned: profileInitialContracts.spread,
  },
  {
    name: "ribbon distinguishes return from previous dish",
    path: "/models/?model=horizontal-navigation&section=ribbon&variant=09&view=focus",
    objectId: "09",
    profile: "ribbon",
    initial: profileInitialContracts.ribbon,
    enter: { click: ".ribbon-product summary", state: "focus" },
    focus: returnExpectation({
      toolbar: ".ribbon-scale-bar",
      button: "#ribbon-overview",
      text: "← 返回全部料理",
      hidden: [".ribbon-restaurant", "#ribbon-reading", ".ribbon-location", "#ribbon-previous", "#ribbon-next"],
      visible: [".ribbon-viewport"],
    }),
    exit: { click: "#ribbon-overview", state: "overview" },
    returned: profileInitialContracts.ribbon,
  },
  {
    name: "fisheye replaces lens choices with return to category",
    path: "/models/?model=horizontal-navigation&section=fisheye&variant=10&view=focus",
    objectId: "10",
    profile: "fisheye",
    initial: profileInitialContracts.fisheye,
    enter: { click: ".fisheye-product[data-category-focused=\"true\"] summary", state: "focus" },
    focus: returnExpectation({
      toolbar: ".fisheye-lens-switch",
      button: "#fisheye-category-lens",
      text: "← 返回分類",
      hidden: [".fisheye-toolbar", ".fisheye-restaurant", "#fisheye-product-lens", ".fisheye-hint"],
      visible: [".fisheye-stage"],
    }),
    exit: { click: "#fisheye-category-lens", state: "overview" },
    returned: profileInitialContracts.fisheye,
  },
  {
    name: "matrix exposes one return to matrix",
    path: "/models/?model=paper-field&section=semantic-information&variant=11&view=focus",
    objectId: "11",
    profile: "matrix",
    initial: profileInitialContracts.matrix,
    enter: { click: ".matrix-row__label", state: "focus" },
    focus: returnExpectation({
      toolbar: ".matrix-toolbar",
      button: "#matrix-overview",
      text: "← 返回矩陣",
      hidden: [".matrix-restaurant", "#matrix-previous-row", "#matrix-next-row", ".matrix-location"],
      visible: [".matrix-board"],
    }),
    exit: { click: "#matrix-overview", state: "overview" },
    returned: profileInitialContracts.matrix,
  },
  {
    name: "paper field exposes one return to overview",
    path: "/models/?model=paper-field&section=semantic-information&variant=12&view=focus",
    objectId: "12",
    profile: "paper",
    initial: profileInitialContracts.paper,
    enter: { click: ".paper-category__header", state: "focus" },
    focus: returnExpectation({
      toolbar: ".paper-toolbar",
      button: "#paper-overview",
      text: "← 返回全覽",
      hidden: [".paper-restaurant", "#paper-previous", "#paper-next", ".paper-location"],
      visible: [".paper-viewport"],
    }),
    exit: { click: "#paper-overview", state: "overview" },
    returned: profileInitialContracts.paper,
  },
  {
    name: "static loupe keeps only direct lens controls",
    path: "/models/?model=paper-field&section=stopped-lenses&variant=13&view=focus",
    objectId: "13",
    profile: "loupe",
    initial: profileInitialContracts.loupe,
    enter: { click: "#loupe-next" },
    focus: {
      ...profileInitialContracts.loupe,
      interactive: ["#loupe-center", "#loupe-previous", "#loupe-next"],
    },
  },
  {
    name: "landscape paper exposes one return to overview",
    path: "/models/?model=landscape-paper&section=core&variant=18&view=focus",
    objectId: "18",
    profile: "landscape-camera",
    initial: profileInitialContracts["landscape-camera"],
    enter: { click: ".paper-category__header", state: "focus" },
    focus: returnExpectation({
      toolbar: ".paper-toolbar",
      button: "#landscape-overview",
      text: "← 返回全覽",
      hidden: [".paper-restaurant", ".paper-location", "#landscape-previous", "#landscape-next"],
      visible: [".landscape-viewport"],
    }),
    exit: { click: "#landscape-overview", state: "overview" },
    returned: profileInitialContracts["landscape-camera"],
  },
  {
    name: "proportional landscape remains continuous navigation",
    path: "/models/?model=landscape-paper&section=core&variant=18A&view=focus",
    objectId: "18A",
    profile: "landscape-continuous",
    initial: profileInitialContracts["landscape-continuous"],
    enter: { click: "#proportional-next" },
    focus: {
      ...profileInitialContracts["landscape-continuous"],
      interactive: ["#proportional-previous", "#proportional-next"],
    },
  },
  {
    name: "focus geometry exposes a fixed return to overview",
    path: "/models/?model=landscape-paper&section=focus-geometry&variant=22D&view=focus",
    objectId: "22D",
    profile: "landscape-focus",
    initial: profileInitialContracts["landscape-focus"],
    enter: { click: ".paper-category__header", state: "focus" },
    focus: returnExpectation({
      toolbar: ".paper-toolbar",
      button: ".paper-toolbar > button:first-child",
      text: "← 返回全覽",
      hidden: [".paper-restaurant", ".paper-location", ".paper-toolbar > button:nth-child(2)", ".paper-toolbar > button:nth-child(3)"],
      visible: [".landscape-viewport"],
    }),
    exit: { click: ".paper-toolbar > button:first-child", state: "overview" },
    returned: profileInitialContracts["landscape-focus"],
  },
  {
    name: "rigid sheet keeps a human return label",
    path: "/models/?model=landscape-paper&section=stopped-routes&variant=19&view=focus",
    objectId: "19",
    profile: "rigid-sheet",
    initial: profileInitialContracts["rigid-sheet"],
    enter: { click: ".paper-category__header", state: "focus" },
    focus: returnExpectation({
      toolbar: ".paper-toolbar",
      button: "#rigid-overview",
      text: "← 返回全覽",
      hidden: [".paper-restaurant", ".paper-location", "#rigid-previous", "#rigid-next"],
      visible: ["#rigid-minimap", "#rigid-stage"],
    }),
    exit: { click: "#rigid-overview", state: "overview" },
    returned: profileInitialContracts["rigid-sheet"],
  },
  {
    name: "trifold keeps a human return label",
    path: "/models/?model=landscape-paper&section=stopped-routes&variant=20&view=focus",
    objectId: "20",
    profile: "trifold",
    initial: profileInitialContracts.trifold,
    enter: { click: ".paper-category__header", state: "focus" },
    focus: returnExpectation({
      toolbar: ".paper-toolbar",
      button: "#trifold-overview",
      text: "← 返回全覽",
      hidden: [".paper-restaurant", ".paper-location", "#trifold-previous", "#trifold-next"],
      visible: ["#trifold-stage"],
    }),
    exit: { click: "#trifold-overview", state: "overview" },
    returned: profileInitialContracts.trifold,
  },
  {
    name: "two column window keeps a human return label",
    path: "/models/?model=landscape-paper&section=stopped-routes&variant=21&view=focus",
    objectId: "21",
    profile: "two-column",
    initial: profileInitialContracts["two-column"],
    enter: { click: ".paper-category__header", state: "focus" },
    focus: returnExpectation({
      toolbar: ".paper-toolbar",
      button: "#window-overview",
      text: "← 返回全覽",
      hidden: [".paper-restaurant", ".paper-location", "#window-previous", "#window-next"],
      visible: ["#window-map", "#window-stage"],
    }),
    exit: { click: "#window-overview", state: "overview" },
    returned: profileInitialContracts["two-column"],
  },
  {
    name: "vertical landscape keeps a horizontal return label",
    path: "/models/?model=landscape-paper&section=vertical-writing&variant=24&view=focus",
    objectId: "24",
    profile: "landscape-camera",
    initial: profileInitialContracts["landscape-camera"],
    enter: { click: ".paper-category__header", state: "focus" },
    focus: returnExpectation({
      toolbar: ".paper-toolbar",
      button: "#vertical-overview",
      text: "← 返回全覽",
      hidden: [".paper-restaurant", ".paper-location", "#vertical-previous", "#vertical-next"],
      visible: [".landscape-viewport"],
    }),
    exit: { click: "#vertical-overview", state: "overview" },
    returned: profileInitialContracts["landscape-camera"],
  },
  {
    name: "menu volume keeps one return to overview",
    path: "/models/?model=depth-projection&section=dimension-reset&variant=25B&view=focus",
    objectId: "25B",
    profile: "volume",
    initial: profileInitialContracts.volume,
    enter: { click: "#volume-layer-picker button", state: "focus" },
    focus: returnExpectation({
      toolbar: ".depth-toolbar",
      button: "#volume-overview",
      text: "← 返回全覽",
      hidden: [".depth-restaurant", ".depth-toolbar__status", "#volume-previous", "#volume-next"],
      visible: ["#volume-layer-picker", "#volume-stage"],
    }),
    exit: { click: "#volume-overview", state: "overview" },
    returned: profileInitialContracts.volume,
  },
  {
    name: "projection removes restaurant identity but preserves data choices",
    path: "/models/?model=depth-projection&section=projection-lens&variant=25P&view=focus",
    objectId: "25P",
    profile: "projection",
    initial: profileInitialContracts.projection,
  },
  {
    name: "parallax removes restaurant identity but preserves direct stage",
    path: "/models/?model=depth-projection&section=parallax-volume&variant=26&view=focus",
    objectId: "26",
    profile: "parallax",
    initial: profileInitialContracts.parallax,
  },
];

const objectRootExpression = (objectId) => `
  [...document.querySelectorAll('.model-pooled-surface')]
    .find((candidate) => candidate.dataset.objectId === ${JSON.stringify(objectId)})
`;

const selectorsFor = (expectation = {}) => [...new Set([
  ...(expectation.hidden ?? []),
  ...(expectation.visible ?? []),
  ...(expectation.absolute ?? []),
  ...(expectation.interactive ?? []),
  ...Object.keys(expectation.expectedText ?? {}),
  ...Object.keys(expectation.expectedAriaLabel ?? {}),
])];

const snapshotExpression = (objectId, selectors) => `(() => {
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
    } : null;
  }
  return {
    state: root?.dataset.liveState ?? null,
    profile: root?.dataset.livePresentation ?? null,
    presentationState: root?.dataset.livePresentationState ?? null,
    styles,
  };
})()`;

const presentationStateExpression = (objectId, state) => `(() => {
  const root = ${objectRootExpression(objectId)};
  return root?.dataset.livePresentationState === ${JSON.stringify(state)};
})()`;

const surfaceReadyExpression = (objectId) => `(() => {
  const root = ${objectRootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  return document.readyState === 'complete'
    && root?.dataset.liveState === 'ready'
    && frame
    && !frame.hidden
    && frame.contentDocument?.readyState === 'complete';
})()`;

const centerSurfaceExpression = (objectId) => `(async () => {
  const root = ${objectRootExpression(objectId)};
  if (!root) return false;
  root.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return true;
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

const checkExpectation = (snapshot, expectation, label) => {
  const failures = [];
  for (const selector of expectation.hidden ?? []) {
    const style = snapshot.styles[selector];
    if (!style) failures.push(`${label}: ${selector} is missing instead of intentionally hidden`);
    else if (style.rendered) failures.push(`${label}: ${selector} should be hidden`);
  }
  for (const selector of expectation.visible ?? []) {
    const style = snapshot.styles[selector];
    if (!style) failures.push(`${label}: ${selector} is missing`);
    else if (!style.rendered) failures.push(`${label}: ${selector} should be rendered`);
    else if (!style.intersectsViewport) failures.push(`${label}: ${selector} is rendered outside the iframe viewport`);
  }
  for (const selector of expectation.absolute ?? []) {
    const style = snapshot.styles[selector];
    if (!style) failures.push(`${label}: ${selector} is missing`);
    else if (style.position !== "absolute") failures.push(`${label}: ${selector} should be out of flow, got ${style.position}`);
  }
  for (const selector of expectation.interactive ?? []) {
    const style = snapshot.styles[selector];
    if (!style) failures.push(`${label}: interactive ${selector} is missing`);
    else {
      if (!style.rendered) failures.push(`${label}: interactive ${selector} is not rendered`);
      if (!style.centerInViewport) failures.push(`${label}: interactive ${selector} center is outside the iframe viewport`);
      if (!style.hitSelf) failures.push(`${label}: interactive ${selector} is covered at its center point`);
      if (style.pointerEvents === "none") failures.push(`${label}: interactive ${selector} has pointer-events none`);
      if (style.disabled) failures.push(`${label}: interactive ${selector} is disabled`);
      if (style.width < 30 || style.height < 30) {
        failures.push(`${label}: interactive ${selector} is ${Math.round(style.width)}×${Math.round(style.height)}, below the 30px review floor`);
      }
    }
  }
  for (const [selector, expectedText] of Object.entries(expectation.expectedText ?? {})) {
    const actual = snapshot.styles[selector]?.text;
    if (actual !== expectedText) failures.push(`${label}: ${selector} text ${JSON.stringify(actual)} !== ${JSON.stringify(expectedText)}`);
  }
  for (const [selector, expectedAriaLabel] of Object.entries(expectation.expectedAriaLabel ?? {})) {
    const actual = snapshot.styles[selector]?.ariaLabel;
    if (actual !== expectedAriaLabel) {
      failures.push(`${label}: ${selector} aria-label ${JSON.stringify(actual)} !== ${JSON.stringify(expectedAriaLabel)}`);
    }
  }
  return failures;
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
  `--user-data-dir=/tmp/menu-lens-live-presentation-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create model presentation target: ${targetResponse.status}`);
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

  const initialCoverage = [];
  const interactions = [];
  const failures = [];

  for (const group of initialCoverageGroups.values()) {
    const path = routePath({
      modelId: group.modelId,
      sectionId: group.sectionId,
      objectId: group.entries[0].objectId,
    });
    const url = await navigate(client, path, "390");
    for (const entry of group.entries) {
      await waitFor(client, surfaceReadyExpression(entry.objectId), `${entry.objectId} mapped live surface`);
      await evaluate(client, centerSurfaceExpression(entry.objectId));
      await nextPaint(client);
      const snapshot = await evaluate(client, snapshotExpression(entry.objectId, selectorsFor(entry.contract)));
      const caseFailures = [];
      if (snapshot.profile !== entry.profileId) caseFailures.push(`profile ${JSON.stringify(snapshot.profile)} !== ${JSON.stringify(entry.profileId)}`);
      caseFailures.push(...checkExpectation(snapshot, entry.contract, "initial"));
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

  for (const viewport of interactionViewports) {
    for (const testCase of interactionCases) {
      const url = await navigate(client, testCase.path, viewport);
      await waitFor(client, surfaceReadyExpression(testCase.objectId), `${testCase.name} ${viewport} live surface`);
      await evaluate(client, centerSurfaceExpression(testCase.objectId));
      await nextPaint(client);

      const caseFailures = [];
      const initial = await evaluate(client, snapshotExpression(testCase.objectId, selectorsFor(testCase.initial)));
      if (initial.profile !== testCase.profile) caseFailures.push(`initial: profile ${JSON.stringify(initial.profile)} !== ${JSON.stringify(testCase.profile)}`);
      caseFailures.push(...checkExpectation(initial, testCase.initial, "initial"));

      let focus = null;
      let focusScreenshot = null;
      if (testCase.enter) {
        const click = await pointerClick(client, testCase.objectId, testCase.enter.click);
        if (!click.ok) {
          caseFailures.push(`enter: ${click.reason}`);
        } else {
          if (testCase.enter.state) {
            await waitFor(
              client,
              presentationStateExpression(testCase.objectId, testCase.enter.state),
              `${testCase.name} ${viewport} enter ${testCase.enter.state}`,
            );
          }
          await nextPaint(client);
          focus = await evaluate(client, snapshotExpression(testCase.objectId, selectorsFor(testCase.focus)));
          caseFailures.push(...checkExpectation(focus, testCase.focus, "focus"));
          if (viewport === "390") {
            focusScreenshot = await captureScreenshot(client, `model-live-${slugify(testCase.name)}-390-focus.png`);
          }
        }
      }

      let returned = null;
      if (testCase.exit && !caseFailures.some((failure) => failure.startsWith("enter:"))) {
        const click = await pointerClick(client, testCase.objectId, testCase.exit.click);
        if (!click.ok) {
          caseFailures.push(`return: ${click.reason}`);
        } else {
          if (testCase.exit.state) {
            await waitFor(
              client,
              presentationStateExpression(testCase.objectId, testCase.exit.state),
              `${testCase.name} ${viewport} return ${testCase.exit.state}`,
            );
          }
          await nextPaint(client);
          returned = await evaluate(client, snapshotExpression(testCase.objectId, selectorsFor(testCase.returned)));
          caseFailures.push(...checkExpectation(returned, testCase.returned, "returned"));
        }
      }

      interactions.push({
        name: testCase.name,
        viewport,
        path: `${url.pathname}${url.search}`,
        objectId: testCase.objectId,
        initial,
        focus,
        returned,
        focusScreenshot,
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
    initialCoverage,
    interactionViewports,
    interactions,
    failures,
  };
  await writeFile(new URL("model-live-presentation-results.json", outputDir), `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) throw new Error(`Model live-presentation browser review failed:\n- ${failures.join("\n- ")}`);
  socket.close();
  console.log(`Model live-presentation browser review: ${modelLivePresentationEntries.length} mapped objects and human-readable return controls pass.`);
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
