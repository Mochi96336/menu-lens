import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

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

const viewports = ["320", "390", "desktop"];
const cases = [
  {
    name: "complete document keeps natural header flow",
    path: "/models/?model=complete-document&section=baseline&view=all",
    objectId: "01",
    profile: null,
    initial: { visible: [".restaurant-name"] },
  },
  {
    name: "multiscale keeps only a compact focus return",
    path: "/models/?model=multiscale-focus&section=model&view=all",
    objectId: "06",
    profile: "multiscale",
    initial: { hidden: [".workspace-topbar"], visible: [".multiscale-screen > header"] },
    enter: { click: ".scale-category > button", state: "focus" },
    focus: {
      hidden: [".multiscale-screen > header", "#scale-label"],
      visible: [".workspace-topbar", "#collapse-all"],
      absolute: [".workspace-topbar"],
    },
    exit: { click: "#collapse-all", state: "overview" },
    returned: { hidden: [".workspace-topbar"], visible: [".multiscale-screen > header"] },
  },
  {
    name: "spread removes the duplicate location toolbar",
    path: "/models/?model=horizontal-navigation&section=spread&view=all",
    objectId: "08",
    profile: "spread",
    initial: { hidden: [".spread-toolbar"], visible: [".spread-restaurant"] },
    enter: { click: ".spread-category__focus", state: "focus" },
    focus: { hidden: [".spread-toolbar", ".spread-restaurant"] },
    exit: { click: ".spread-category[data-focused=\"true\"] .spread-category__focus", state: "overview" },
    returned: { hidden: [".spread-toolbar"], visible: [".spread-restaurant"] },
  },
  {
    name: "ribbon turns the scale bar into a reading-only return",
    path: "/models/?model=horizontal-navigation&section=ribbon&view=all",
    objectId: "09",
    profile: "ribbon",
    initial: { hidden: [".ribbon-scale-bar"], visible: [".ribbon-restaurant"] },
    enter: { click: ".ribbon-product summary", state: "focus" },
    focus: {
      hidden: [".ribbon-restaurant", "#ribbon-reading", ".ribbon-location", "#ribbon-previous", "#ribbon-next"],
      visible: [".ribbon-scale-bar", "#ribbon-overview"],
      absolute: [".ribbon-scale-bar"],
    },
    exit: { click: "#ribbon-overview", state: "overview" },
    returned: { hidden: [".ribbon-scale-bar"], visible: [".ribbon-restaurant"] },
  },
  {
    name: "fisheye keeps its compact lens switch without the location bar",
    path: "/models/?model=horizontal-navigation&section=fisheye&view=all",
    objectId: "10",
    profile: "fisheye",
    initial: { hidden: [".fisheye-toolbar"], visible: [".fisheye-restaurant", ".fisheye-lens-switch"] },
    enter: { click: "#fisheye-product-lens", state: "focus" },
    focus: { hidden: [".fisheye-toolbar", ".fisheye-restaurant"], visible: [".fisheye-lens-switch"] },
    exit: { click: "#fisheye-category-lens", state: "overview" },
    returned: { hidden: [".fisheye-toolbar"], visible: [".fisheye-restaurant", ".fisheye-lens-switch"] },
  },
  {
    name: "matrix uses the matrix itself for focus and return",
    path: "/models/?model=paper-field&section=semantic-information&view=all",
    objectId: "11",
    profile: "matrix",
    initial: { hidden: [".matrix-toolbar"], visible: [".matrix-restaurant"] },
    enter: { click: ".matrix-row__label", state: "focus" },
    focus: { hidden: [".matrix-toolbar", ".matrix-restaurant"] },
    exit: { click: ".matrix-row[data-active=\"true\"] .matrix-row__label", state: "overview" },
    returned: { hidden: [".matrix-toolbar"], visible: [".matrix-restaurant"] },
  },
  {
    name: "paper field removes the duplicate paper toolbar",
    path: "/models/?model=paper-field&section=semantic-information&view=all",
    objectId: "12",
    profile: "paper",
    initial: { hidden: [".paper-toolbar"], visible: [".paper-restaurant"] },
    enter: { click: ".paper-category__header", state: "focus" },
    focus: { hidden: [".paper-toolbar", ".paper-restaurant"] },
    exit: { click: ".paper-category[data-focused=\"true\"] .paper-category__header", state: "overview" },
    returned: { hidden: [".paper-toolbar"], visible: [".paper-restaurant"] },
  },
  {
    name: "static loupe floats only its direct lens controls",
    path: "/models/?model=paper-field&section=stopped-lenses&view=all",
    objectId: "13",
    profile: "loupe",
    initial: {
      hidden: [".paper-restaurant", ".paper-location"],
      visible: [".paper-toolbar", "#loupe-center", "#loupe-previous", "#loupe-next", "#loupe-viewport"],
      absolute: [".paper-toolbar"],
    },
  },
  {
    name: "landscape paper keeps only a compact reading return",
    path: "/models/?model=landscape-paper&section=core&view=all",
    objectId: "18",
    profile: "landscape-camera",
    initial: { hidden: [".paper-toolbar"], visible: [".paper-restaurant"] },
    enter: { click: ".paper-category__header", state: "focus" },
    focus: {
      hidden: [".paper-restaurant", ".paper-location", "#landscape-previous", "#landscape-next"],
      visible: [".paper-toolbar", "#landscape-overview"],
      absolute: [".paper-toolbar"],
    },
    exit: { click: "#landscape-overview", state: "overview" },
    returned: { hidden: [".paper-toolbar"], visible: [".paper-restaurant"] },
  },
  {
    name: "focus-geometry landscape removes the toolbar because the active category resets directly",
    path: "/models/?model=landscape-paper&section=focus-geometry&view=all",
    objectId: "22D",
    profile: "landscape-focus",
    initial: { hidden: [".paper-toolbar"], visible: [".paper-restaurant"] },
    enter: { click: ".paper-category__header", state: "focus" },
    focus: { hidden: [".paper-toolbar", ".paper-restaurant"] },
    exit: { click: ".paper-category[data-focused=\"true\"] .paper-category__header", state: "overview" },
    returned: { hidden: [".paper-toolbar"], visible: [".paper-restaurant"] },
  },
  {
    name: "rigid sheet keeps its own camera return",
    path: "/models/?model=landscape-paper&section=stopped-routes&view=all",
    objectId: "19",
    profile: "rigid-sheet",
    initial: { hidden: [".paper-toolbar"], visible: [".paper-restaurant", "#rigid-minimap"] },
    enter: { click: ".paper-category__header", state: "focus" },
    focus: {
      hidden: [".paper-restaurant", ".paper-location", "#rigid-previous", "#rigid-next"],
      visible: [".paper-toolbar", "#rigid-overview", "#rigid-minimap"],
      absolute: [".paper-toolbar"],
    },
    exit: { click: "#rigid-overview", state: "overview" },
    returned: { hidden: [".paper-toolbar"], visible: [".paper-restaurant", "#rigid-minimap"] },
  },
  {
    name: "trifold keeps its own folded-panel return",
    path: "/models/?model=landscape-paper&section=stopped-routes&view=all",
    objectId: "20",
    profile: "trifold",
    initial: { hidden: [".paper-toolbar"], visible: [".paper-restaurant", "#trifold-stage"] },
    enter: { click: ".paper-category__header", state: "focus" },
    focus: {
      hidden: [".paper-restaurant", ".paper-location", "#trifold-previous", "#trifold-next"],
      visible: [".paper-toolbar", "#trifold-overview", "#trifold-stage"],
      absolute: [".paper-toolbar"],
    },
    exit: { click: "#trifold-overview", state: "overview" },
    returned: { hidden: [".paper-toolbar"], visible: [".paper-restaurant", "#trifold-stage"] },
  },
  {
    name: "two-column window keeps its own window return",
    path: "/models/?model=landscape-paper&section=stopped-routes&view=all",
    objectId: "21",
    profile: "two-column",
    initial: { hidden: [".paper-toolbar"], visible: [".paper-restaurant", "#window-map"] },
    enter: { click: ".paper-category__header", state: "focus" },
    focus: {
      hidden: [".paper-restaurant", ".paper-location", "#window-previous", "#window-next"],
      visible: [".paper-toolbar", "#window-overview", "#window-map"],
      absolute: [".paper-toolbar"],
    },
    exit: { click: "#window-overview", state: "overview" },
    returned: { hidden: [".paper-toolbar"], visible: [".paper-restaurant", "#window-map"] },
  },
  {
    name: "vertical landscape keeps a return because category taps do not exit reading",
    path: "/models/?model=landscape-paper&section=vertical-writing&view=all",
    objectId: "24",
    profile: "landscape-camera",
    initial: { hidden: [".paper-toolbar"], visible: [".paper-restaurant"] },
    enter: { click: ".paper-category__header", state: "focus" },
    focus: {
      hidden: [".paper-restaurant", ".paper-location", "#vertical-previous", "#vertical-next"],
      visible: [".paper-toolbar", "#vertical-overview"],
      absolute: [".paper-toolbar"],
    },
    exit: { click: "#vertical-overview", state: "overview" },
    returned: { hidden: [".paper-toolbar"], visible: [".paper-restaurant"] },
  },
  {
    name: "menu volume keeps only a layer-to-overview return",
    path: "/models/?model=depth-projection&section=dimension-reset&view=all",
    objectId: "25B",
    profile: "volume",
    initial: { hidden: [".depth-toolbar"], visible: [".depth-restaurant", "#volume-layer-picker"] },
    enter: { click: "#volume-layer-picker button", state: "focus" },
    focus: {
      hidden: [".depth-restaurant", ".depth-toolbar__status", "#volume-previous", "#volume-next"],
      visible: [".depth-toolbar", "#volume-overview", "#volume-layer-picker"],
      absolute: [".depth-toolbar"],
    },
    exit: { click: "#volume-overview", state: "overview" },
    returned: { hidden: [".depth-toolbar"], visible: [".depth-restaurant", "#volume-layer-picker"] },
  },
  {
    name: "projection removes restaurant identity but preserves axis controls",
    path: "/models/?model=depth-projection&section=projection-lens&view=all",
    objectId: "25P",
    profile: "projection",
    initial: { hidden: [".projection-restaurant"], visible: [".projection-controls", ".projection-plot"] },
  },
  {
    name: "parallax removes restaurant identity but preserves the direct stage",
    path: "/models/?model=depth-projection&section=parallax-volume&view=all",
    objectId: "26",
    profile: "parallax",
    initial: { hidden: [".parallax-restaurant"], visible: [".parallax-stage", "#parallax-reset"] },
  },
];

const objectRootExpression = (objectId) => `
  [...document.querySelectorAll('.model-pooled-surface')]
    .find((candidate) => candidate.dataset.objectId === ${JSON.stringify(objectId)})
`;

const snapshotExpression = (objectId, selectors) => `(() => {
  const root = ${objectRootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  const documentRoot = frame?.contentDocument;
  const styles = {};
  for (const selector of ${JSON.stringify(selectors)}) {
    const element = documentRoot?.querySelector(selector);
    const computed = element ? getComputedStyle(element) : null;
    styles[selector] = element ? {
      display: computed.display,
      position: computed.position,
    } : null;
  }
  return {
    state: root?.dataset.liveState ?? null,
    profile: root?.dataset.livePresentation ?? null,
    presentationState: root?.dataset.livePresentationState ?? null,
    styles,
  };
})()`;

const clickExpression = (objectId, selector) => `(() => {
  const root = ${objectRootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  const element = frame?.contentDocument?.querySelector(${JSON.stringify(selector)});
  if (!element) return false;
  element.click();
  return true;
})()`;

const presentationStateExpression = (objectId, state) => `(() => {
  const root = ${objectRootExpression(objectId)};
  return root?.dataset.livePresentationState === ${JSON.stringify(state)};
})()`;

const selectorsFor = (expectation = {}) => [
  ...(expectation.hidden ?? []),
  ...(expectation.visible ?? []),
  ...(expectation.absolute ?? []),
];

const checkExpectation = (snapshot, expectation, label) => {
  const failures = [];
  for (const selector of expectation.hidden ?? []) {
    if (snapshot.styles[selector]?.display !== "none") {
      failures.push(`${label}: ${selector} should be hidden, got ${snapshot.styles[selector]?.display ?? "missing"}`);
    }
  }
  for (const selector of expectation.visible ?? []) {
    const display = snapshot.styles[selector]?.display;
    if (!display || display === "none") {
      failures.push(`${label}: ${selector} should be visible, got ${display ?? "missing"}`);
    }
  }
  for (const selector of expectation.absolute ?? []) {
    if (snapshot.styles[selector]?.position !== "absolute") {
      failures.push(`${label}: ${selector} should be out of flow, got ${snapshot.styles[selector]?.position ?? "missing"}`);
    }
  }
  return failures;
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

  const results = [];
  const failures = [];

  for (const viewport of viewports) {
    for (const testCase of cases) {
      const url = new URL(testCase.path, baseUrl);
      url.searchParams.set("viewport", viewport);
      await client.send("Page.navigate", { url: url.href });
      await waitFor(client, `(() => {
        const root = ${objectRootExpression(testCase.objectId)};
        const frame = root?.querySelector('iframe.model-live-frame');
        return document.readyState === 'complete'
          && root?.dataset.liveState === 'ready'
          && frame
          && !frame.hidden
          && frame.contentDocument?.readyState === 'complete';
      })()`, `${testCase.name} ${viewport} live surface`);
      await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
      await evaluate(client, "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");

      const caseFailures = [];
      const initial = await evaluate(
        client,
        snapshotExpression(testCase.objectId, selectorsFor(testCase.initial)),
      );
      if (initial.profile !== testCase.profile) {
        caseFailures.push(`initial: profile ${JSON.stringify(initial.profile)} !== ${JSON.stringify(testCase.profile)}`);
      }
      caseFailures.push(...checkExpectation(initial, testCase.initial, "initial"));

      let focus = null;
      if (testCase.enter) {
        const clicked = await evaluate(client, clickExpression(testCase.objectId, testCase.enter.click));
        if (!clicked) {
          caseFailures.push(`enter: could not click ${testCase.enter.click}`);
        } else {
          await waitFor(
            client,
            presentationStateExpression(testCase.objectId, testCase.enter.state),
            `${testCase.name} ${viewport} enter ${testCase.enter.state}`,
          );
          await evaluate(client, "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
          focus = await evaluate(
            client,
            snapshotExpression(testCase.objectId, selectorsFor(testCase.focus)),
          );
          caseFailures.push(...checkExpectation(focus, testCase.focus, "focus"));
        }
      }

      let returned = null;
      if (testCase.exit && !caseFailures.some((failure) => failure.startsWith("enter:"))) {
        const clicked = await evaluate(client, clickExpression(testCase.objectId, testCase.exit.click));
        if (!clicked) {
          caseFailures.push(`return: could not click ${testCase.exit.click}`);
        } else {
          await waitFor(
            client,
            presentationStateExpression(testCase.objectId, testCase.exit.state),
            `${testCase.name} ${viewport} return ${testCase.exit.state}`,
          );
          await evaluate(client, "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
          returned = await evaluate(
            client,
            snapshotExpression(testCase.objectId, selectorsFor(testCase.returned)),
          );
          caseFailures.push(...checkExpectation(returned, testCase.returned, "returned"));
        }
      }

      results.push({
        name: testCase.name,
        viewport,
        path: `${url.pathname}${url.search}`,
        objectId: testCase.objectId,
        initial,
        focus,
        returned,
        failures: caseFailures,
      });
      failures.push(...caseFailures.map((failure) => `${testCase.name}/${viewport}: ${failure}`));
    }
  }

  const report = {
    browser,
    baseUrl,
    generatedAt: new Date().toISOString(),
    viewports,
    cases: results,
    failures,
  };
  await writeFile(
    new URL("model-live-presentation-results.json", outputDir),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (failures.length) {
    throw new Error(`Model live-presentation browser review failed:\n- ${failures.join("\n- ")}`);
  }
  socket.close();
  console.log("Model live-presentation browser review: model-specific chrome and return interactions pass at 320px, 390px, and desktop.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
