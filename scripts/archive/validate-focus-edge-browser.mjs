import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_FOCUS_EDGE_DEBUG_PORT ?? 9445);
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
  throw new Error("No Chrome or Chromium binary was found for focus-edge review.");
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
    mobile: true,
    screenWidth: width,
    screenHeight: height,
  },
);

const capture = async (client, filename) => {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, outputDir), Buffer.from(screenshot.data, "base64"));
};

const cases = [
  {
    name: "paper-field-320-focus-edge",
    width: 320,
    path: "/models/?model=paper-field&section=semantic-information&variant=12A-S1&viewport=320&view=focus",
    title: "12A-S1 · Blinded Reader Comparison",
    meta: "盲測比較 · 12 / 12A",
  },
  {
    name: "paper-field-390-focus-edge",
    width: 390,
    path: "/models/?model=paper-field&section=semantic-information&variant=12A-S1&viewport=390&view=focus",
    title: "12A-S1 · Blinded Reader Comparison",
    meta: "盲測比較 · 12 / 12A",
  },
  {
    name: "depth-390-focus-edge",
    width: 390,
    path: "/models/?model=depth-projection&section=projection-lens&variant=25P-S1&viewport=390&view=focus",
    title: "25P-S1 · Unfamiliar-reader Study",
    meta: "陌生讀者任務 · 25P",
    prerequisite: "25P-L1",
  },
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
  `--user-data-dir=/tmp/menu-lens-focus-edge-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create focus-edge target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  const results = [];
  const failures = [];
  for (const testCase of cases) {
    await setViewport(client, testCase.width);
    await client.send("Page.navigate", { url: `${baseUrl}${testCase.path}` });
    await waitFor(client, `(() => {
      const board = document.querySelector('#all-live-board');
      const card = board?.querySelector('.model-live-card:not([hidden])');
      const frame = card?.querySelector('iframe.model-live-frame');
      return document.readyState === 'complete'
        && board?.dataset.viewMode === 'focus'
        && board.dataset.startEdgeVisible === 'true'
        && card
        && frame
        && !frame.hidden
        && card.querySelector('.model-live-card__select strong')?.textContent;
    })()`, `${testCase.name} focus card`);
    await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");

    const metrics = await evaluate(client, `(() => {
      const board = document.querySelector('#all-live-board');
      const card = board.querySelector('.model-live-card:not([hidden])');
      const boardRect = board.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return {
        title: card.querySelector('.model-live-card__select strong').textContent,
        meta: card.querySelector('.model-live-card__meta').textContent,
        subject: document.querySelector('#difference-before').textContent,
        boundary: document.querySelector('#difference-unchanged').textContent,
        startEdgeDelta: cardRect.left - boardRect.left,
        startEdgeVisible: cardRect.left >= boardRect.left - 1,
        boardScrollLeft: board.scrollLeft,
        alignmentContract: board.dataset.startEdgeVisible,
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    })()`);
    results.push({ ...testCase, metrics });
    await capture(client, `${testCase.name}.png`);

    if (!metrics.startEdgeVisible
      || metrics.startEdgeDelta < -1
      || metrics.boardScrollLeft !== 0
      || metrics.alignmentContract !== "true"
      || metrics.documentOverflow
      || metrics.title !== testCase.title
      || metrics.meta !== testCase.meta
      || (testCase.prerequisite
        && (!metrics.boundary.includes(testCase.prerequisite)
          || metrics.subject.includes(testCase.prerequisite)))) {
      failures.push(`${testCase.name}: ${JSON.stringify(metrics)}`);
    }
  }

  const report = {
    browser,
    baseUrl,
    generatedAt: new Date().toISOString(),
    cases: results,
    failures,
  };
  await writeFile(
    new URL("focus-edge-results.json", outputDir),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (failures.length) {
    throw new Error(`Focus-edge browser review failed:\n- ${failures.join("\n- ")}`);
  }
  socket.close();
  console.log("Focus-edge browser review: 320px and 390px filtered cards keep their start edge visible.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
