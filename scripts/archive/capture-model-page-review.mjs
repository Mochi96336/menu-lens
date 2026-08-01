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

const setViewport = (client, width, height = 1000) => client.send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width <= 480,
  screenWidth: width,
  screenHeight: height,
});

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

const navigate = async (client, path, width, height = 1000) => {
  await setViewport(client, width, height);
  await client.send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitFor(client, `(() => location.pathname === ${JSON.stringify(path.split("?")[0])}
    && document.readyState === 'complete'
    && Boolean(document.querySelector('#inspector-object-title')?.textContent))()`, `model page ${path}`);
  await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
};

const waitForBoard = (client, expectedCount = null) => waitFor(client, `(() => {
  const board = document.querySelector('#all-live-board');
  const cards = [...board?.querySelectorAll('.model-live-card') ?? []];
  if (!board || board.hidden || !cards.length) return false;
  if (${expectedCount ?? "null"} !== null && cards.length !== ${expectedCount ?? "null"}) return false;
  return cards.every((card) => {
    const root = card.querySelector('.model-pooled-surface');
    const frame = root?.querySelector('iframe.model-live-frame');
    if (!root || !frame || root.dataset.liveState !== 'ready' || frame.hidden) return false;
    const liveRoot = frame.contentDocument?.querySelector(root.dataset.liveRoot || '#prototype');
    return Boolean(liveRoot
      && Math.abs(Number.parseFloat(frame.style.height) - liveRoot.getBoundingClientRect().height) < 3
      && getComputedStyle(frame).pointerEvents !== 'none');
  });
})()`, `full live board${expectedCount ? ` with ${expectedCount} cards` : ""}`);

const waitForVisibleBoard = (client, expectedCount) => waitFor(client, `(() => {
  const board = document.querySelector('#all-live-board');
  const cards = [...board?.querySelectorAll('.model-live-card') ?? []].filter((card) => !card.hidden);
  if (!board || board.hidden || cards.length !== ${expectedCount}) return false;
  return cards.every((card) => {
    const root = card.querySelector('.model-pooled-surface');
    const frame = root?.querySelector('iframe.model-live-frame');
    if (!root || !frame || root.dataset.liveState !== 'ready' || frame.hidden) return false;
    const liveRoot = frame.contentDocument?.querySelector(root.dataset.liveRoot || '#prototype');
    return Boolean(liveRoot
      && Math.abs(Number.parseFloat(frame.style.height) - liveRoot.getBoundingClientRect().height) < 3
      && getComputedStyle(frame).pointerEvents !== 'none');
  });
})()`, `${expectedCount} visible pooled board cards`);

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
  const landscapePath = "/models/?model=landscape-paper&section=reading-grammar&variant=18B&viewport=390";

  await navigate(client, landscapePath, 390);
  await waitForBoard(client, 4);
  await evaluate(client, `(() => {
    for (const card of document.querySelectorAll('.model-live-card')) {
      const frame = card.querySelector('iframe');
      frame.contentWindow.__boardMarker = card.dataset.objectId;
    }
  })()`);
  const mobileBoardMetrics = await evaluate(client, `(() => {
    const board = document.querySelector('#all-live-board');
    const cards = [...board.querySelectorAll('.model-live-card')];
    return {
      mode: board.dataset.viewMode,
      showAllHidden: document.querySelector('#show-all').hidden,
      objectTitle: document.querySelector('#model-object-title').textContent,
      oldControlsAbsent: !document.querySelector('#view-all') && !document.querySelector('#view-focus'),
      cardCount: cards.length,
      iframeCount: board.querySelectorAll('iframe').length,
      boardHorizontal: board.scrollWidth > board.clientWidth,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      cardInternalOverflow: cards.some((card) => {
        const surface = card.querySelector('.model-live-card__surface');
        return surface.scrollWidth > surface.clientWidth + 2;
      }),
      currentCount: cards.filter((card) => card.dataset.current === 'true').length,
      workbenchWidth: document.querySelector('.model-workbench-shell').getBoundingClientRect().width,
    };
  })()`);
  await capture(client, "landscape-390-live-board.png");

  await evaluate(client, `(() => {
    const select = document.querySelector('#viewport-select');
    select.value = '320';
    select.dispatchEvent(new Event('change'));
  })()`);
  await waitForBoard(client, 4);
  await evaluate(client, `(() => {
    const select = document.querySelector('#viewport-select');
    select.value = '390';
    select.dispatchEvent(new Event('change'));
  })()`);
  await waitForBoard(client, 4);
  const resizedState = await evaluate(client, `(() => [...document.querySelectorAll('.model-live-card')].every((card) => {
    const frame = card.querySelector('iframe');
    return frame.style.width === '390px' && frame.contentWindow.__boardMarker === card.dataset.objectId;
  }))()`);

  await evaluate(client, `(() => {
    const currentCard = document.querySelector('.model-live-card[data-current="true"]');
    window.__currentBoardFrame = currentCard.querySelector('iframe');
    currentCard.querySelector('.model-live-card__select').click();
  })()`);
  await waitForVisibleBoard(client, 1);
  const focusReuse = await evaluate(client, `(() => {
    const frame = document.querySelector('.model-live-card:not([hidden]) iframe');
    return document.querySelector('#all-live-board').dataset.viewMode === 'focus'
      && !document.querySelector('#show-all').hidden
      && document.querySelector('#model-object-title').textContent === '18B · Semantic Zoom'
      && frame === window.__currentBoardFrame
      && frame.contentWindow.__boardMarker === '18B';
  })()`);
  await evaluate(client, `document.querySelector('#show-all').click()`);
  await waitForVisibleBoard(client, 4);
  const allReuse = await evaluate(client, `document.querySelector('.model-live-card[data-current="true"] iframe') === window.__currentBoardFrame
    && document.querySelector('#show-all').hidden
    && document.querySelector('#model-object-title').textContent === '研究物件 · 4'`);

  await evaluate(client, `(() => {
    const select = document.querySelector('#object-select');
    select.value = '18';
    select.dispatchEvent(new Event('change'));
  })()`);
  await waitForVisibleBoard(client, 1);
  const selectionMetrics = await evaluate(client, `(() => ({
    boardVisible: !document.querySelector('#all-live-board').hidden,
    activeTitle: document.querySelector('#inspector-object-title').textContent,
    objectTitle: document.querySelector('#model-object-title').textContent,
    mode: document.querySelector('#all-live-board').dataset.viewMode,
    currentCount: document.querySelectorAll('.model-live-card[data-current="true"]').length,
    selectedValue: document.querySelector('#object-select').value,
  }))()`);
  cases.push({
    name: "landscape-390-wide-live-board",
    width: 390,
    height: 1000,
    metrics: { ...mobileBoardMetrics, resizedState, focusReuse, allReuse, ...selectionMetrics },
  });

  await navigate(client, landscapePath, 1440);
  await waitForBoard(client, 4);
  await evaluate(client, `(() => {
    const currentCard = document.querySelector('.model-live-card[data-current="true"]');
    window.__currentBoardFrame = currentCard.querySelector('iframe');
    window.__currentBoardFrame.contentWindow.__boardMarker = '18B';
    window.__parentBoardFrame = document.querySelector('.model-live-card[data-object-id="18"] iframe');
    window.__parentBoardFrame.contentWindow.__parentMarker = '18';
    currentCard.querySelector('.model-live-card__select').click();
  })()`);
  await waitForVisibleBoard(client, 1);
  await evaluate(client, `document.querySelector('#compare-parent').click()`);
  await waitForVisibleBoard(client, 2);
  const compareMetrics = await evaluate(client, `(() => {
    const board = document.querySelector('#all-live-board');
    const visibleCards = [...board.querySelectorAll('.model-live-card')].filter((card) => !card.hidden);
    const currentFrame = board.querySelector('.model-live-card[data-object-id="18B"] iframe');
    const parentFrame = board.querySelector('.model-live-card[data-object-id="18"] iframe');
    return {
      compareVisible: board.dataset.viewMode === 'compare',
      paneCount: visibleCards.length,
      currentReused: currentFrame === window.__currentBoardFrame
        && currentFrame.contentWindow.__boardMarker === '18B',
      parentReused: parentFrame === window.__parentBoardFrame
        && parentFrame.contentWindow.__parentMarker === '18',
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      inspectorBelow: document.querySelector('#inspector').getBoundingClientRect().top
        > board.getBoundingClientRect().bottom - 4,
      compareToggleAttribute: document.querySelector('#compare-parent').hasAttribute('aria-pressed'),
      showAllVisible: !document.querySelector('#show-all').hidden,
    };
  })()`);
  cases.push({ name: "landscape-1440-pooled-compare", width: 1440, height: 1000, metrics: compareMetrics });
  await capture(client, "landscape-1440-pooled-compare.png");

  await navigate(client, "/models/?model=complete-document&section=ledger-density&variant=05&viewport=390", 2048, 1100);
  await waitForBoard(client);
  const wideMetrics = await evaluate(client, `(() => {
    const shell = document.querySelector('.model-workbench-shell');
    const board = document.querySelector('#all-live-board');
    const cards = [...board.querySelectorAll('.model-live-card')];
    return {
      workbenchWidth: shell.getBoundingClientRect().width,
      viewportWidth: innerWidth,
      cardCount: cards.length,
      cardsShareRow: cards.every((card) => Math.abs(card.getBoundingClientRect().top - cards[0].getBoundingClientRect().top) < 3),
      cardInternalOverflow: cards.some((card) => {
        const surface = card.querySelector('.model-live-card__surface');
        return surface.scrollWidth > surface.clientWidth + 2;
      }),
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      boardOverflowOnly: board.scrollWidth >= board.clientWidth,
      inspectorBelow: document.querySelector('#inspector').getBoundingClientRect().top
        > board.getBoundingClientRect().bottom - 4,
      compactBar: document.querySelector('.model-object-bar').getBoundingClientRect().height < 80,
    };
  })()`);
  cases.push({ name: "complete-document-2048-wide-board", width: 2048, height: 1100, metrics: wideMetrics });
  await capture(client, "complete-document-2048-wide-board.png");

  const studyPath = "/models/?model=paper-field&section=semantic-information&variant=12A-S1&viewport=390&view=focus";
  await navigate(client, studyPath, 390);
  await waitForVisibleBoard(client, 1);
  const studyMetrics = await evaluate(client, `(() => {
    document.querySelector('[data-inspector-tab="relations"]').click();
    const relationVisible = !document.querySelector('#inspector-panel-relations').hidden;
    document.querySelector('[data-inspector-tab="records"]').click();
    const visibleCard = document.querySelector('.model-live-card:not([hidden])');
    return {
      compareHidden: document.querySelector('#compare-parent').hidden,
      showAllVisible: !document.querySelector('#show-all').hidden,
      focusVisible: document.querySelector('#all-live-board').dataset.viewMode === 'focus'
        && Boolean(visibleCard),
      liveReady: visibleCard.querySelector('.model-pooled-surface').dataset.liveState === 'ready',
      relationVisible,
      recordsVisible: !document.querySelector('#inspector-panel-records').hidden,
      sourceText: document.querySelector('#inspector-records').textContent.includes('研究工具'),
      inspectorTitle: document.querySelector('#inspector-object-title').textContent,
      method: document.querySelector('#difference-variable').textContent,
      cardTitle: visibleCard.querySelector('.model-live-card__select strong').textContent,
      cardMeta: visibleCard.querySelector('.model-live-card__meta').textContent,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  })()`);
  cases.push({ name: "paper-field-390-inspector-tabs", width: 390, height: 1000, metrics: studyMetrics });
  await capture(client, "paper-field-390-inspector-tabs.png");

  const taskStudyPath = "/models/?model=depth-projection&section=projection-lens&variant=25P-S1&viewport=390&view=focus";
  await navigate(client, taskStudyPath, 390);
  await waitForVisibleBoard(client, 1);
  const taskStudyMetrics = await evaluate(client, `(() => {
    const visibleCard = document.querySelector('.model-live-card:not([hidden])');
    return {
      inspectorTitle: document.querySelector('#inspector-object-title').textContent,
      method: document.querySelector('#difference-variable').textContent,
      subject: document.querySelector('#difference-before').textContent,
      boundary: document.querySelector('#difference-unchanged').textContent,
      cardMeta: visibleCard.querySelector('.model-live-card__meta').textContent,
    };
  })()`);
  cases.push({ name: "depth-390-task-study", width: 390, height: 1000, metrics: taskStudyMetrics });

  const failures = [];
  if (runtimeErrors.length) failures.push(`Runtime errors: ${runtimeErrors.join(" | ")}`);
  const mobile = cases.find((item) => item.name === "landscape-390-wide-live-board")?.metrics;
  if (!mobile || mobile.mode !== "focus" || mobile.cardCount !== 4 || mobile.iframeCount !== 4
    || !mobile.boardHorizontal || mobile.documentOverflow || mobile.cardInternalOverflow
    || mobile.currentCount !== 1 || !mobile.oldControlsAbsent
    || !mobile.resizedState || !mobile.focusReuse || !mobile.allReuse
    || !mobile.boardVisible || mobile.activeTitle !== "18 · Landscape Paper"
    || mobile.objectTitle !== "18 · Landscape Paper" || mobile.selectedValue !== "18") {
    failures.push("390px card-driven focus, pooling, and single-scroll contract failed.");
  }
  if (!compareMetrics.compareVisible || compareMetrics.paneCount !== 2
    || !compareMetrics.currentReused || !compareMetrics.parentReused
    || compareMetrics.documentOverflow || !compareMetrics.inspectorBelow
    || compareMetrics.compareToggleAttribute || !compareMetrics.showAllVisible) {
    failures.push("1440px pooled parent comparison contract failed.");
  }
  if (wideMetrics.workbenchWidth < 1600 || wideMetrics.viewportWidth !== 2048
    || wideMetrics.cardCount !== 4 || !wideMetrics.cardsShareRow
    || wideMetrics.cardInternalOverflow || wideMetrics.documentOverflow
    || !wideMetrics.boardOverflowOnly || !wideMetrics.inspectorBelow || !wideMetrics.compactBar) {
    failures.push("2048px wide workbench and compact object-bar contract failed.");
  }
  if (!studyMetrics.compareHidden || !studyMetrics.showAllVisible
    || !studyMetrics.focusVisible || !studyMetrics.liveReady
    || !studyMetrics.relationVisible || !studyMetrics.recordsVisible || !studyMetrics.sourceText
    || studyMetrics.inspectorTitle !== "12A-S1 · Blinded Reader Comparison"
    || studyMetrics.method !== "盲測比較"
    || studyMetrics.cardTitle !== "12A-S1 · Blinded Reader Comparison"
    || studyMetrics.cardMeta !== "盲測比較 · 12 / 12A"
    || studyMetrics.documentOverflow) {
    failures.push("12A-S1 identity and blinded-comparison presentation failed.");
  }
  if (taskStudyMetrics.inspectorTitle !== "25P-S1 · Unfamiliar-reader Study"
    || taskStudyMetrics.method !== "陌生讀者任務"
    || !taskStudyMetrics.subject.includes("25P") || taskStudyMetrics.subject.includes("25P-L1")
    || !taskStudyMetrics.boundary.includes("25P-L1")
    || taskStudyMetrics.cardMeta !== "陌生讀者任務 · 25P") {
    failures.push("25P-S1 task-study presentation incorrectly implies a blind comparison.");
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
  console.log("Model-page browser review: card-driven focus, compact preview sizing, pooled surfaces, comparison, and study boundaries verified.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
