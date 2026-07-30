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
      // Try the next browser path.
    }
  }
  throw new Error("No Chrome or Chromium binary was found for browser review.");
};

const waitForHttp = async (url, attempts = 300) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server or DevTools endpoint is still starting.
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
    const id = this.nextId;
    this.nextId += 1;
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
    userGesture: true,
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(details.exception?.description ?? details.text ?? "Runtime evaluation failed.");
  }
  return result.result?.value;
};

const setViewport = (client, width, height) => client.send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 480,
  screenWidth: width,
  screenHeight: height,
});

const waitForDocument = async (client, expectedUrl) => {
  const expected = new URL(expectedUrl);
  let lastState = null;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      lastState = await evaluate(client, `(() => {
        const image = document.querySelector('#current-preview img.model-preview-image');
        return {
          ready: location.pathname === ${JSON.stringify(expected.pathname)}
            && location.search === ${JSON.stringify(expected.search)}
            && document.readyState === 'complete'
            && Boolean(document.querySelector('#current-object-title')?.textContent.trim())
            && (!image || (image.complete && image.naturalWidth > 0)),
          href: location.href,
          readyState: document.readyState,
          title: document.querySelector('#current-object-title')?.textContent ?? '',
          image: image ? { complete: image.complete, naturalWidth: image.naturalWidth, src: image.src } : null,
          archiveError: document.querySelector('.archive-error')?.textContent ?? '',
        };
      })()`);
      if (lastState?.ready) {
        await delay(250);
        return;
      }
    } catch (error) {
      lastState = { error: error.message };
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expectedUrl}: ${JSON.stringify(lastState)}`);
};

const navigate = async (client, path, width, height = 900) => {
  const url = `${baseUrl}${path}`;
  await setViewport(client, width, height);
  await client.send("Page.navigate", { url });
  await waitForDocument(client, url);
};

const scrollToSelector = async (client, selector) => {
  await evaluate(client, `(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (!target) return false;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, Math.round(target.getBoundingClientRect().top + window.scrollY));
    return true;
  })()`);
  await delay(150);
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
await waitForHttp(`${baseUrl}/previews/18B/390.png`);
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
  if (!targetResponse.ok) throw new Error(`Could not create browser review target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  const runtimeErrors = [];
  const requestUrls = new Map();
  const isFavicon = (url) => typeof url === "string" && new URL(url).pathname === "/favicon.ico";
  client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    runtimeErrors.push(exceptionDetails?.exception?.description ?? exceptionDetails?.text ?? "Runtime exception");
  });
  client.on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (!["error", "assert"].includes(type)) return;
    runtimeErrors.push(args.map((arg) => arg.value ?? arg.description ?? "").join(" "));
  });
  client.on("Network.requestWillBeSent", ({ requestId, request }) => {
    if (requestId && request?.url) requestUrls.set(requestId, request.url);
  });
  client.on("Network.loadingFinished", ({ requestId }) => requestUrls.delete(requestId));
  client.on("Network.loadingFailed", ({ requestId, errorText, blockedReason, type }) => {
    const url = requestUrls.get(requestId);
    requestUrls.delete(requestId);
    if (type === "Document" && errorText === "net::ERR_ABORTED") return;
    if (isFavicon(url)) return;
    runtimeErrors.push(`Resource load failed (${type ?? "unknown"}): ${blockedReason ?? errorText}${url ? ` (${url})` : ""}`);
  });
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");

  const cases = [];
  const basePath = "/models/?model=landscape-paper&section=reading-grammar&variant=18B&viewport=390";

  await navigate(client, basePath, 320);
  await scrollToSelector(client, "#workbench");
  const mobileMetrics = await evaluate(client, `(() => ({
    title: document.querySelector('#current-object-title')?.textContent,
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    iframeCount: document.querySelectorAll('#workbench iframe').length,
    imageLoaded: document.querySelector('#current-preview img')?.naturalWidth > 0,
    imagePath: new URL(document.querySelector('#current-preview img')?.src).pathname,
    mode: document.querySelector('#preview-grid')?.dataset.viewMode,
  }))()`);
  cases.push({ name: "landscape-320-focus", width: 320, height: 900, metrics: mobileMetrics });
  await capture(client, "landscape-320-focus.png");

  await navigate(client, basePath, 390);
  await scrollToSelector(client, "#workbench");
  await evaluate(client, `(async () => {
    document.querySelector('#view-all').click();
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const images = [...document.querySelectorAll('#all-preview-grid img')];
      if (images.length && images.every((image) => image.complete && image.naturalWidth > 0)) return true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
  })()`);
  const mobileAllMetrics = await evaluate(client, `(() => {
    const board = document.querySelector('#all-preview-grid');
    return {
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      boardVisible: getComputedStyle(board).display !== 'none',
      cardCount: board.querySelectorAll('.model-preview-card').length,
      horizontalBoard: board.scrollWidth > board.clientWidth,
      loadedImages: [...board.querySelectorAll('img')].filter((image) => image.complete && image.naturalWidth > 0).length,
      iframeCount: document.querySelectorAll('#workbench iframe').length,
      urlHasAll: new URL(location.href).searchParams.get('view') === 'all',
    };
  })()`);
  cases.push({ name: "landscape-390-all", width: 390, height: 900, metrics: mobileAllMetrics });
  await capture(client, "landscape-390-all.png");

  for (const width of [1024, 1440]) {
    await navigate(client, basePath, width);
    await scrollToSelector(client, "#workbench");
    await evaluate(client, `(async () => {
      document.querySelector('#compare-parent').click();
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const images = [...document.querySelectorAll('#preview-grid img')];
        if (images.length === 2 && images.every((image) => image.complete && image.naturalWidth > 0)) return true;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return false;
    })()`);
    const metrics = await evaluate(client, `(() => {
      const layout = document.querySelector('.model-layout');
      const preview = document.querySelector('#preview-grid');
      const stage = document.querySelector('.model-stage-column');
      const inspector = document.querySelector('.model-inspector');
      const sidebar = document.querySelector('.model-sidebar');
      const images = [...preview.querySelectorAll('img')];
      return {
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        layoutColumnCount: getComputedStyle(layout).gridTemplateColumns.trim().split(' ').filter(Boolean).length,
        sidebarColumnCount: getComputedStyle(sidebar).gridTemplateColumns.trim().split(' ').filter(Boolean).length,
        compareColumnCount: getComputedStyle(preview).gridTemplateColumns.trim().split(' ').filter(Boolean).length,
        currentAndParentVisible: !document.querySelector('.model-preview-pane--current').hidden
          && !document.querySelector('.model-preview-pane--parent').hidden,
        imagesLoaded: images.length === 2 && images.every((image) => image.complete && image.naturalWidth > 0),
        iframeCount: document.querySelectorAll('#workbench iframe').length,
        inspectorBesideStage: Math.abs(inspector.getBoundingClientRect().top - stage.getBoundingClientRect().top) < 4,
        inspectorBelowStage: inspector.getBoundingClientRect().top > stage.getBoundingClientRect().bottom - 4,
      };
    })()`);
    cases.push({ name: `landscape-${width}-compare`, width, height: 900, metrics });
    await capture(client, `landscape-${width}-compare.png`);
  }

  const studyPath = "/models/?model=paper-field&section=semantic-information&variant=12A-S1&viewport=390";
  await navigate(client, studyPath, 390);
  await scrollToSelector(client, "#workbench");
  const studyMetrics = await evaluate(client, `(() => ({
    compareHidden: document.querySelector('#compare-parent').hidden,
    parentRecordVisible: !document.querySelector('#parent-record-link').hidden,
    imageLoaded: document.querySelector('#current-preview img')?.naturalWidth > 0,
    iframeCount: document.querySelectorAll('#workbench iframe').length,
    titleDeduplicated: !document.querySelector('#current-object-title').textContent.match(/^(\\S+) · \\1\\b/),
  }))()`);
  cases.push({ name: "paper-field-390-study", width: 390, height: 900, metrics: studyMetrics });
  await capture(client, "paper-field-390-study.png");

  const failures = [];
  if (runtimeErrors.length) failures.push(`Runtime errors: ${runtimeErrors.join(" | ")}`);
  if (mobileMetrics.title !== "18B · Semantic Zoom") failures.push(`Unexpected current title: ${mobileMetrics.title}`);
  if (mobileMetrics.documentOverflow || !mobileMetrics.imageLoaded || mobileMetrics.iframeCount !== 0
    || mobileMetrics.mode !== "focus" || !mobileMetrics.imagePath.endsWith("/previews/18B/390.png")) {
    failures.push("320px static focus preview contract failed.");
  }
  if (mobileAllMetrics.documentOverflow || !mobileAllMetrics.boardVisible || mobileAllMetrics.cardCount !== 4
    || !mobileAllMetrics.horizontalBoard || mobileAllMetrics.loadedImages < 3
    || mobileAllMetrics.iframeCount !== 0 || !mobileAllMetrics.urlHasAll) {
    failures.push("390px section comparison board contract failed.");
  }
  const desktop1024 = cases.find((reviewCase) => reviewCase.name === "landscape-1024-compare");
  if (!desktop1024 || desktop1024.metrics.layoutColumnCount !== 2
    || desktop1024.metrics.sidebarColumnCount !== 1
    || desktop1024.metrics.compareColumnCount !== 2
    || !desktop1024.metrics.currentAndParentVisible || !desktop1024.metrics.imagesLoaded
    || desktop1024.metrics.iframeCount !== 0 || !desktop1024.metrics.inspectorBelowStage) {
    failures.push("1024px static side-by-side comparison contract failed.");
  }
  const desktop1440 = cases.find((reviewCase) => reviewCase.name === "landscape-1440-compare");
  if (!desktop1440 || desktop1440.metrics.layoutColumnCount !== 3
    || desktop1440.metrics.compareColumnCount !== 2
    || !desktop1440.metrics.currentAndParentVisible || !desktop1440.metrics.imagesLoaded
    || desktop1440.metrics.iframeCount !== 0 || !desktop1440.metrics.inspectorBesideStage) {
    failures.push("1440px static side-by-side comparison contract failed.");
  }
  if (!studyMetrics.compareHidden || !studyMetrics.parentRecordVisible || !studyMetrics.imageLoaded
    || studyMetrics.iframeCount !== 0 || !studyMetrics.titleDeduplicated) {
    failures.push("Study preview boundary failed.");
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
  if (failures.length) throw new Error(`Model-page browser review failed:\n- ${failures.join("\n- ")}`);
  socket.close();
  console.log("Model-page browser review: static focus, side-by-side comparison, section board, and study boundaries verified.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
