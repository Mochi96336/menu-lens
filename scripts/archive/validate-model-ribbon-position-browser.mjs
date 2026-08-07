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

const rootExpression = (objectId) => `
  [...document.querySelectorAll('.model-pooled-surface')]
    .find((candidate) => candidate.dataset.objectId === ${JSON.stringify(objectId)})
`;

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
  const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  const current = Math.max(0, Math.min(maximum, viewport.scrollLeft));
  const hit = doc.elementFromPoint(handleRect.left + handleRect.width / 2, handleRect.top + handleRect.height / 2);
  const unreachableProducts = products.flatMap((product, index) => {
    const rect = product.getBoundingClientRect();
    const contentLeft = rect.left - viewportRect.left + current;
    const required = Math.max(0, Math.min(maximum, contentLeft + rect.width / 2 - viewport.clientWidth / 2));
    const predictedLeft = contentLeft - required;
    const predictedRight = predictedLeft + rect.width;
    return predictedRight > 0 && predictedLeft < viewport.clientWidth ? [] : [index];
  });
  const first = products[0]?.getBoundingClientRect();
  const last = products.at(-1)?.getBoundingClientRect();
  const viewportStyle = view.getComputedStyle(viewport);
  const handleStyle = view.getComputedStyle(handle);
  return {
    scale: viewport.dataset.scale,
    current,
    maximum,
    totalWidth: viewport.scrollWidth,
    clientWidth: viewport.clientWidth,
    nativeEvidence: root.dataset.liveRibbonNativeScrollbar ?? null,
    pointerSettled: root.dataset.liveRibbonPointerSettled ?? null,
    handleLeftRatio: Number(root.dataset.liveRibbonHandleLeft),
    handleWidthRatio: Number(root.dataset.liveRibbonHandleWidth),
    nativeScrollbar: viewportStyle.scrollbarWidth,
    role: handle.getAttribute('role'),
    tabIndex: handle.tabIndex,
    handleAriaDisabled: handle.getAttribute('aria-disabled'),
    ariaNow: Number(handle.getAttribute('aria-valuenow')),
    handleAriaText: handle.getAttribute('aria-valuetext'),
    transition: handleStyle.transitionDuration,
    pointerEvents: handleStyle.pointerEvents,
    handleHittable: hit === handle || handle.contains(hit),
    handleRect: { left: handleRect.left, right: handleRect.right, width: handleRect.width },
    minimapRect: { left: minimapRect.left, right: minimapRect.right, width: minimapRect.width },
    productCount: products.length,
    unreachableProducts,
    firstVisible: Boolean(first && first.right > viewportRect.left && first.left < viewportRect.right),
    lastVisible: Boolean(last && last.right > viewportRect.left && last.left < viewportRect.right),
  };
})()`;

const assertSynced = (snapshot, label) => {
  assert.ok(snapshot, `${label}: missing Ribbon snapshot`);
  assert.equal(snapshot.role, "slider", `${label}: handle role`);
  assert.equal(snapshot.tabIndex, 0, `${label}: handle tabindex`);
  assert.equal(snapshot.handleAriaDisabled, "false", `${label}: operable handle marked disabled`);
  assert.ok(snapshot.ariaNow >= 0 && snapshot.ariaNow <= 100, `${label}: invalid ARIA value`);
  assert.ok(snapshot.handleAriaText?.length > 0, `${label}: missing ARIA value text`);
  assert.equal(snapshot.pointerEvents, "auto", `${label}: handle cannot receive pointer input`);
  assert.equal(snapshot.handleHittable, true, `${label}: handle is covered`);
  assert.equal(snapshot.productCount, 30, `${label}: Product count changed`);
  assert.deepEqual(snapshot.unreachableProducts, [], `${label}: unreachable Products`);
  const expectedLeft = snapshot.maximum > 0 ? snapshot.current / snapshot.totalWidth : 0;
  const expectedWidth = snapshot.maximum > 0 ? snapshot.clientWidth / snapshot.totalWidth : 1;
  assert.ok(Math.abs(snapshot.handleLeftRatio - expectedLeft) <= .002, `${label}: handle left drifted`);
  assert.ok(Math.abs(snapshot.handleWidthRatio - expectedWidth) <= .002, `${label}: handle width drifted`);
  assert.ok(snapshot.handleRect.left >= snapshot.minimapRect.left - 1, `${label}: handle starts outside minimap`);
  assert.ok(snapshot.handleRect.right <= snapshot.minimapRect.right + 1, `${label}: handle ends outside minimap`);
};

const topLevelPoint = async (client, objectId, selector) => {
  await evaluate(client, `(() => {
    const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
    frame.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  })()`);
  await nextPaint(client);
  await delay(40);
  return evaluate(client, `(() => {
    const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
    const frameRect = frame.getBoundingClientRect();
    const element = frame.contentDocument.querySelector(${JSON.stringify(selector)});
    const rect = element.getBoundingClientRect();
    return {
      x: frameRect.left + rect.left + rect.width / 2,
      y: frameRect.top + rect.top + rect.height / 2,
      left: frameRect.left + rect.left,
      right: frameRect.left + rect.right,
      width: rect.width,
    };
  })()`);
};

const dragHandleToRatio = async (client, objectId, ratio) => {
  const initialScale = await evaluate(client, `(() => {
    const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
    return frame.contentDocument.querySelector('#ribbon-viewport').dataset.scale;
  })()`);
  let handle = await topLevelPoint(client, objectId, ".ribbon-minimap__window");
  let minimap = await topLevelPoint(client, objectId, "#ribbon-minimap");
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: handle.x, y: handle.y });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed", x: handle.x, y: handle.y, button: "left", buttons: 1, clickCount: 1,
  });
  if (initialScale !== "reading") {
    await waitFor(client, `(() => {
      const root = ${rootExpression(objectId)};
      const frame = root.querySelector('iframe.model-live-frame');
      return frame.contentDocument.querySelector('#ribbon-viewport').dataset.scale === 'reading'
        && Number(root.dataset.liveRibbonMaxScroll) > 0;
    })()`, `${objectId} handle enters reading`);
    await delay(100);
    handle = await topLevelPoint(client, objectId, ".ribbon-minimap__window");
    minimap = await topLevelPoint(client, objectId, "#ribbon-minimap");
  }
  const travel = Math.max(0, minimap.width - handle.width);
  const targetX = minimap.left + handle.width / 2 + travel * ratio;
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved", x: targetX, y: handle.y, button: "left", buttons: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x: targetX, y: handle.y, button: "left", buttons: 0, clickCount: 1,
  });
  await waitFor(client, `(() => {
    const root = ${rootExpression(objectId)};
    const maximum = Number(root.dataset.liveRibbonMaxScroll);
    return maximum > 0
      && Math.abs(Number(root.dataset.liveRibbonScrollLeft) - maximum * ${ratio}) <= 20;
  })()`, `${objectId} handle ratio ${ratio}`);
  if (initialScale !== "reading") {
    await waitFor(
      client,
      `${rootExpression(objectId)}.dataset.liveRibbonPointerSettled === 'true'`,
      `${objectId} overview drag settles`,
    );
  }
  await nextPaint(client);
  await delay(100);
};

const dispatchKey = async (client, key, code, virtualKeyCode) => {
  await client.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown", key, code, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp", key, code, windowsVirtualKeyCode: virtualKeyCode, nativeVirtualKeyCode: virtualKeyCode,
  });
};

const focusSelector = (client, objectId, selector) => evaluate(client, `(() => {
  const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
  const element = frame.contentDocument.querySelector(${JSON.stringify(selector)});
  element.focus({ preventScroll: true });
  return frame.contentDocument.activeElement === element;
})()`);

const allProductsReachable = (client, objectId) => evaluate(client, `(() => {
  const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
  const doc = frame.contentDocument;
  const viewport = doc.querySelector('#ribbon-viewport');
  const failures = [];
  [...doc.querySelectorAll('.ribbon-product')].forEach((product, index) => {
    product.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' });
    const productRect = product.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    if (!(productRect.right > viewportRect.left && productRect.left < viewportRect.right)) failures.push(index);
  });
  return failures;
})()`);

const activateReturn = (client, objectId) => evaluate(client, `(() => {
  const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
  const button = frame.contentDocument.querySelector('#ribbon-overview');
  button.click();
  return true;
})()`);

const capture = async (client, filename) => {
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png", fromSurface: true, captureBeyondViewport: false,
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
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 960, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 960,
  });

  const results = [];
  for (const objectId of ["09", "09A"]) {
    for (const viewportName of ["320", "390", "desktop"]) {
      const params = new URLSearchParams({
        model: "horizontal-navigation", section: "ribbon", variant: objectId, viewport: viewportName, view: "focus",
      });
      const path = `/models/?${params}`;
      await client.send("Page.navigate", { url: `${baseUrl}${path}` });
      await waitFor(client, `(() => {
        const root = ${rootExpression(objectId)};
        const frame = root?.querySelector('iframe.model-live-frame');
        return root?.dataset.liveRibbonHandle === 'ready'
          && frame?.contentDocument?.querySelector('#model-ribbon-position-style');
      })()`, `${objectId}/${viewportName} ready`);
      await delay(120);

      const overview = await evaluate(client, snapshotExpression(objectId));
      assertSynced(overview, `${objectId}/${viewportName} overview`);
      assert.equal(overview.scale, "overview");
      assert.equal(overview.nativeEvidence, "inactive");
      assert.ok(overview.handleWidthRatio >= .99);

      await dragHandleToRatio(client, objectId, .25);
      const reading = await evaluate(client, snapshotExpression(objectId));
      assertSynced(reading, `${objectId}/${viewportName} reading`);
      assert.equal(reading.scale, "reading");
      assert.equal(reading.nativeEvidence, "hidden");
      assert.equal(reading.nativeScrollbar, "none");
      assert.ok(reading.handleWidthRatio < .5);
      assert.deepEqual(await allProductsReachable(client, objectId), []);
      await evaluate(client, `(() => {
        const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
        frame.contentDocument.querySelector('#ribbon-viewport')
          .scrollTo({ left: 0, behavior: 'auto' });
        return true;
      })()`);
      await nextPaint(client);
      await delay(160);
      assertSynced(
        await evaluate(client, snapshotExpression(objectId)),
        `${objectId}/${viewportName} reset after reachability sweep`,
      );
      await dragHandleToRatio(client, objectId, .373);
      const exact = await evaluate(client, snapshotExpression(objectId));
      assertSynced(exact, `${objectId}/${viewportName} exact ratio`);
      assert.ok(Math.abs(exact.current / exact.maximum - .373) < .003);

      await dragHandleToRatio(client, objectId, 1);
      const end = await evaluate(client, snapshotExpression(objectId));
      assertSynced(end, `${objectId}/${viewportName} end`);
      assert.ok(end.lastVisible);

      await dragHandleToRatio(client, objectId, 0);
      const start = await evaluate(client, snapshotExpression(objectId));
      assertSynced(start, `${objectId}/${viewportName} start`);
      assert.ok(start.firstVisible);

      if (objectId === "09" && viewportName === "390") {
        const viewportPoint = await topLevelPoint(client, objectId, "#ribbon-viewport");
        await client.send("Input.dispatchMouseEvent", {
          type: "mouseMoved", x: viewportPoint.x, y: viewportPoint.y,
        });
        await client.send("Input.dispatchMouseEvent", {
          type: "mouseWheel", x: viewportPoint.x, y: viewportPoint.y, deltaX: 520, deltaY: 0,
        });
        await waitFor(client, `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft) > 20`, "09/390 wheel");
        assertSynced(await evaluate(client, snapshotExpression(objectId)), "09/390 wheel");
        await delay(140);

        await dragHandleToRatio(client, objectId, 0);
        assert.equal(await focusSelector(client, objectId, "#ribbon-viewport"), true);
        await dispatchKey(client, "ArrowRight", "ArrowRight", 39);
        await waitFor(client, `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft) > 20`, "09/390 viewport key");
        assertSynced(await evaluate(client, snapshotExpression(objectId)), "09/390 viewport key");

        const minimapButton = await topLevelPoint(client, objectId, "#ribbon-minimap button:last-of-type");
        await client.send("Input.dispatchMouseEvent", {
          type: "mousePressed", x: minimapButton.x, y: minimapButton.y, button: "left", buttons: 1, clickCount: 1,
        });
        await client.send("Input.dispatchMouseEvent", {
          type: "mouseReleased", x: minimapButton.x, y: minimapButton.y, button: "left", buttons: 0, clickCount: 1,
        });
        await waitFor(
          client,
          `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft)
            > Number(${rootExpression(objectId)}.dataset.liveRibbonMaxScroll) * .55`,
          "09/390 minimap category",
        );
        assertSynced(await evaluate(client, snapshotExpression(objectId)), "09/390 minimap category");
        await capture(client, "model-ribbon-position-09-390-reading.png");
      }

      if (objectId === "09A" && viewportName === "390") {
        assert.equal(await focusSelector(client, objectId, ".ribbon-minimap__window"), true);
        await dispatchKey(client, "End", "End", 35);
        await waitFor(client, `(() => {
          const root = ${rootExpression(objectId)};
          return Number(root.dataset.liveRibbonScrollLeft) >= Number(root.dataset.liveRibbonMaxScroll) - 3;
        })()`, "09A/390 End");
        assertSynced(await evaluate(client, snapshotExpression(objectId)), "09A/390 End");
        await dispatchKey(client, "Home", "Home", 36);
        await waitFor(client, `Number(${rootExpression(objectId)}.dataset.liveRibbonScrollLeft) <= 3`, "09A/390 Home");
        assertSynced(await evaluate(client, snapshotExpression(objectId)), "09A/390 Home");
        await client.send("Emulation.setEmulatedMedia", {
          features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        await delay(100);
        const reduced = await evaluate(client, snapshotExpression(objectId));
        assert.ok(reduced.transition.split(",").every((value) => Number.parseFloat(value) === 0));
        await client.send("Emulation.setEmulatedMedia", { features: [] });
        await capture(client, "model-ribbon-position-09A-390-reading.png");
      }

      await activateReturn(client, objectId);
      await waitFor(client, `(() => {
        const root = ${rootExpression(objectId)};
        const frame = root.querySelector('iframe.model-live-frame');
        const viewport = frame.contentDocument.querySelector('#ribbon-viewport');
        return viewport.dataset.scale === 'overview'
          && Number(root.dataset.liveRibbonScrollLeft) <= 3
          && Number(root.dataset.liveRibbonHandleWidth) >= .99;
      })()`, `${objectId}/${viewportName} return overview`);
      const returned = await evaluate(client, snapshotExpression(objectId));
      assertSynced(returned, `${objectId}/${viewportName} returned`);
      assert.equal(returned.nativeEvidence, "inactive");

      results.push({ objectId, viewport: viewportName, path, overview, reading, exact, end, start, returned });
    }
  }

  await writeFile(
    new URL("model-ribbon-position-results.json", outputDir),
    `${JSON.stringify({ browser, baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  socket.close();
  console.log("Model Ribbon position browser review: 09 and 09A keep one real minimap handle synchronized after pointer drag, wheel, keyboard, minimap activation, reduced motion, and return across 320 / 390 / desktop, with all Products reachable and native scrollbar chrome hidden only in reading.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
