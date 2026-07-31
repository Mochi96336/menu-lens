import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_SECTION_TABS_DEBUG_PORT ?? 9446);
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
  throw new Error("No Chrome or Chromium binary was found for section-tab review.");
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
    name: "horizontal-1792-section-tabs",
    width: 1792,
    path: "/models/?model=horizontal-navigation&section=spread&variant=08&viewport=390",
    labels: ["市場基準", "分類 Spread", "料理 Ribbon", "Fisheye"],
    selectedId: "spread",
    selectedLabel: "分類 Spread",
    summary: "比較分類欄在同一張 spread 上的原地展寬，以及壓縮分類如何保留可辨識的內容分布。",
    objectIds: ["08", "08A"],
    requireAllVisible: true,
  },
  {
    name: "horizontal-390-section-tabs",
    width: 390,
    path: "/models/?model=horizontal-navigation&section=fisheye&variant=10&viewport=390",
    labels: ["市場基準", "分類 Spread", "料理 Ribbon", "Fisheye"],
    selectedId: "fisheye",
    selectedLabel: "Fisheye",
    summary: "比較完整 Fisheye Ribbon 與局部 Fisheye。10A 只重新分配焦點附近的鄰居寬度，分類順序、完整 ribbon 與遠端項目維持不變。",
    objectIds: ["10", "10A"],
    requireAllVisible: false,
  },
  {
    name: "landscape-390-overflow-section-tabs",
    width: 390,
    path: "/models/?model=landscape-paper&section=stopped-routes&variant=19&viewport=390",
    modelTitle: "Landscape Paper",
    labels: ["共同母體", "閱讀文法", "焦點幾何", "閱讀表面", "直排", "停止路線"],
    selectedId: "stopped-routes",
    selectedLabel: "停止路線",
    summary: "Rigid locator、3D fold 與 two-column window 的執行結果顯示定位、遮擋或閱讀窗口限制，因此停止延伸。",
    objectIds: ["19", "20", "21"],
    requireAllVisible: false,
    requireScrollable: true,
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
  `--user-data-dir=/tmp/menu-lens-section-tabs-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create section-tab target: ${targetResponse.status}`);
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
      const tabs = [...document.querySelectorAll('#section-tabs button')];
      const selected = document.querySelector('#section-tabs button[aria-selected="true"]');
      return document.readyState === 'complete'
        && document.querySelector('#model-title')?.textContent === ${JSON.stringify(testCase.modelTitle ?? 'Horizontal Navigation')}
        && tabs.length === ${testCase.labels.length}
        && selected?.dataset.sectionId === ${JSON.stringify(testCase.selectedId)}
        && document.querySelectorAll('#all-live-board .model-live-card').length === ${testCase.objectIds.length};
    })()`, `${testCase.name} rendered section`);
    await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
    await evaluate(client, `new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    await evaluate(client, `document.querySelector('#section-tabs').scrollIntoView({ block: 'start' })`);
    await evaluate(client, `new Promise((resolve) => requestAnimationFrame(resolve))`);

    const metrics = await evaluate(client, `(() => {
      const strip = document.querySelector('#section-tabs');
      const stripRect = strip.getBoundingClientRect();
      const tabs = [...strip.querySelectorAll('button')];
      const selected = tabs.find((button) => button.getAttribute('aria-selected') === 'true');
      const selectedRect = selected.getBoundingClientRect();
      const tabMetrics = tabs.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          id: button.dataset.sectionId,
          label: button.textContent,
          selected: button.getAttribute('aria-selected') === 'true',
          left: rect.left,
          right: rect.right,
          width: rect.width,
          fullyVisible: rect.left >= stripRect.left - 1 && rect.right <= stripRect.right + 1,
        };
      });
      return {
        labels: tabMetrics.map((tab) => tab.label),
        tabMetrics,
        selectedId: selected.dataset.sectionId,
        selectedLabel: selected.textContent,
        selectedVisible: selectedRect.left >= stripRect.left - 1
          && selectedRect.right <= stripRect.right + 1,
        allVisible: tabMetrics.every((tab) => tab.fullyVisible),
        fullWidthTab: tabMetrics.some((tab) => tab.width >= stripRect.width - 2),
        stripWidth: stripRect.width,
        stripScrollLeft: strip.scrollLeft,
        stripScrollable: strip.scrollWidth > strip.clientWidth + 1,
        summary: document.querySelector('#section-summary').textContent,
        objectIds: [...document.querySelectorAll('#all-live-board .model-live-card')]
          .map((card) => card.dataset.objectId),
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    })()`);
    results.push({ ...testCase, metrics });
    await capture(client, `${testCase.name}.png`);

    if (JSON.stringify(metrics.labels) !== JSON.stringify(testCase.labels)
      || metrics.selectedId !== testCase.selectedId
      || metrics.selectedLabel !== testCase.selectedLabel
      || !metrics.selectedVisible
      || metrics.fullWidthTab
      || metrics.summary !== testCase.summary
      || JSON.stringify(metrics.objectIds) !== JSON.stringify(testCase.objectIds)
      || (testCase.requireAllVisible && !metrics.allVisible)
      || (testCase.requireScrollable && !metrics.stripScrollable)
      || metrics.documentOverflow) {
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
    new URL("section-tabs-results.json", outputDir),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (failures.length) {
    throw new Error(`Section-tab browser review failed:\n- ${failures.join("\n- ")}`);
  }
  socket.close();
  console.log("Section-tab browser review: labels, active section, summary, cards, and visible selected tab verified.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
