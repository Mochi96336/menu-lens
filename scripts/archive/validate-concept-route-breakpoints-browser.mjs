import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.CONCEPT_ROUTE_DEBUG_PORT ?? 9452);
const browserCandidates = [
  process.env.BROWSER_BIN,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const cases = Object.freeze([
  ["complete-document", "baseline"],
  ["horizontal-navigation", "spread"],
  ["paper-field", "semantic-information"],
  ["landscape-paper", "core"],
  ["multiscale-focus", "model"],
  ["depth-projection", "projection-lens"],
].map(([model, section]) => ({ model, section })));

const widths = Object.freeze([1792, 1280, 1024, 768, 390, 320]);

const findBrowser = async () => {
  for (const candidate of browserCandidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("No Chrome or Chromium binary was found for concept-route breakpoint review.");
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
  const rect = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return {
      left: value.left,
      right: value.right,
      top: value.top,
      bottom: value.bottom,
      width: value.width,
      height: value.height,
    };
  };
  const layout = document.querySelector('.model-route-layout');
  const concept = document.querySelector('#model-concept');
  const conceptBody = concept?.querySelector('.model-concept__body');
  const vignette = concept?.querySelector('.model-concept-vignette');
  const vignetteSvg = vignette?.querySelector('svg');
  const statement = concept?.querySelector('.model-concept__statement');
  const sectionSummary = concept?.querySelector('.model-concept__section-summary');
  const routeSection = document.querySelector('.model-section-strip');
  const route = document.querySelector('#section-tabs');
  const objectPanel = document.querySelector('#model-section-panel');
  const routeRect = rect(route);
  const buttons = [...(route?.querySelectorAll('button[data-section-id]') ?? [])];
  const nodes = buttons.map((button) => rect(button));
  let overlaps = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const width = Math.min(nodes[i].right, nodes[j].right) - Math.max(nodes[i].left, nodes[j].left);
      const height = Math.min(nodes[i].bottom, nodes[j].bottom) - Math.max(nodes[i].top, nodes[j].top);
      if (width > 8 && height > 8) overlaps += 1;
    }
  }
  const layoutStyle = layout ? getComputedStyle(layout) : null;
  const conceptBodyStyle = conceptBody ? getComputedStyle(conceptBody) : null;
  const routeStyle = routeSection ? getComputedStyle(routeSection) : null;
  return {
    viewport: innerWidth,
    routeModel: route?.dataset.routeModel,
    routeCount: Number(route?.dataset.routeCount ?? 0),
    layout: rect(layout),
    concept: rect(concept),
    conceptBody: rect(conceptBody),
    vignette: rect(vignette),
    vignetteSvg: rect(vignetteSvg),
    statement: rect(statement),
    routeSection: rect(routeSection),
    route: routeRect,
    objectPanel: rect(objectPanel),
    overlaps,
    allNodesVisible: Boolean(routeRect)
      && nodes.every((node) => node.left >= routeRect.left - 1 && node.right <= routeRect.right + 1),
    routeClientWidth: Number(route?.clientWidth ?? 0),
    routeScrollWidth: Number(route?.scrollWidth ?? 0),
    gridAreas: layoutStyle?.gridTemplateAreas ?? null,
    conceptColumns: conceptBodyStyle?.gridTemplateColumns ?? null,
    routeBorderStart: Number.parseFloat(routeStyle?.borderInlineStartWidth ?? '0') || 0,
    sectionSummaryDisplay: sectionSummary ? getComputedStyle(sectionSummary).display : null,
    linesDisplay: route?.querySelector('.model-route__lines')
      ? getComputedStyle(route.querySelector('.model-route__lines')).display
      : null,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
})()`;

const failures = [];
const results = [];
const check = (condition, message, state) => {
  if (!condition) failures.push(`${message}: ${JSON.stringify(state)}`);
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
  `--user-data-dir=/tmp/menu-lens-concept-route-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create concept-route target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  for (const width of widths) {
    await setViewport(client, width, width <= 390 ? 960 : 1050);
    for (const expected of cases) {
      await client.send("Page.navigate", {
        url: `${baseUrl}/models/?model=${expected.model}&section=${expected.section}&viewport=390`,
      });
      await waitFor(
        client,
        `document.querySelector('#section-tabs')?.dataset.routeModel === ${JSON.stringify(expected.model)}`,
        `${expected.model} ${width}px concept-route layout`,
      );
      await settle(client);
      const state = await evaluate(client, stateExpression);

      check(state.routeModel === expected.model, `${expected.model} ${width}px route identity`, state);
      check(state.routeCount > 0, `${expected.model} ${width}px route count`, state);
      check(state.overlaps === 0, `${expected.model} ${width}px route node overlap`, state);
      check(!state.documentOverflow, `${expected.model} ${width}px document overflow`, state);
      check(state.objectPanel.top >= state.layout.bottom - 2, `${expected.model} ${width}px objects follow understanding layer`, state);
      check(state.objectPanel.top - state.layout.bottom <= 48, `${expected.model} ${width}px avoids empty band before objects`, state);

      if (width >= 1361) {
        check(state.concept.right < state.routeSection.left, `${expected.model} desktop concept precedes route`, state);
        check(state.concept.width > state.routeSection.width, `${expected.model} desktop concept remains primary`, state);
        check(state.routeSection.width >= 520 && state.routeSection.width <= 660, `${expected.model} desktop route column width`, state);
        check(state.routeBorderStart >= 1, `${expected.model} desktop route divider`, state);
        check(state.vignetteSvg.width >= 340, `${expected.model} desktop concept diagram remains large`, state);
      } else {
        check(state.concept.bottom <= state.routeSection.top + 2, `${expected.model} ${width}px concept stacks before route`, state);
        check(Math.abs(state.concept.width - state.layout.width) <= 3, `${expected.model} ${width}px concept uses full row`, state);
        check(Math.abs(state.routeSection.width - state.layout.width) <= 3, `${expected.model} ${width}px route uses full row`, state);
        check(state.routeBorderStart === 0, `${expected.model} ${width}px removes desktop divider`, state);
      }

      if (width >= 768 && width <= 1360) {
        check(state.routeScrollWidth <= state.routeClientWidth + 2, `${expected.model} ${width}px avoids hidden route scrolling`, state);
        check(state.allNodesVisible, `${expected.model} ${width}px keeps every route node visible`, state);
      }

      if (width > 900 && width <= 1360) {
        check(state.conceptColumns.split(' ').length >= 2, `${expected.model} ${width}px concept remains horizontal`, state);
        check(state.vignette.left < state.statement.left, `${expected.model} ${width}px diagram precedes explanation`, state);
      }

      if (width <= 900) {
        check(state.vignette.bottom <= state.statement.top + 2, `${expected.model} ${width}px concept stacks diagram before explanation`, state);
      }

      if (width <= 520) {
        check(state.sectionSummaryDisplay === "none", `${expected.model} ${width}px removes duplicate section paragraph`, state);
        check(state.linesDisplay === "none", `${expected.model} ${width}px uses mobile route strip`, state);
      } else {
        check(state.sectionSummaryDisplay !== "none", `${expected.model} ${width}px retains full section context`, state);
      }

      results.push({ name: `${expected.model}-${width}`, state });
      await capture(client, `concept-route-${expected.model}-${width}.png`);
    }
  }

  await writeFile(
    new URL("concept-route-breakpoint-results.json", outputDir),
    `${JSON.stringify({ failures, results }, null, 2)}\n`,
  );

  if (failures.length) {
    throw new Error(`Concept-route breakpoint review failed:\n- ${failures.join("\n- ")}`);
  }
  console.log("Concept-route breakpoint review passed: six models across desktop, intermediate, and mobile widths verified.");
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
