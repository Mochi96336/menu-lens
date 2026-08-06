import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_RIBBON_POSITION_DEBUG_PORT ?? 9454);
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
  throw new Error("No Chrome or Chromium binary was found for Ribbon position review.");
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

const setViewport = (client, width = 1440, height = 960) => client.send(
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

const routePath = (objectId, viewport) => {
  const params = new URLSearchParams({
    model: "horizontal-navigation",
    section: "ribbon",
    variant: objectId,
    viewport,
    view: "focus",
  });
  return `/models/?${params}`;
};

const snapshotExpression = (objectId) => `(() => {
  const root = ${rootExpression(objectId)};
  const frame = root?.querySelector('iframe.model-live-frame');
  const doc = frame?.contentDocument;
  const view = frame?.contentWindow;
  const viewport = doc?.querySelector('#ribbon-viewport');
  const minimap = doc?.querySelector('#ribbon-minimap');
  const handle = doc?.querySelector('.ribbon-minimap__window');
  const products = [...(doc?.querySelectorAll('.ribbon-product') ?? [])];
  if (!root || !frame || !doc || !view || !viewport || !minimap || !handle) return null;
  const viewportRect = viewport.getBoundingClientRect();
  const minimapRect = minimap.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  const totalWidth = Math.max(1, viewport.scrollWidth);
  const maximum = Math.max(0, totalWidth - viewport.clientWidth);
  const current = Math.max(0, Math.min(maximum, viewport.scrollLeft));
  const expectedWidthRatio = maximum > 0 ? viewport.clientWidth / totalWidth : 1;
  const expectedLeftRatio = maximum > 0 ? current / totalWidth : 0;
  const hit = doc.elementFromPoint(
    handleRect.left + handleRect.width / 2,
    handleRect.top + handleRect.height / 2,
  );
  const unreachableProducts = products.flatMap((product, index) => {
    const rect = product.getBoundingClientRect();
    const contentLeft = rect.left - viewportRect.left + current;
    const required = Math.max(0, Math.min(
      maximum,
      contentLeft + rect.width / 2 - viewport.clientWidth / 2,
    ));
    const predictedLeft = contentLeft - required;
    const predictedRight = predictedLeft + rect.width;
    return predictedRight > 0 && predictedLeft < viewport.clientWidth ? [] : [index];
  });
  const first = products[0]?.getBoundingClientRect();
  const last = products.at(-1)?.getBoundingClientRect();
  const style = view.getComputedStyle(viewport);
  const handleStyle = view.getComputedStyle(handle);
  return {
    objectId: root.dataset.objectId,
    scale: viewport.dataset.scale,
    current,
    maximum,
    totalWidth,
    clientWidth: viewport.clientWidth,
    handleState: root.dataset.liveRibbonHandle ?? null,
    nativeEvidence: root.dataset.liveRibbonNativeScrollbar ?? null,
    evidenceCurrent: Number(root.dataset.liveRibbonScrollLeft),
    evidenceMaximum: Number(root.dataset.liveRibbonMaxScroll),
    handleLeftRatio: Number(root.dataset.liveRibbonHandleLeft),
    handleWidthRatio: Number(root.dataset.liveRibbonHandleWidth),
    expectedLeftRatio,
    expectedWidthRatio,
    nativeScrollbar: style.scrollbarWidth,
    handleRole: handle.getAttribute('role'),
    handleTabIndex: handle.tabIndex,
    handleAriaDisabled: handle.getAttribute('aria-disabled'),
    handleAriaNow: Number(handle.getAttribute('aria-valuenow')),
    handleAriaText: handle.getAttribute('aria-valuetext'),
    handleTransition: handleStyle.transitionDuration,
    handlePointerEvents: handleStyle.pointerEvents,
    handleCursor: handleStyle.cursor,
    minimapLeft: minimapRect.left,
    minimapRight: minimapRect.right,
    minimapWidth: minimapRect.width,
    handleLeft: handleRect.left,
    handleRight: handleRect.right,
    handleWidth: handleRect.width,
    handleHittable: hit === handle || handle.contains(hit),
    productCount: products.length,
    unreachableProducts,
    firstVisible: Boolean(first && first.right > viewportRect.left && first.left < viewportRect.right),
    lastVisible: Boolean(last && last.right > viewportRect.left && last.left < viewportRect.right),
  };
})()`;

const assertSynced = (snapshot, label) => {
  assert.ok(snapshot, `${label}: missing Ribbon snapshot`);
  assert.equal(snapshot.handleState, "ready", `${label}: handle is not ready`);
  assert.equal(snapshot.nativeEvidence, "hidden", `${label}: native scrollbar evidence`);
  assert.equal(snapshot.handleRole, "slider", `${label}: handle role`);
  assert.equal(snapshot.handleTabIndex, 0, `${label}: handle is not keyboard focusable`);
  assert.equal(snapshot.handlePointerEvents, "auto", `${label}: handle cannot receive pointer input`);
  assert.equal(snapshot.handleHittable, true, `${label}: handle is covered`);
  assert.equal(snapshot.productCount, 30, `${label}: Product count changed`);
  assert.deepEqual(snapshot.unreachableProducts, [], `${label}: unreachable Products`);
  assert.ok(
    Math.abs(snapshot.evidenceCurrent - snapshot.current) <= 1,
    `${label}: current scroll evidence drifted`,
  );
  assert.ok(
    Math.abs(snapshot.evidenceMaximum - snapshot.maximum) <= 1,
    `${label}: maximum scroll evidence drifted`,
  );
  assert.ok(
    Math.abs(snapshot.handleLeftRatio - snapshot.expectedLeftRatio) <= .002,
    `${label}: handle left does not reflect scrollLeft`,
  );
  assert.ok(
    Math.abs(snapshot.handleWidthRatio - snapshot.expectedWidthRatio) <= .002,
    `${label}: handle width does not reflect viewport width`,
  );
  assert.ok(snapshot.handleLeft >= snapshot.minimapLeft - 1, `${label}: handle starts outside minimap`);
  assert.ok(snapshot.handleRight <= snapshot.minimapRight + 1, `${label}: handle ends outside minimap`);
};

const navigateCase = async (client, objectId, viewport) => {
  const path = routePath(objectId, viewport);
  await client.send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitFor(client, `(() => {
    const root = ${rootExpression(objectId)};
    const frame = root?.querySelector('iframe.model-live-frame');
    return document.readyState === 'complete'
      && root?.dataset.liveState === 'ready'
      && root?.dataset.liveRibbonHandle === 'ready'
      && frame
      && !frame.hidden
      && frame.contentDocument?.readyState === 'complete'
      && Boolean(frame.contentDocument.querySelector('#model-ribbon-position-style'));
  })()`, `${objectId}/${viewport} Ribbon handle`);
  await nextPaint(client);
  await delay(80);
  return { path, snapshot: await evaluate(client, snapshotExpression(objectId)) };
};

const topLevelPointExpression = (objectId, selector) => `(() => {
  const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
  frame.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const frameRect = frame.getBoundingClientRect();
  const element = frame.contentDocument.querySelector(${JSON.stringify(selector)});
  const rect = element.getBoundingClientRect();
  return {
    x: frameRect.left + rect.left + rect.width / 2,
    y: frameRect.top + rect.top + rect.height / 2,
    left: frameRect.left + rect.left,
    right: frameRect.left + rect.right,
    top: frameRect.top + rect.top,
    bottom: frameRect.top + rect.bottom,
    width: rect.width,
    height: rect.height,
  };
})()`;

const clickSelector = async (client, objectId, selector) => {
  const point = await evaluate(client, topLevelPointExpression(objectId, selector));
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
};

const dispatchKey = async (client, key, code, virtualKeyCode) => {
  await client.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key,
    code,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  });
};

const dragHandle = async (client, objectId, edge) => {
  const handlePoint = await evaluate(
    client,
    topLevelPointExpression(objectId, ".ribbon-minimap__window"),
  );
  const minimapPoint = await evaluate(client, topLevelPointExpression(objectId, "#ribbon-minimap"));
  const targetX = edge === "end" ? minimapPoint.right + 48 : minimapPoint.left - 48;
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: handlePoint.x,
    y: handlePoint.y,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: handlePoint.x,
    y: handlePoint.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: targetX,
    y: handlePoint.y,
    button: "left",
    buttons: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: targetX,
    y: handlePoint.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
  await waitFor(
    client,
    edge === "end"
      ? `(() => {
          const root = ${rootExpression(objectId)};
          return Number(root.dataset.liveRibbonMaxScroll) > 0
            && Number(root.dataset.liveRibbonScrollLeft) >= Number(root.dataset.liveRibbonMaxScroll) - 3;
        })()`
      : `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft) <= 3`,
    `${objectId} handle ${edge}`,
  );
  await nextPaint(client);
};

const focusSelector = (client, objectId, selector) => evaluate(client, `(() => {
  const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
  const element = frame.contentDocument.querySelector(${JSON.stringify(selector)});
  element.focus({ preventScroll: true });
  return frame.contentDocument.activeElement === element;
})()`);

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
  `--user-data-dir=/tmp/menu-lens-ribbon-position-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create Ribbon target: ${targetResponse.status}`);
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
  for (const objectId of ["09", "09A"]) {
    for (const viewportName of ["320", "390", "desktop"]) {
      const result = await navigateCase(client, objectId, viewportName);
      const overview = result.snapshot;
      assertSynced(overview, `${objectId}/${viewportName} overview`);
      assert.equal(overview.scale, "overview", `${objectId}/${viewportName}: initial scale`);
      assert.equal(overview.handleAriaDisabled, "true", `${objectId}/${viewportName}: overview handle state`);
      assert.ok(overview.handleWidthRatio >= .99, `${objectId}/${viewportName}: overview handle is not full width`);

      await clickSelector(client, objectId, "#ribbon-reading");
      await waitFor(
        client,
        `(() => {
          const root = ${rootExpression(objectId)};
          const frame = root.querySelector('iframe.model-live-frame');
          return frame.contentDocument.querySelector('#ribbon-viewport').dataset.scale === 'reading'
            && Number(root.dataset.liveRibbonMaxScroll) > 0;
        })()`,
        `${objectId}/${viewportName} reading scale`,
      );
      await nextPaint(client);
      let reading = await evaluate(client, snapshotExpression(objectId));
      assertSynced(reading, `${objectId}/${viewportName} reading`);
      assert.equal(reading.nativeScrollbar, "none", `${objectId}/${viewportName}: native scrollbar is visible`);
      assert.equal(reading.handleAriaDisabled, "false", `${objectId}/${viewportName}: reading handle state`);
      assert.ok(reading.handleWidthRatio < .5, `${objectId}/${viewportName}: handle does not show relative viewport width`);

      await dragHandle(client, objectId, "end");
      const end = await evaluate(client, snapshotExpression(objectId));
      assertSynced(end, `${objectId}/${viewportName} handle end`);
      assert.ok(end.lastVisible, `${objectId}/${viewportName}: last Product not visible at handle end`);

      await dragHandle(client, objectId, "start");
      const start = await evaluate(client, snapshotExpression(objectId));
      assertSynced(start, `${objectId}/${viewportName} handle start`);
      assert.ok(start.firstVisible, `${objectId}/${viewportName}: first Product not visible at handle start`);

      if (objectId === "09" && viewportName === "390") {
        const viewportPoint = await evaluate(client, topLevelPointExpression(objectId, "#ribbon-viewport"));
        await client.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: viewportPoint.x,
          y: viewportPoint.y,
        });
        await client.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x: viewportPoint.x,
          y: viewportPoint.y,
          deltaX: 520,
          deltaY: 0,
        });
        await waitFor(
          client,
          `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft) > 20`,
          "09/390 wheel synchronizes handle",
        );
        const wheel = await evaluate(client, snapshotExpression(objectId));
        assertSynced(wheel, "09/390 wheel");

        await dragHandle(client, objectId, "start");
        assert.equal(await focusSelector(client, objectId, "#ribbon-viewport"), true);
        await dispatchKey(client, "ArrowRight", "ArrowRight", 39);
        await waitFor(
          client,
          `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft) > 20`,
          "09/390 viewport keyboard synchronizes handle",
        );
        const viewportKeyboard = await evaluate(client, snapshotExpression(objectId));
        assertSynced(viewportKeyboard, "09/390 viewport keyboard");

        const lastMinimapButton = await evaluate(client, `(() => {
          const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
          const buttons = [...frame.contentDocument.querySelectorAll('#ribbon-minimap button')];
          const rect = buttons.at(-1).getBoundingClientRect();
          const frameRect = frame.getBoundingClientRect();
          return { x: frameRect.left + rect.left + rect.width / 2, y: frameRect.top + rect.top + rect.height / 2 };
        })()`);
        await client.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: lastMinimapButton.x,
          y: lastMinimapButton.y,
          button: "left",
          buttons: 1,
          clickCount: 1,
        });
        await client.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: lastMinimapButton.x,
          y: lastMinimapButton.y,
          button: "left",
          buttons: 0,
          clickCount: 1,
        });
        await waitFor(
          client,
          `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft)
            > Number(${rootExpression(objectId)}.dataset.liveRibbonMaxScroll) * .55`,
          "09/390 minimap category synchronizes handle",
        );
        const minimapClick = await evaluate(client, snapshotExpression(objectId));
        assertSynced(minimapClick, "09/390 minimap click");
      }

      if (objectId === "09A" && viewportName === "390") {
        assert.equal(await focusSelector(client, objectId, ".ribbon-minimap__window"), true);
        await dispatchKey(client, "End", "End", 35);
        await waitFor(
          client,
          `(() => {
            const root = ${rootExpression(objectId)};
            return Number(root.dataset.liveRibbonScrollLeft) >= Number(root.dataset.liveRibbonMaxScroll) - 3;
          })()`,
          "09A/390 handle End",
        );
        const keyEnd = await evaluate(client, snapshotExpression(objectId));
        assertSynced(keyEnd, "09A/390 handle End");
        await dispatchKey(client, "Home", "Home", 36);
        await waitFor(
          client,
          `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft) <= 3`,
          "09A/390 handle Home",
        );
        const keyHome = await evaluate(client, snapshotExpression(objectId));
        assertSynced(keyHome, "09A/390 handle Home");

        await client.send("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        await nextPaint(client);
        const reducedMotion = await evaluate(client, snapshotExpression(objectId));
        assert.ok(
          reducedMotion.handleTransition.split(",").every((value) => Number.parseFloat(value) === 0),
          `09A/390: reduced-motion handle still transitions: ${reducedMotion.handleTransition}`,
        );
        await client.send("Emulation.setEmulatedMedia", { features: [] });
        await capture(client, "model-ribbon-position-09A-390-reading.png");
      }

      await clickSelector(client, objectId, "#ribbon-overview");
      await waitFor(
        client,
        `(() => {
          const root = ${rootExpression(objectId)};
          const frame = root.querySelector('iframe.model-live-frame');
          return frame.contentDocument.querySelector('#ribbon-viewport').dataset.scale === 'overview'
            && Number(root.dataset.liveRibbonScrollLeft) <= 3
            && Number(root.dataset.liveRibbonHandleWidth) >= .99;
        })()`,
        `${objectId}/${viewportName} return overview`,
      );
      const returned = await evaluate(client, snapshotExpression(objectId));
      assertSynced(returned, `${objectId}/${viewportName} returned overview`);

      if (objectId === "09" && viewportName === "390") {
        await capture(client, "model-ribbon-position-09-390-overview.png");
      }

      results.push({
        objectId,
        viewport: viewportName,
        path: result.path,
        overview,
        reading,
        end,
        start,
        returned,
      });
    }
  }

  await writeFile(
    new URL("model-ribbon-position-results.json", outputDir),
    `${JSON.stringify({ browser, baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  socket.close();
  console.log("Model Ribbon position browser review: 09 and 09A use one real minimap handle synchronized after pointer drag, wheel, keyboard, minimap, and return across 320 / 390 / desktop, with all Products reachable and native scrollbar chrome hidden only after readiness.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
