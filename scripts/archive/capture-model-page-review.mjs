import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_REVIEW_BASE_URL ?? "http://127.0.0.1:4173";
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
      // Try the next known browser path.
    }
  }
  throw new Error("No Chrome or Chromium binary was found for browser review.");
};

const waitForHttp = async (url, attempts = 100) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The local server or DevTools endpoint is not ready yet.
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
      const listeners = this.listeners.get(message.method) ?? [];
      for (const listener of listeners) listener(message.params ?? {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
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
    userGesture: true,
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    const description = details.exception?.description ?? details.text ?? "Runtime evaluation failed.";
    throw new Error(description);
  }
  return result.result?.value;
};

const waitForDocument = async (client, expectedUrl) => {
  const serializedUrl = JSON.stringify(expectedUrl);
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const ready = await evaluate(client, `(() => (
        location.href === ${serializedUrl}
        && document.readyState === "complete"
        && Boolean(document.querySelector("#current-object-title")?.textContent.trim())
      ))()`);
      if (ready) {
        await delay(350);
        return;
      }
    } catch {
      // Navigation may temporarily invalidate the execution context.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for rendered model page ${expectedUrl}`);
};

const setViewport = (client, width, height) => client.send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 480,
  screenWidth: width,
  screenHeight: height,
});

const navigate = async (client, path, width, height) => {
  const expectedUrl = `${baseUrl}${path}`;
  await setViewport(client, width, height);
  await client.send("Page.navigate", { url: expectedUrl });
  await waitForDocument(client, expectedUrl);
};

const capture = async (client, filename) => {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, outputDir), Buffer.from(result.data, "base64"));
};

await mkdir(outputDir, { recursive: true });
await waitForHttp(`${baseUrl}/models/`);

const browser = await findBrowser();
const debugPort = Number(process.env.CHROME_DEBUG_PORT ?? 9222);
const browserProcess = spawn(browser, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/menu-lens-browser-review-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create a Chrome review target: ${targetResponse.status}`);
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

  const cases = [];
  const landscapePath = "/models/?model=landscape-paper&section=reading-grammar&variant=18B&viewport=390&compare=parent";

  await navigate(client, landscapePath, 320, 900);
  const mobileMetrics = await evaluate(client, `(() => {
    const frame = document.querySelector('#current-preview iframe');
    const compare = document.querySelector('#compare-parent');
    const parentSwitch = document.querySelector('[data-preview-pane="parent"]');
    const currentFrame = frame;
    parentSwitch.click();
    const paneSwitched = document.querySelector('#preview-grid').dataset.mobilePane === 'parent';
    return {
      title: document.querySelector('#current-object-title')?.textContent,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      computedFrameWidth: frame ? getComputedStyle(frame).width : null,
      compareVisible: compare ? !compare.hidden : false,
      paneSwitched,
      currentFramePreserved: document.querySelector('#current-preview iframe') === currentFrame,
      bodyWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  })()`);
  cases.push({ name: "landscape-mobile", width: 320, height: 900, metrics: mobileMetrics });
  await capture(client, "landscape-320-top.png");

  await navigate(client, landscapePath, 390, 900);
  await evaluate(client, "document.querySelector('#workbench')?.scrollIntoView({ block: 'start' })");
  await delay(150);
  cases.push({
    name: "landscape-390-workbench",
    width: 390,
    height: 900,
    metrics: await evaluate(client, `(() => ({
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      computedFrameWidth: getComputedStyle(document.querySelector('#current-preview iframe')).width,
      sectionRailOverflow: document.querySelector('#section-tabs').scrollWidth > document.querySelector('#section-tabs').clientWidth,
      variantRailOverflow: document.querySelector('#variant-list').scrollWidth > document.querySelector('#variant-list').clientWidth,
    }))()`),
  });
  await capture(client, "landscape-390-workbench.png");

  for (const width of [1024, 1440]) {
    await navigate(client, landscapePath, width, 900);
    await evaluate(client, "document.querySelector('#workbench')?.scrollIntoView({ block: 'start' })");
    await delay(150);
    cases.push({
      name: `landscape-${width}-workbench`,
      width,
      height: 900,
      metrics: await evaluate(client, `(() => ({
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        computedFrameWidth: getComputedStyle(document.querySelector('#current-preview iframe')).width,
        layoutColumns: getComputedStyle(document.querySelector('.model-layout')).gridTemplateColumns,
        compareColumns: getComputedStyle(document.querySelector('#preview-grid')).gridTemplateColumns,
      }))()`),
    });
    await capture(client, `landscape-${width}-workbench.png`);
  }

  const studyPath = "/models/?model=paper-field&section=semantic-information&variant=12A-S1&viewport=390&compare=parent";
  await navigate(client, studyPath, 390, 900);
  const studyBoundaryMetrics = await evaluate(client, `(() => ({
    compareHiddenOnStudy: document.querySelector('#compare-parent').hidden,
    parentRecordVisibleOnStudy: !document.querySelector('#parent-record-link').hidden,
    titleDeduplicated: !document.querySelector('#current-object-title').textContent.match(/^(\\S+) · \\1\\b/),
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }))()`);
  await evaluate(client, "document.querySelector('#workbench')?.scrollIntoView({ block: 'start' })");
  await delay(150);
  await capture(client, "paper-field-390-study.png");
  const focusMetrics = await evaluate(client, `(() => {
    const sectionButton = [...document.querySelectorAll('#section-tabs button')]
      .find((button) => button.dataset.sectionId === 'elastic-geometry');
    sectionButton.click();
    const sectionFocusRetained = document.activeElement?.dataset.sectionId === 'elastic-geometry';
    const variantButton = document.querySelector('#variant-list [data-object-id="16A"]');
    variantButton.click();
    const variantFocusRetained = document.activeElement?.dataset.objectId === '16A';
    return { sectionFocusRetained, variantFocusRetained };
  })()`);
  const studyMetrics = { ...studyBoundaryMetrics, ...focusMetrics };
  cases.push({ name: "paper-field-study", width: 390, height: 900, metrics: studyMetrics });

  const failures = [];
  if (runtimeErrors.length) failures.push(`Runtime errors: ${runtimeErrors.join(" | ")}`);
  if (mobileMetrics.title !== "18B · Semantic Zoom") failures.push(`Unexpected current title: ${mobileMetrics.title}`);
  if (mobileMetrics.documentOverflow) failures.push("320px page has document-level horizontal overflow.");
  if (mobileMetrics.computedFrameWidth !== "390px") failures.push(`Expected 390px frame, got ${mobileMetrics.computedFrameWidth}.`);
  if (!mobileMetrics.compareVisible || !mobileMetrics.paneSwitched || !mobileMetrics.currentFramePreserved) {
    failures.push("Mobile Current/Parent comparison contract failed.");
  }
  for (const reviewCase of cases) {
    if (reviewCase.metrics.documentOverflow) failures.push(`${reviewCase.name} has document-level horizontal overflow.`);
  }
  if (!studyMetrics.compareHiddenOnStudy || !studyMetrics.parentRecordVisibleOnStudy) {
    failures.push("Study comparison boundary failed.");
  }
  if (!studyMetrics.titleDeduplicated) failures.push("A displayed object title repeats its canonical ID.");
  if (!studyMetrics.sectionFocusRetained || !studyMetrics.variantFocusRetained) {
    failures.push("Browser focus retention failed after navigation rerender.");
  }

  const report = {
    browser,
    baseUrl,
    generatedAt: new Date().toISOString(),
    runtimeErrors,
    cases,
    failures,
  };
  await writeFile(new URL("results.json", outputDir), `${JSON.stringify(report, null, 2)}\n`);
  socket.close();

  if (failures.length) {
    throw new Error(`Model-page browser review failed:\n- ${failures.join("\n- ")}`);
  }
  console.log(`Model-page browser review passed with ${cases.length} viewport cases.`);
} finally {
  browserProcess.kill("SIGTERM");
  await delay(200);
  if (!browserProcess.killed) browserProcess.kill("SIGKILL");
  if (browserProcess.exitCode && browserProcess.exitCode !== 0 && !browserProcess.killed) {
    console.error(browserStderr);
  }
}
