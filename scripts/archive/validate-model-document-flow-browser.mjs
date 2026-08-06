import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_DOCUMENT_FLOW_DEBUG_PORT ?? 9452);
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
  throw new Error("No Chrome or Chromium binary was found for document-flow review.");
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

const setViewport = (client, width = 1280, height = 900) => client.send(
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

const rootExpression = (objectId) => `
  [...document.querySelectorAll('.model-pooled-surface')]
    .find((candidate) => candidate.dataset.objectId === ${JSON.stringify(objectId)})
`;

const snapshotExpression = (objectId) => `(() => {
  const root = ${rootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  const shell = root?.querySelector('.model-live-surface');
  const documentRoot = frame?.contentDocument;
  const target = documentRoot?.querySelector(root?.dataset.liveRoot || '#prototype');
  const frameRect = frame?.getBoundingClientRect();
  const targetRect = target?.getBoundingClientRect();
  if (!root || !frame || !shell || !documentRoot || !target) return null;
  return {
    objectId: root.dataset.objectId,
    layout: root.dataset.liveLayout ?? null,
    stageHeight: Number(root.dataset.liveStageHeight),
    naturalHeight: Number(root.dataset.liveNaturalHeight),
    documentContentHeight: Number(root.dataset.liveDocumentContentHeight),
    documentOverflow: root.dataset.liveDocumentOverflow ?? null,
    fixedContentHeight: Number(root.dataset.liveContentHeight),
    fixedOverflow: root.dataset.liveOverflow ?? null,
    frameHeight: frameRect.height,
    shellHeight: shell.getBoundingClientRect().height,
    targetHeight: Math.max(target.scrollHeight, Math.ceil(targetRect.height)),
    borderHeight: Math.max(0, frame.offsetHeight - frame.clientHeight),
    frameScrollY: frame.contentWindow.scrollY,
    parentScrollY: window.scrollY,
    scrolling: frame.getAttribute('scrolling'),
    rootOverflowY: getComputedStyle(documentRoot.documentElement).overflowY,
    bodyOverflowY: getComputedStyle(documentRoot.body).overflowY,
  };
})()`;

const assertDocumentSnapshot = (snapshot, label) => {
  assert.ok(snapshot, `${label}: missing snapshot`);
  assert.equal(snapshot.layout, "document", `${label}: wrong layout`);
  assert.equal(snapshot.scrolling, "no", `${label}: iframe scrolling attribute`);
  assert.equal(snapshot.documentOverflow, "false", `${label}: document overflow metadata`);
  assert.ok(snapshot.documentContentHeight > 0, `${label}: document content height`);
  assert.ok(
    Math.abs(
      snapshot.naturalHeight
        - (snapshot.documentContentHeight + snapshot.borderHeight)
    ) <= 1,
    `${label}: document content metadata does not reconstruct natural height`,
  );
  assert.ok(
    Math.abs(snapshot.naturalHeight - snapshot.frameHeight) <= 1,
    `${label}: natural/frame height mismatch`,
  );
  assert.ok(
    Math.abs(snapshot.naturalHeight - snapshot.shellHeight) <= 1,
    `${label}: natural/shell height mismatch`,
  );
  assert.ok(
    Number.isFinite(snapshot.frameScrollY) && snapshot.frameScrollY >= 0,
    `${label}: invalid iframe alignment origin`,
  );
  assert.ok(["hidden", "clip"].includes(snapshot.rootOverflowY), `${label}: root can scroll`);
  assert.ok(["hidden", "clip"].includes(snapshot.bodyOverflowY), `${label}: body can scroll`);
};

const stableDocumentSnapshot = async (client, objectId, label) => {
  let previousKey = null;
  let stableSamples = 0;
  let snapshot = null;
  for (let sample = 0; sample < 12; sample += 1) {
    await nextPaint(client);
    await delay(70);
    snapshot = await evaluate(client, snapshotExpression(objectId));
    assertDocumentSnapshot(snapshot, label);
    const key = JSON.stringify([
      snapshot.naturalHeight,
      snapshot.documentContentHeight,
      snapshot.frameHeight,
      snapshot.shellHeight,
      snapshot.targetHeight,
      snapshot.frameScrollY,
    ]);
    stableSamples = key === previousKey ? stableSamples + 1 : 0;
    if (stableSamples >= 2) return snapshot;
    previousKey = key;
  }
  throw new Error(`${label}: document metadata did not settle after browser layout and ResizeObserver work.`);
};

const navigateDocument = async (client, documentCase) => {
  const params = new URLSearchParams({
    model: documentCase.model,
    section: documentCase.section,
    variant: documentCase.objectId,
    viewport: documentCase.viewport,
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
      && Number(root?.dataset.liveDocumentContentHeight) > 0
      && frame
      && !frame.hidden;
  })()`, `${documentCase.objectId}/${documentCase.viewport} document flow`);
  return {
    path,
    snapshot: await stableDocumentSnapshot(
      client,
      documentCase.objectId,
      `${documentCase.objectId}/${documentCase.viewport}`,
    ),
  };
};

const prepareInputPoint = async (client, objectId) => {
  await evaluate(client, `(() => {
    const root = ${rootExpression(objectId)};
    window.scrollTo({
      top: root.getBoundingClientRect().top + window.scrollY,
      left: 0,
      behavior: 'auto',
    });
  })()`);
  await nextPaint(client);
  return evaluate(client, `(() => {
    const root = ${rootExpression(objectId)};
    const frame = root.querySelector('iframe.model-live-frame');
    const rect = frame.getBoundingClientRect();
    return {
      x: rect.left + Math.min(120, rect.width / 2),
      y: Math.min(innerHeight - 120, Math.max(160, rect.top + 220)),
      parentScrollY: window.scrollY,
      frameScrollY: frame.contentWindow.scrollY,
    };
  })()`);
};

const scrollStateExpression = (objectId) => `(() => {
  const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
  return { parentScrollY: window.scrollY, frameScrollY: frame.contentWindow.scrollY };
})()`;

const waitForOuterMovement = (client, objectId, before, frameBefore, minimum, label) => waitFor(
  client,
  `(() => {
    const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
    // The isolated target may have a stable non-zero alignment origin; the old
    // frame.contentWindow.scrollY === 0 assumption was too strict.
    return window.scrollY >= ${before + minimum}
      && Math.abs(frame.contentWindow.scrollY - ${frameBefore}) <= .5;
  })()`,
  label,
);

const focusIframeBody = (client, objectId) => evaluate(client, `(() => {
  const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
  const body = frame.contentDocument.body;
  body.tabIndex = -1;
  body.focus({ preventScroll: true });
  return document.activeElement === frame && frame.contentDocument.activeElement === body;
})()`);

const dispatchKey = async (client, key, code, virtualKeyCode, modifiers = 0) => {
  await client.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key,
    code,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
    modifiers,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
    modifiers,
  });
};

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
const browserProcess = spawn(browser, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/menu-lens-document-flow-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create document-flow target: ${targetResponse.status}`);
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

  const completeMenu = await navigateDocument(client, {
    model: "complete-document",
    section: "baseline",
    objectId: "01",
    viewport: "320",
  });
  results.push({ name: "01-320-metadata", ...completeMenu });

  let point = await prepareInputPoint(client, "01");
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x: point.x,
    y: point.y,
    deltaX: 0,
    deltaY: 420,
  });
  await waitForOuterMovement(
    client,
    "01",
    point.parentScrollY,
    point.frameScrollY,
    80,
    "wheel scroll reaches outer page",
  );
  results.push({
    name: "01-320-wheel",
    before: point,
    after: await evaluate(client, scrollStateExpression("01")),
  });

  const keyboardCases = [
    { key: "PageDown", code: "PageDown", virtualKeyCode: 34, minimum: 120 },
    { key: "ArrowDown", code: "ArrowDown", virtualKeyCode: 40, minimum: 20 },
    { key: " ", code: "Space", virtualKeyCode: 32, minimum: 120 },
  ];
  for (const keyboardCase of keyboardCases) {
    point = await prepareInputPoint(client, "01");
    assert.equal(await focusIframeBody(client, "01"), true, `${keyboardCase.code}: iframe body was not focused`);
    await dispatchKey(
      client,
      keyboardCase.key,
      keyboardCase.code,
      keyboardCase.virtualKeyCode,
    );
    await waitForOuterMovement(
      client,
      "01",
      point.parentScrollY,
      point.frameScrollY,
      keyboardCase.minimum,
      `${keyboardCase.code} scroll reaches outer page`,
    );
    results.push({
      name: `01-320-${keyboardCase.code}`,
      before: point,
      after: await evaluate(client, scrollStateExpression("01")),
    });
  }

  const atlas = await navigateDocument(client, {
    model: "horizontal-navigation",
    section: "market-baseline",
    objectId: "07",
    viewport: "390",
  });
  const atlasInitial = atlas.snapshot;
  await evaluate(client, `(() => {
    const frame = ${rootExpression("07")}.querySelector('iframe.model-live-frame');
    frame.contentDocument.querySelector('.atlas-product summary').click();
  })()`);
  await waitFor(
    client,
    `Number(${rootExpression("07")}.dataset.liveNaturalHeight) > ${atlasInitial.naturalHeight + 1}`,
    "07 inline detail expands natural height",
  );
  const atlasExpanded = await stableDocumentSnapshot(client, "07", "07/390 expanded");
  assert.ok(
    atlasExpanded.documentContentHeight > atlasInitial.documentContentHeight,
    "07 detail expansion did not increase document metadata.",
  );
  await evaluate(client, `(() => {
    const frame = ${rootExpression("07")}.querySelector('iframe.model-live-frame');
    frame.contentDocument.querySelector('.atlas-product summary').click();
  })()`);
  await waitFor(
    client,
    `Math.abs(Number(${rootExpression("07")}.dataset.liveNaturalHeight) - ${atlasInitial.naturalHeight}) <= 2`,
    "07 inline detail restores natural height",
  );
  const atlasCollapsed = await stableDocumentSnapshot(client, "07", "07/390 collapsed");
  assert.ok(
    Math.abs(atlasCollapsed.documentContentHeight - atlasInitial.documentContentHeight) <= 2,
    "07 detail collapse left stale document metadata.",
  );
  results.push({
    name: "07-390-detail-metadata",
    path: atlas.path,
    initial: atlasInitial,
    expanded: atlasExpanded,
    collapsed: atlasCollapsed,
  });

  point = await prepareInputPoint(client, "07");
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{
      id: 1,
      x: point.x,
      y: point.y + 130,
      radiusX: 1,
      radiusY: 1,
      force: 1,
    }],
  });
  for (const offset of [80, 30, -20, -70, -120]) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{
        id: 1,
        x: point.x,
        y: point.y + offset,
        radiusX: 1,
        radiusY: 1,
        force: 1,
      }],
    });
    await delay(35);
  }
  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await waitForOuterMovement(
    client,
    "07",
    point.parentScrollY,
    point.frameScrollY,
    40,
    "touch/pointer scroll reaches outer page",
  );
  results.push({
    name: "07-390-touch-pointer",
    before: point,
    after: await evaluate(client, scrollStateExpression("07")),
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: false, maxTouchPoints: 1 });

  for (const objectId of ["05", "05A", "05B", "05C"]) {
    const smoke = await navigateDocument(client, {
      model: "complete-document",
      section: "ledger-density",
      objectId,
      viewport: objectId === "05C" ? "390" : "320",
    });
    results.push({ name: `${objectId}-document-smoke`, ...smoke });
  }

  await capture(client, "model-document-input-forwarding.png");
  await writeFile(
    new URL("model-document-flow-results.json", outputDir),
    `${JSON.stringify({ browser, baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  socket.close();
  console.log("Model document-flow browser review: metadata settles and wheel, touch/pointer, PageDown, ArrowDown, and Space scroll only the outer page.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
