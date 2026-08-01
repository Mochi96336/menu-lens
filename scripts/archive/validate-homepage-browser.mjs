import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
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
  throw new Error("No Chrome or Chromium binary was found for homepage browser review.");
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
    this.listeners = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }
}

const evaluate = async (client, expression) => {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description
      ?? result.exceptionDetails.text
      ?? "Runtime evaluation failed.");
  }
  return result.result?.value;
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

const setViewport = (client, width, height) => client.send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 480,
  screenWidth: width,
  screenHeight: height,
});

const navigate = async (client, width, height) => {
  await setViewport(client, width, height);
  await client.send("Page.navigate", { url: `${baseUrl}/` });
  await waitFor(client, `(() => document.readyState === 'complete'
    && document.querySelectorAll('.archive-model-card').length === 6
    && /\\d/.test(document.querySelector('#object-count')?.textContent ?? ''))()`, `${width}px homepage`);
  await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
};

const capture = async (client, filename) => {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, outputDir), Buffer.from(screenshot.data, "base64"));
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await mkdir(outputDir, { recursive: true });
await waitForHttp(`${baseUrl}/`);
const browser = await findBrowser();
const debugPort = Number(process.env.HOMEPAGE_REVIEW_DEBUG_PORT ?? 9450);
const browserProcess = spawn(browser, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/menu-lens-home-review-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create homepage review target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  const runtimeErrors = [];
  client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    runtimeErrors.push(exceptionDetails?.exception?.description ?? exceptionDetails?.text ?? "Runtime exception");
  });
  client.on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (!["error", "assert"].includes(type)) return;
    runtimeErrors.push(args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
  });
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  await navigate(client, 1440, 1000);
  const desktop = await evaluate(client, `(() => {
    const spotlight = document.querySelector('.archive-hero__spotlight').getBoundingClientRect();
    const action = document.querySelector('.archive-hero__action').getBoundingClientRect();
    const start = document.querySelector('#start');
    const notes = document.querySelector('#notes');
    return {
      noOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
      spotlightVisible: spotlight.top >= 0 && spotlight.bottom <= innerHeight,
      actionVisible: action.top >= 0 && action.bottom <= innerHeight,
      priorityCount: document.querySelectorAll('.archive-priority-card').length,
      modelCount: document.querySelectorAll('.archive-model-card').length,
      modelsBeforeNotes: Boolean(start.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  })()`);
  assert(desktop.noOverflow, "Desktop homepage has horizontal overflow.");
  assert(desktop.spotlightVisible, "Desktop model spotlight is not fully visible in the first viewport.");
  assert(desktop.actionVisible, "Desktop primary model action is not visible in the first viewport.");
  assert(desktop.priorityCount === 3, "Desktop homepage does not expose three priority entries.");
  assert(desktop.modelCount === 6, "Desktop homepage does not expose six model cards.");
  assert(desktop.modelsBeforeNotes, "Desktop homepage places notes before model entry.");
  await capture(client, "archive-home-desktop.png");

  await navigate(client, 390, 844);
  const mobile = await evaluate(client, `(() => {
    const copy = document.querySelector('.archive-hero__copy').getBoundingClientRect();
    const spotlight = document.querySelector('.archive-hero__spotlight').getBoundingClientRect();
    const actions = [...document.querySelectorAll('.archive-hero__actions > a')]
      .map((element) => element.getBoundingClientRect());
    return {
      noOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
      spotlightAfterCopy: spotlight.top >= copy.bottom - 1,
      spotlightFits: spotlight.left >= 0 && spotlight.right <= innerWidth + 1,
      actionsStacked: actions.length === 2
        && Math.abs(actions[0].left - actions[1].left) < 1
        && actions.every((rect) => rect.width >= 340 && rect.right <= innerWidth + 1),
    };
  })()`);
  assert(mobile.noOverflow, "390px homepage has horizontal overflow.");
  assert(mobile.spotlightAfterCopy, "390px spotlight overlaps the hero copy.");
  assert(mobile.spotlightFits, "390px spotlight exceeds the viewport.");
  assert(mobile.actionsStacked, "390px hero actions are not full-width stacked controls.");
  await capture(client, "archive-home-mobile.png");

  await evaluate(client, "document.querySelector('#start').scrollIntoView({ block: 'start' })");
  await delay(100);
  const mobileModels = await evaluate(client, `(() => {
    const cards = [...document.querySelectorAll('.archive-priority-card')]
      .map((element) => element.getBoundingClientRect());
    return {
      firstFits: cards[0].left >= 0 && cards[0].right <= innerWidth + 1,
      singleColumn: cards.length === 3
        && cards[1].top >= cards[0].bottom - 1
        && cards[2].top >= cards[1].bottom - 1,
    };
  })()`);
  assert(mobileModels.firstFits, "390px priority entry exceeds the viewport.");
  assert(mobileModels.singleColumn, "390px priority entries are not a single column.");
  await capture(client, "archive-home-mobile-models.png");

  assert(runtimeErrors.length === 0, `Homepage browser review found runtime errors: ${runtimeErrors.join(" | ")}`);
  socket.close();
  console.log("Archive homepage browser review: desktop and 390px model entry geometry verified.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
