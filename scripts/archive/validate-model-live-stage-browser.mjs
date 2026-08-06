import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_LIVE_STAGE_DEBUG_PORT ?? 9448);
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
  throw new Error("No Chrome or Chromium binary was found for model live-stage review.");
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

const setViewport = (client, width = 1720, height = 1100) => client.send(
  "Emulation.setDeviceMetricsOverride",
  {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: width,
    screenHeight: height,
  },
);

const models = [
  "complete-document",
  "horizontal-navigation",
  "paper-field",
  "landscape-paper",
  "multiscale-focus",
  "depth-projection",
];
const viewports = [
  { value: "320", expectedWidth: 320, expectedHeight: 568 },
  { value: "390", expectedWidth: 390, expectedHeight: 693 },
  { value: "desktop", expectedWidth: 1024, expectedHeight: 640 },
];
const documentCases = Object.freeze([
  Object.freeze({
    name: "complete-menu",
    objectId: "01",
    model: "complete-document",
    section: "baseline",
    viewports: ["320", "390", "desktop"],
  }),
  Object.freeze({
    name: "narrow-ledger",
    objectId: "05C",
    model: "complete-document",
    section: "ledger-density",
    viewports: ["320", "390"],
  }),
  Object.freeze({
    name: "horizontal-atlas",
    objectId: "07",
    model: "horizontal-navigation",
    section: "market-baseline",
    viewports: ["320", "390"],
    detailSelector: ".atlas-product summary",
  }),
]);

const rootExpression = (objectId) => `
  [...document.querySelectorAll('.model-pooled-surface')]
    .find((candidate) => candidate.dataset.objectId === ${JSON.stringify(objectId)})
`;

const snapshotExpression = (objectId) => `(() => {
  const root = ${rootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  const shell = root?.querySelector('.model-live-surface');
  const fallback = root?.querySelector('.model-live-fallback');
  const documentRoot = frame?.contentDocument;
  const target = documentRoot?.querySelector(root?.dataset.liveRoot || '#prototype');
  const frameRect = frame?.getBoundingClientRect();
  const shellRect = shell?.getBoundingClientRect();
  const targetRect = target?.getBoundingClientRect();
  const rootOverflowY = documentRoot ? getComputedStyle(documentRoot.documentElement).overflowY : null;
  const bodyOverflowY = documentRoot?.body ? getComputedStyle(documentRoot.body).overflowY : null;
  const overflowCanScroll = (value) => !['hidden', 'clip'].includes(value);
  return root && frame && shell ? {
    objectId: root.dataset.objectId,
    state: root.dataset.liveState,
    liveLayout: root.dataset.liveLayout ?? null,
    liveHeight: Number(root.dataset.liveHeight),
    stageHeight: Number(root.dataset.liveStageHeight),
    contentHeight: Number(root.dataset.liveContentHeight),
    naturalHeight: Number(root.dataset.liveNaturalHeight),
    overflow: root.dataset.liveOverflow === 'true',
    frameWidth: frameRect?.width ?? 0,
    frameHeight: frameRect?.height ?? 0,
    shellHeight: shellRect?.height ?? 0,
    targetHeight: targetRect?.height ?? 0,
    scrolling: frame.getAttribute('scrolling'),
    frameHidden: frame.hidden,
    fallbackHidden: fallback?.hidden ?? true,
    documentClass: Boolean(documentRoot?.documentElement.classList.contains('model-live-document')),
    rootOverflowY,
    bodyOverflowY,
    documentScrollable: Boolean(documentRoot)
      && documentRoot.documentElement.scrollHeight > frame.contentWindow.innerHeight + 1
      && overflowCanScroll(rootOverflowY)
      && overflowCanScroll(bodyOverflowY),
  } : null;
})()`;

const capture = async (client, filename) => {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, outputDir), Buffer.from(screenshot.data, "base64"));
};

const validateReadySurface = (surface, viewport) => {
  const failures = [];
  if (surface.state !== "ready") failures.push(`state ${surface.state} !== ready`);
  if (surface.frameHidden) failures.push("frame is hidden");
  if (!surface.fallbackHidden) failures.push("fallback is visible");
  if (Math.abs(surface.frameWidth - viewport.expectedWidth) > 1) {
    failures.push(`frame width ${surface.frameWidth} !== ${viewport.expectedWidth}`);
  }
  if (!Number.isFinite(surface.contentHeight) || surface.contentHeight <= 0) {
    failures.push(`invalid content height ${surface.contentHeight}`);
  }

  if (surface.liveLayout === "document") {
    if (surface.scrolling !== "no") failures.push(`document scrolling ${surface.scrolling} !== no`);
    if (!surface.documentClass) failures.push("document class is missing");
    if (surface.documentScrollable) failures.push("document iframe remains vertically scrollable");
    if (!["hidden", "clip"].includes(surface.rootOverflowY)) {
      failures.push(`document root overflow ${surface.rootOverflowY} is scrollable`);
    }
    if (!["hidden", "clip"].includes(surface.bodyOverflowY)) {
      failures.push(`document body overflow ${surface.bodyOverflowY} is scrollable`);
    }
    if (!Number.isFinite(surface.naturalHeight) || surface.naturalHeight <= 0) {
      failures.push(`invalid natural height ${surface.naturalHeight}`);
    }
    if (Math.abs(surface.frameHeight - surface.naturalHeight) > 1
      || Math.abs(surface.shellHeight - surface.naturalHeight) > 1
      || Math.abs(surface.liveHeight - surface.naturalHeight) > 1) {
      failures.push(`natural geometry disagrees: ${JSON.stringify(surface)}`);
    }
    if (surface.frameHeight + 2 < surface.targetHeight) {
      failures.push(`frame ${surface.frameHeight} clips target ${surface.targetHeight}`);
    }
  } else if (surface.liveLayout === "fixed") {
    if (surface.scrolling !== "auto") failures.push(`fixed scrolling ${surface.scrolling} !== auto`);
    if (surface.documentClass) failures.push("fixed surface keeps document class");
    if (Math.abs(surface.frameHeight - viewport.expectedHeight) > 1
      || Math.abs(surface.shellHeight - viewport.expectedHeight) > 1
      || Math.abs(surface.liveHeight - viewport.expectedHeight) > 1
      || Math.abs(surface.stageHeight - viewport.expectedHeight) > 1) {
      failures.push(`fixed geometry disagrees: ${JSON.stringify(surface)}`);
    }
    if (surface.overflow && !surface.documentScrollable) {
      failures.push("fixed overflow is not reachable through iframe scrolling");
    }
  } else {
    failures.push(`unknown live layout ${surface.liveLayout}`);
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
  `--user-data-dir=/tmp/menu-lens-live-stage-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create model live-stage target: ${targetResponse.status}`);
  const target = await targetResponse.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const client = new CdpClient(socket);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await setViewport(client);

  const results = [];
  const documentResults = [];
  const failures = [];
  let fixedOverflowSurfaceCount = 0;
  let fallbackSurfaceCount = 0;
  let naturalDocumentSurfaceCount = 0;

  for (const model of models) {
    for (const viewport of viewports) {
      const path = `/models/?model=${model}&viewport=${viewport.value}&view=all`;
      await client.send("Page.navigate", { url: `${baseUrl}${path}` });
      await waitFor(client, `(() => {
        const cards = [...document.querySelectorAll('#all-live-board .model-live-card:not([hidden])')];
        return document.readyState === 'complete'
          && cards.length > 0
          && cards.every((card) => {
            const root = card.querySelector('.model-pooled-surface');
            const frame = root?.querySelector('iframe.model-live-frame');
            const fallback = root?.querySelector('.model-live-fallback');
            if (root?.dataset.liveState === 'ready') {
              return Boolean(frame && !frame.hidden && root.dataset.liveLayout);
            }
            if (root?.dataset.liveState === 'fallback') return Boolean(fallback && !fallback.hidden);
            return false;
          });
      })()`, `${model} ${viewport.value} live stages`);
      await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
      await nextPaint(client);

      const metrics = await evaluate(client, `(() => {
        const cards = [...document.querySelectorAll('#all-live-board .model-live-card:not([hidden])')];
        return cards.map((card) => {
          const root = card.querySelector('.model-pooled-surface');
          const frame = root.querySelector('iframe.model-live-frame');
          const shell = root.querySelector('.model-live-surface');
          const fallback = root.querySelector('.model-live-fallback');
          if (root.dataset.liveState === 'fallback') {
            return {
              objectId: root.dataset.objectId ?? card.dataset.objectId,
              state: 'fallback',
              renderedHeight: Math.round(fallback.getBoundingClientRect().height),
              frameHidden: frame.hidden,
              fallbackHidden: fallback.hidden,
              liveHeight: Number(root.dataset.liveHeight),
              stageHeight: Number(root.dataset.liveStageHeight),
              contentHeight: root.dataset.liveContentHeight === undefined
                ? null
                : Number(root.dataset.liveContentHeight),
            };
          }
          const documentRoot = frame.contentDocument;
          const target = documentRoot.querySelector(root.dataset.liveRoot || '#prototype');
          const rootOverflowY = getComputedStyle(documentRoot.documentElement).overflowY;
          const bodyOverflowY = getComputedStyle(documentRoot.body).overflowY;
          const overflowCanScroll = (value) => !['hidden', 'clip'].includes(value);
          return {
            objectId: root.dataset.objectId ?? card.dataset.objectId,
            state: 'ready',
            liveLayout: root.dataset.liveLayout ?? null,
            liveHeight: Number(root.dataset.liveHeight),
            stageHeight: Number(root.dataset.liveStageHeight),
            contentHeight: Number(root.dataset.liveContentHeight),
            naturalHeight: Number(root.dataset.liveNaturalHeight),
            overflow: root.dataset.liveOverflow === 'true',
            frameWidth: frame.getBoundingClientRect().width,
            frameHeight: frame.getBoundingClientRect().height,
            shellHeight: shell.getBoundingClientRect().height,
            targetHeight: target?.getBoundingClientRect().height ?? 0,
            scrolling: frame.getAttribute('scrolling'),
            frameHidden: frame.hidden,
            fallbackHidden: fallback.hidden,
            documentClass: documentRoot.documentElement.classList.contains('model-live-document'),
            rootOverflowY,
            bodyOverflowY,
            documentScrollable: documentRoot.documentElement.scrollHeight > frame.contentWindow.innerHeight + 1
              && overflowCanScroll(rootOverflowY)
              && overflowCanScroll(bodyOverflowY),
          };
        });
      })()`);

      const caseFailures = [];
      for (const surface of metrics) {
        if (surface.state === "fallback") {
          fallbackSurfaceCount += 1;
          if (surface.renderedHeight !== viewport.expectedHeight
            || surface.liveHeight !== viewport.expectedHeight
            || surface.stageHeight !== viewport.expectedHeight
            || !surface.frameHidden
            || surface.fallbackHidden
            || surface.contentHeight !== null) {
            caseFailures.push(`fallback ${surface.objectId}: ${JSON.stringify(surface)}`);
          }
          continue;
        }
        const surfaceFailures = validateReadySurface(surface, viewport);
        caseFailures.push(...surfaceFailures.map((failure) => `${surface.objectId}: ${failure}`));
        if (surface.liveLayout === "document") naturalDocumentSurfaceCount += 1;
        if (surface.liveLayout === "fixed" && surface.overflow) fixedOverflowSurfaceCount += 1;
      }
      results.push({ path, expectedHeight: viewport.expectedHeight, surfaces: metrics, failures: caseFailures });
      failures.push(...caseFailures.map((failure) => `${model}/${viewport.value}: ${failure}`));
    }
  }

  for (const documentCase of documentCases) {
    for (const viewportValue of documentCase.viewports) {
      const viewport = viewports.find(({ value }) => value === viewportValue);
      const params = new URLSearchParams({
        model: documentCase.model,
        section: documentCase.section,
        variant: documentCase.objectId,
        viewport: viewportValue,
        view: "focus",
      });
      const path = `/models/?${params}`;
      await client.send("Page.navigate", { url: `${baseUrl}${path}` });
      await waitFor(client, `(() => {
        const root = ${rootExpression(documentCase.objectId)};
        const frame = root?.querySelector('iframe.model-live-frame');
        return document.readyState === 'complete'
          && root?.dataset.liveState === 'ready'
          && root?.dataset.liveLayout === 'document'
          && Number(root.dataset.liveNaturalHeight) > 0
          && frame
          && !frame.hidden
          && frame.contentDocument?.documentElement.classList.contains('model-live-document');
      })()`, `${documentCase.objectId} ${viewportValue} document-natural-flow`);
      await nextPaint(client);

      const before = await evaluate(client, snapshotExpression(documentCase.objectId));
      const caseFailures = validateReadySurface(before, viewport);
      if (before.frameHeight <= before.stageHeight) {
        caseFailures.push(`natural frame ${before.frameHeight} should exceed fixed stage ${before.stageHeight}`);
      }

      let expanded = null;
      let collapsed = null;
      if (documentCase.detailSelector) {
        const clicked = await evaluate(client, `(() => {
          const root = ${rootExpression(documentCase.objectId)};
          const frame = root?.querySelector('iframe.model-live-frame');
          const control = frame?.contentDocument?.querySelector(${JSON.stringify(documentCase.detailSelector)});
          if (!control) return false;
          control.click();
          return true;
        })()`);
        if (!clicked) {
          caseFailures.push(`could not click ${documentCase.detailSelector}`);
        } else {
          await waitFor(client, `(() => {
            const root = ${rootExpression(documentCase.objectId)};
            return Number(root?.dataset.liveNaturalHeight) > ${before.naturalHeight + 1};
          })()`, `${documentCase.objectId} expanded natural height`);
          await nextPaint(client);
          expanded = await evaluate(client, snapshotExpression(documentCase.objectId));
          caseFailures.push(...validateReadySurface(expanded, viewport).map((failure) => `expanded: ${failure}`));
          if (expanded.naturalHeight <= before.naturalHeight) {
            caseFailures.push(`expanded height ${expanded.naturalHeight} did not exceed ${before.naturalHeight}`);
          }

          await evaluate(client, `(() => {
            const root = ${rootExpression(documentCase.objectId)};
            const frame = root?.querySelector('iframe.model-live-frame');
            frame?.contentDocument?.querySelector(${JSON.stringify(documentCase.detailSelector)})?.click();
          })()`);
          await waitFor(client, `(() => {
            const root = ${rootExpression(documentCase.objectId)};
            return Math.abs(Number(root?.dataset.liveNaturalHeight) - ${before.naturalHeight}) <= 2;
          })()`, `${documentCase.objectId} collapsed natural height`);
          await nextPaint(client);
          collapsed = await evaluate(client, snapshotExpression(documentCase.objectId));
          caseFailures.push(...validateReadySurface(collapsed, viewport).map((failure) => `collapsed: ${failure}`));
        }
      }

      await evaluate(client, `(() => {
        const root = ${rootExpression(documentCase.objectId)};
        root?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
      })()`);
      await nextPaint(client);
      const screenshot = `model-document-${documentCase.name}-${viewportValue}.png`;
      await capture(client, screenshot);
      documentResults.push({
        ...documentCase,
        viewport: viewportValue,
        path,
        before,
        expanded,
        collapsed,
        screenshot,
        failures: caseFailures,
      });
      failures.push(...caseFailures.map((failure) => `${documentCase.objectId}/${viewportValue}: ${failure}`));
    }
  }

  if (fixedOverflowSurfaceCount === 0) {
    failures.push("No fixed model surface exceeded its stage, so internal scrolling was not exercised.");
  }
  if (fallbackSurfaceCount === 0) {
    failures.push("No entrypoint-free model object exercised the fixed fallback stage.");
  }
  if (naturalDocumentSurfaceCount === 0) {
    failures.push("No natural-height document surface was observed in all-object coverage.");
  }

  const report = {
    browser,
    baseUrl,
    generatedAt: new Date().toISOString(),
    fixedOverflowSurfaceCount,
    fallbackSurfaceCount,
    naturalDocumentSurfaceCount,
    cases: results,
    documentCases: documentResults,
    failures,
  };
  await writeFile(
    new URL("model-live-stage-results.json", outputDir),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  if (failures.length) {
    throw new Error(`Model live-stage browser review failed:\n- ${failures.join("\n- ")}`);
  }
  socket.close();
  console.log("Model live-stage browser review: spatial models keep fixed stages while document models use natural outer-page flow.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
