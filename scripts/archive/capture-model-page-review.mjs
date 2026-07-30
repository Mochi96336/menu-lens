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
  throw new Error("No Chrome or Chromium binary was found for model-page browser review.");
};

const waitForHttp = async (url, attempts = 300) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server or DevTools endpoint is not ready yet.
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
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(details.exception?.description ?? details.text ?? "Runtime evaluation failed.");
  }
  return result.result?.value;
};

const setViewport = (client, width, height = 900) => client.send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 480,
  screenWidth: width,
  screenHeight: height,
});

const waitFor = async (client, expression, label, attempts = 240) => {
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

const navigate = async (client, path, width, height = 900) => {
  await setViewport(client, width, height);
  await client.send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitFor(client, `(() => location.pathname === ${JSON.stringify(path.split("?")[0])}
    && document.readyState === 'complete'
    && Boolean(document.querySelector('#current-object-title')?.textContent))()`, `model page ${path}`);
  await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
};

const waitForLive = (client, rootSelector) => waitFor(client, `(() => {
  const root = document.querySelector(${JSON.stringify(rootSelector)});
  const frame = root?.querySelector('iframe.model-live-frame');
  if (!root || !frame || root.dataset.liveState !== 'ready' || frame.hidden) return false;
  const frameDocument = frame.contentDocument;
  const liveRoot = frameDocument?.querySelector(root.dataset.liveRoot || '#prototype');
  return Boolean(frameDocument && liveRoot && Number.parseFloat(frame.style.height) > 0);
})()`, `live surface ${rootSelector}`);

const waitForBoard = (client) => waitFor(client, `(() => {
  const board = document.querySelector('#all-preview-grid');
  const images = [...board?.querySelectorAll('img') ?? []];
  const currentCard = board?.querySelector('[data-current="true"]');
  const boardRect = board?.getBoundingClientRect();
  const cardRect = currentCard?.getBoundingClientRect();
  const visibleWidth = boardRect && cardRect
    ? Math.max(0, Math.min(cardRect.right, boardRect.right) - Math.max(cardRect.left, boardRect.left))
    : 0;
  return Boolean(board && getComputedStyle(board).display !== 'none'
    && images.length
    && images.every((image) => image.complete && image.naturalWidth > 0)
    && cardRect
    && visibleWidth >= Math.min(cardRect.width, boardRect.width) * 0.8);
})()`, "static all-object board with active card visible");

const capture = async (client, filename) => {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, outputDir), Buffer.from(screenshot.data, "base64"));
};

await mkdir(outputDir, { recursive: true });
await waitForHttp(`${baseUrl}/models/`);
const browser = await findBrowser();
const debugPort = Number(process.env.MODEL_REVIEW_DEBUG_PORT ?? 9444);
const browserProcess = spawn(browser, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/menu-lens-model-review-${process.pid}`,
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
  await waitForLive(client, "#current-preview");
  await evaluate(client, `(() => {
    const frame = document.querySelector('#current-preview iframe');
    frame.contentWindow.__menuLensReviewMarker = 'focus-preserved';
    document.querySelector('[data-viewport="desktop"]').click();
  })()`);
  await waitFor(client, `(() => {
    const root = document.querySelector('#current-preview');
    const frame = root.querySelector('iframe');
    return root.dataset.liveState === 'ready'
      && frame.style.width === '1024px'
      && frame.contentWindow.__menuLensReviewMarker === 'focus-preserved';
  })()`, "viewport resize without live reload");
  await evaluate(client, `document.querySelector('#view-all').click()`);
  await waitForBoard(client);
  await evaluate(client, `document.querySelector('#view-focus').click()`);
  await waitForLive(client, "#current-preview");
  await evaluate(client, `document.querySelector('[data-viewport="390"]').click()`);
  await waitForLive(client, "#current-preview");
  const mobileFocusMetrics = await evaluate(client, `(() => {
    const root = document.querySelector('#current-preview');
    const frame = root.querySelector('iframe');
    const liveRoot = frame.contentDocument.querySelector(root.dataset.liveRoot);
    return {
      title: document.querySelector('#current-object-title').textContent,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      iframeCount: document.querySelectorAll('#workbench iframe').length,
      liveState: root.dataset.liveState,
      frameVisible: !frame.hidden,
      framePointerEvents: getComputedStyle(frame).pointerEvents,
      frameWidth: frame.style.width,
      frameHeight: Number.parseFloat(frame.style.height),
      rootHeight: liveRoot.getBoundingClientRect().height,
      rootTop: Math.abs(liveRoot.getBoundingClientRect().top),
      sourcePath: new URL(frame.src).pathname,
      statePreserved: frame.contentWindow.__menuLensReviewMarker === 'focus-preserved',
      mode: document.querySelector('#preview-grid').dataset.viewMode,
    };
  })()`);
  cases.push({ name: "landscape-320-live-focus", width: 320, height: 900, metrics: mobileFocusMetrics });
  await capture(client, "landscape-320-live-focus.png");

  await navigate(client, basePath, 390);
  await waitForLive(client, "#current-preview");
  await evaluate(client, `document.querySelector('#view-all').click()`);
  await waitForBoard(client);
  const mobileAllMetrics = await evaluate(client, `(() => {
    const board = document.querySelector('#all-preview-grid');
    const currentCard = board.querySelector('[data-current="true"]');
    const boardRect = board.getBoundingClientRect();
    const currentRect = currentCard.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(currentRect.right, boardRect.right) - Math.max(currentRect.left, boardRect.left));
    const hiddenLiveFrame = document.querySelector('#current-preview iframe');
    return {
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      boardVisible: getComputedStyle(board).display !== 'none',
      cardCount: board.querySelectorAll('.model-preview-card').length,
      horizontalBoard: board.scrollWidth > board.clientWidth,
      loadedImages: [...board.querySelectorAll('img')].filter((image) => image.complete && image.naturalWidth > 0).length,
      boardIframeCount: board.querySelectorAll('iframe').length,
      hiddenLivePreserved: Boolean(hiddenLiveFrame),
      currentCardVisible: visibleWidth >= Math.min(currentRect.width, boardRect.width) * 0.8,
      urlHasAll: new URL(location.href).searchParams.get('view') === 'all',
    };
  })()`);
  await evaluate(client, `(() => {
    const button = [...document.querySelectorAll('[data-all-object-id]')]
      .find((candidate) => candidate.dataset.allObjectId !== '18B');
    button.click();
  })()`);
  await waitForLive(client, "#current-preview");
  const allSelectionMetrics = await evaluate(client, `(() => ({
    returnedToFocus: document.querySelector('#all-preview-grid').hidden && !document.querySelector('#preview-grid').hidden,
    selectedObject: document.querySelector('#current-preview').dataset.objectId,
    liveSource: new URL(document.querySelector('#current-preview iframe').src).pathname,
  }))()`);
  cases.push({ name: "landscape-390-static-board", width: 390, height: 900, metrics: { ...mobileAllMetrics, ...allSelectionMetrics } });
  await navigate(client, `${basePath}&view=all`, 390);
  await waitForBoard(client);
  await capture(client, "landscape-390-static-board.png");

  for (const width of [1024, 1440]) {
    await navigate(client, basePath, width);
    await waitForLive(client, "#current-preview");
    await evaluate(client, `(() => {
      document.querySelector('#current-preview iframe').contentWindow.__currentMarker = 'current';
      document.querySelector('#compare-parent').click();
    })()`);
    await waitForLive(client, "#parent-preview");
    await evaluate(client, `(() => {
      document.querySelector('#parent-preview iframe').contentWindow.__parentMarker = 'parent';
      document.querySelector('#view-all').click();
    })()`);
    await waitForBoard(client);
    await evaluate(client, `document.querySelector('#compare-parent').click()`);
    await waitForLive(client, "#current-preview");
    await waitForLive(client, "#parent-preview");
    const metrics = await evaluate(client, `(() => {
      const layout = document.querySelector('.model-layout');
      const preview = document.querySelector('#preview-grid');
      const stage = document.querySelector('.model-stage-column');
      const inspector = document.querySelector('.model-inspector');
      const sidebar = document.querySelector('.model-sidebar');
      const currentRoot = document.querySelector('#current-preview');
      const parentRoot = document.querySelector('#parent-preview');
      const currentFrame = currentRoot.querySelector('iframe');
      const parentFrame = parentRoot.querySelector('iframe');
      const currentTarget = currentFrame.contentDocument.querySelector(currentRoot.dataset.liveRoot);
      const parentTarget = parentFrame.contentDocument.querySelector(parentRoot.dataset.liveRoot);
      return {
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        layoutColumnCount: getComputedStyle(layout).gridTemplateColumns.trim().split(' ').filter(Boolean).length,
        sidebarColumnCount: getComputedStyle(sidebar).gridTemplateColumns.trim().split(' ').filter(Boolean).length,
        compareColumnCount: getComputedStyle(preview).gridTemplateColumns.trim().split(' ').filter(Boolean).length,
        currentAndParentVisible: !document.querySelector('.model-preview-pane--current').hidden
          && !document.querySelector('.model-preview-pane--parent').hidden,
        iframeCount: preview.querySelectorAll('iframe').length,
        bothReady: currentRoot.dataset.liveState === 'ready' && parentRoot.dataset.liveState === 'ready',
        bothOperable: getComputedStyle(currentFrame).pointerEvents !== 'none'
          && getComputedStyle(parentFrame).pointerEvents !== 'none',
        statePreserved: currentFrame.contentWindow.__currentMarker === 'current'
          && parentFrame.contentWindow.__parentMarker === 'parent',
        currentHeightMatches: Math.abs(Number.parseFloat(currentFrame.style.height) - currentTarget.getBoundingClientRect().height) < 3,
        parentHeightMatches: Math.abs(Number.parseFloat(parentFrame.style.height) - parentTarget.getBoundingClientRect().height) < 3,
        inspectorBesideStage: Math.abs(inspector.getBoundingClientRect().top - stage.getBoundingClientRect().top) < 4,
        inspectorBelowStage: inspector.getBoundingClientRect().top > stage.getBoundingClientRect().bottom - 4,
      };
    })()`);
    cases.push({ name: `landscape-${width}-live-compare`, width, height: 900, metrics });
    await capture(client, `landscape-${width}-live-compare.png`);
  }

  const studyPath = "/models/?model=paper-field&section=semantic-information&variant=12A-S1&viewport=390";
  await navigate(client, studyPath, 390);
  await waitForLive(client, "#current-preview");
  const studyMetrics = await evaluate(client, `(() => {
    const root = document.querySelector('#current-preview');
    const frame = root.querySelector('iframe');
    return {
      compareHidden: document.querySelector('#compare-parent').hidden,
      parentRecordVisible: !document.querySelector('#parent-record-link').hidden,
      sourceActionText: document.querySelector('#current-exact-link').textContent,
      visibleIframeCount: [...document.querySelectorAll('#preview-grid .model-preview-pane:not([hidden]) iframe')].filter((item) => !item.hidden).length,
      parentFrameIdle: !document.querySelector('#parent-preview iframe')?.getAttribute('src'),
      liveReady: root.dataset.liveState === 'ready' && !frame.hidden,
      liveRoot: root.dataset.liveRoot,
      operable: getComputedStyle(frame).pointerEvents !== 'none',
      titleDeduplicated: !document.querySelector('#current-object-title').textContent.match(/^(\\S+) · \\1\\b/),
    };
  })()`);
  cases.push({ name: "paper-field-390-live-study", width: 390, height: 900, metrics: studyMetrics });
  await capture(client, "paper-field-390-live-study.png");

  const failures = [];
  if (runtimeErrors.length) failures.push(`Runtime errors: ${runtimeErrors.join(" | ")}`);
  if (mobileFocusMetrics.title !== "18B · Semantic Zoom") failures.push(`Unexpected current title: ${mobileFocusMetrics.title}`);
  if (mobileFocusMetrics.documentOverflow || mobileFocusMetrics.iframeCount < 1
    || mobileFocusMetrics.liveState !== "ready" || !mobileFocusMetrics.frameVisible
    || mobileFocusMetrics.framePointerEvents === "none" || mobileFocusMetrics.frameWidth !== "390px"
    || Math.abs(mobileFocusMetrics.frameHeight - mobileFocusMetrics.rootHeight) >= 3
    || mobileFocusMetrics.rootTop >= 3 || !mobileFocusMetrics.statePreserved
    || mobileFocusMetrics.mode !== "focus" || !mobileFocusMetrics.sourcePath.includes("18b-semantic-zoom")) {
    failures.push("320px operable focus surface contract failed.");
  }
  if (mobileAllMetrics.documentOverflow || !mobileAllMetrics.boardVisible || mobileAllMetrics.cardCount !== 4
    || !mobileAllMetrics.horizontalBoard || mobileAllMetrics.loadedImages < 3 || mobileAllMetrics.boardIframeCount !== 0
    || !mobileAllMetrics.hiddenLivePreserved || !mobileAllMetrics.currentCardVisible || !mobileAllMetrics.urlHasAll
    || !allSelectionMetrics.returnedToFocus || !allSelectionMetrics.selectedObject || !allSelectionMetrics.liveSource) {
    failures.push("390px hybrid static-board selection contract failed.");
  }
  const desktop1024 = cases.find((reviewCase) => reviewCase.name === "landscape-1024-live-compare");
  if (!desktop1024 || desktop1024.metrics.layoutColumnCount !== 2
    || desktop1024.metrics.sidebarColumnCount !== 1 || desktop1024.metrics.compareColumnCount !== 2
    || !desktop1024.metrics.currentAndParentVisible || desktop1024.metrics.iframeCount !== 2
    || !desktop1024.metrics.bothReady || !desktop1024.metrics.bothOperable || !desktop1024.metrics.statePreserved
    || !desktop1024.metrics.currentHeightMatches || !desktop1024.metrics.parentHeightMatches
    || !desktop1024.metrics.inspectorBelowStage) {
    failures.push("1024px operable side-by-side comparison contract failed.");
  }
  const desktop1440 = cases.find((reviewCase) => reviewCase.name === "landscape-1440-live-compare");
  if (!desktop1440 || desktop1440.metrics.layoutColumnCount !== 3 || desktop1440.metrics.compareColumnCount !== 2
    || !desktop1440.metrics.currentAndParentVisible || desktop1440.metrics.iframeCount !== 2
    || !desktop1440.metrics.bothReady || !desktop1440.metrics.bothOperable || !desktop1440.metrics.statePreserved
    || !desktop1440.metrics.currentHeightMatches || !desktop1440.metrics.parentHeightMatches
    || !desktop1440.metrics.inspectorBesideStage) {
    failures.push("1440px operable side-by-side comparison contract failed.");
  }
  if (!studyMetrics.compareHidden || !studyMetrics.parentRecordVisible
    || studyMetrics.sourceActionText !== "開啟研究工具 ↗" || studyMetrics.visibleIframeCount !== 1
    || !studyMetrics.parentFrameIdle || !studyMetrics.liveReady || !studyMetrics.liveRoot || !studyMetrics.operable || !studyMetrics.titleDeduplicated) {
    failures.push("Study live-surface boundary failed.");
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
  console.log("Model-page browser review: operable live focus/compare surfaces, preserved state, static section board, and study boundaries verified.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
