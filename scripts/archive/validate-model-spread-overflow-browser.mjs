import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = new URL("../../browser-review/", import.meta.url);
const debugPort = Number(process.env.MODEL_SPREAD_OVERFLOW_DEBUG_PORT ?? 9453);
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
  throw new Error("No Chrome or Chromium binary was found for Spread overflow review.");
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
    section: "spread",
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
  const map = doc?.querySelector('#spread-map');
  const focused = map?.querySelector('.spread-category[data-focused="true"]');
  const categories = [...(map?.querySelectorAll('.spread-category') ?? [])];
  const products = [...(focused?.querySelectorAll('.spread-product') ?? [])];
  const first = products[0]?.getBoundingClientRect();
  const last = products.at(-1)?.getBoundingClientRect();
  const mapStyle = map ? view.getComputedStyle(map) : null;
  const focusedStyle = focused ? view.getComputedStyle(focused) : null;
  const viewportHeight = doc?.documentElement.clientHeight ?? 0;
  const maxFrameScroll = Math.max(0, (doc?.documentElement.scrollHeight ?? 0) - viewportHeight);
  const verticallyScrollable = (element, style) => Boolean(
    element
    && element.scrollHeight > element.clientHeight + 1
    && !['visible', 'clip'].includes(style?.overflowY)
  );
  return {
    objectId: root?.dataset.objectId ?? null,
    state: root?.dataset.livePresentationState ?? null,
    verticalOwner: root?.dataset.liveSpreadVerticalOwner ?? null,
    nestedEvidence: root?.dataset.liveSpreadNestedVertical ?? null,
    landmarks: root?.dataset.liveSpreadLandmarks ?? null,
    frameScrollY: view?.scrollY ?? 0,
    maxFrameScroll,
    documentHeight: doc?.documentElement.scrollHeight ?? 0,
    viewportHeight,
    mapOverflowY: mapStyle?.overflowY ?? null,
    focusedOverflowY: focusedStyle?.overflowY ?? null,
    mapScrollableY: verticallyScrollable(map, mapStyle),
    focusedScrollableY: verticallyScrollable(focused, focusedStyle),
    mapScrollTop: map?.scrollTop ?? 0,
    focusedScrollTop: focused?.scrollTop ?? 0,
    categoryCount: categories.length,
    focusedIndex: categories.indexOf(focused),
    productCount: products.length,
    firstTop: first?.top ?? null,
    firstBottom: first?.bottom ?? null,
    lastTop: last?.top ?? null,
    lastBottom: last?.bottom ?? null,
  };
})()`;

const assertSingleVerticalOwner = (snapshot, label) => {
  assert.ok(snapshot, `${label}: missing Spread snapshot`);
  assert.equal(snapshot.state, "focus", `${label}: not in focus state`);
  assert.equal(snapshot.verticalOwner, "iframe", `${label}: wrong vertical owner evidence`);
  assert.equal(snapshot.nestedEvidence, "false", `${label}: nested vertical evidence`);
  assert.equal(snapshot.landmarks, "pinned", `${label}: category controls are not pinned`);
  assert.equal(snapshot.mapScrollableY, false, `${label}: Spread map owns vertical scrolling`);
  assert.equal(snapshot.focusedScrollableY, false, `${label}: focused category owns vertical scrolling`);
  assert.equal(snapshot.mapScrollTop, 0, `${label}: Spread map moved vertically`);
  assert.equal(snapshot.focusedScrollTop, 0, `${label}: focused category moved vertically`);
  assert.ok(snapshot.documentHeight >= snapshot.viewportHeight, `${label}: invalid iframe document height`);
  assert.equal(snapshot.categoryCount, 6, `${label}: category landmarks changed`);
  assert.ok(snapshot.productCount > 0, `${label}: focused Products missing`);
};

const navigateCase = async (client, objectId, viewport) => {
  const path = routePath(objectId, viewport);
  await client.send("Page.navigate", { url: `${baseUrl}${path}` });
  await waitFor(client, `(() => {
    const root = ${rootExpression(objectId)};
    const frame = root?.querySelector('iframe.model-live-frame');
    return document.readyState === 'complete'
      && root?.dataset.liveState === 'ready'
      && frame
      && !frame.hidden
      && frame.contentDocument?.readyState === 'complete'
      && Boolean(frame.contentDocument.querySelector('#model-spread-single-scroll-style'));
  })()`, `${objectId}/${viewport} Spread cleanup`);

  await evaluate(client, `(() => {
    const root = ${rootExpression(objectId)};
    const frame = root.querySelector('iframe.model-live-frame');
    frame.contentDocument.querySelector('.spread-category__focus').click();
  })()`);
  await waitFor(
    client,
    `${rootExpression(objectId)}?.dataset.livePresentationState === 'focus'
      && ${rootExpression(objectId)}?.dataset.liveSpreadVerticalOwner === 'iframe'
      && ${rootExpression(objectId)}?.dataset.liveSpreadLandmarks === 'pinned'`,
    `${objectId}/${viewport} focus state`,
  );
  await nextPaint(client);
  await delay(80);
  const snapshot = await evaluate(client, snapshotExpression(objectId));
  assertSingleVerticalOwner(snapshot, `${objectId}/${viewport}`);
  return { path, snapshot };
};

const scrollFrame = async (client, objectId, top) => {
  await evaluate(client, `(() => {
    const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
    const max = Math.max(0, frame.contentDocument.documentElement.scrollHeight
      - frame.contentDocument.documentElement.clientHeight);
    const target = ${JSON.stringify(top)} === 'max' ? max : ${JSON.stringify(top)};
    frame.contentWindow.scrollTo({ top: target, left: frame.contentWindow.scrollX, behavior: 'auto' });
  })()`);
  await nextPaint(client);
  await delay(60);
};

const pinnedControlExpression = (objectId, index = 1) => `(() => {
  const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
  const doc = frame.contentDocument;
  const toolbar = doc.querySelector('.spread-toolbar');
  const candidate = doc.querySelectorAll('.spread-category__focus')[${index}];
  const rect = candidate.getBoundingClientRect();
  const toolbarRect = toolbar.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + Math.min(rect.height / 2, 24);
  const hit = doc.elementFromPoint(centerX, centerY);
  return {
    position: getComputedStyle(candidate).position,
    top: rect.top,
    bottom: rect.bottom,
    toolbarBottom: toolbarRect.bottom,
    viewportHeight: doc.documentElement.clientHeight,
    hittable: hit === candidate || candidate.contains(hit),
  };
})()`;

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
  `--user-data-dir=/tmp/menu-lens-spread-overflow-${process.pid}`,
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
  if (!targetResponse.ok) throw new Error(`Could not create Spread target: ${targetResponse.status}`);
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
  for (const objectId of ["08", "08A"]) {
    for (const viewport of ["320", "390", "desktop"]) {
      const result = await navigateCase(client, objectId, viewport);

      await scrollFrame(client, objectId, "max");
      const bottom = await evaluate(client, snapshotExpression(objectId));
      assertSingleVerticalOwner(bottom, `${objectId}/${viewport} bottom`);
      if (bottom.maxFrameScroll > 0) {
        assert.ok(bottom.frameScrollY >= bottom.maxFrameScroll - 2, `${objectId}/${viewport}: iframe did not reach bottom`);
      }
      assert.ok(bottom.lastTop < bottom.viewportHeight, `${objectId}/${viewport}: last Product stayed below viewport`);
      assert.ok(bottom.lastBottom > 0, `${objectId}/${viewport}: last Product passed above viewport`);

      const pinned = await evaluate(client, pinnedControlExpression(objectId));
      assert.equal(pinned.position, "fixed", `${objectId}/${viewport}: category control is not fixed`);
      assert.ok(
        Math.abs(pinned.top - pinned.toolbarBottom) <= 2,
        `${objectId}/${viewport}: category control is not pinned below return`,
      );
      assert.ok(pinned.top >= -1 && pinned.top < pinned.viewportHeight, `${objectId}/${viewport}: category control left the viewport`);
      assert.equal(pinned.hittable, true, `${objectId}/${viewport}: category control is covered`);

      await evaluate(client, `(() => {
        const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
        frame.contentDocument.querySelectorAll('.spread-category__focus')[1].click();
      })()`);
      await waitFor(
        client,
        `(() => {
          const root = ${rootExpression(objectId)};
          const frame = root.querySelector('iframe.model-live-frame');
          return root.dataset.liveSpreadLandmarks === 'pinned'
            && [...frame.contentDocument.querySelectorAll('.spread-category')]
              .findIndex((category) => category.dataset.focused === 'true') === 1;
        })()`,
        `${objectId}/${viewport} pinned category activation`,
      );

      await scrollFrame(client, objectId, 0);
      const top = await evaluate(client, snapshotExpression(objectId));
      assertSingleVerticalOwner(top, `${objectId}/${viewport} top`);
      assert.ok(top.firstTop < top.viewportHeight, `${objectId}/${viewport}: first Product stayed below viewport`);
      assert.ok(top.firstBottom > 0, `${objectId}/${viewport}: first Product passed above viewport`);

      if (objectId === "08" && viewport === "390") {
        const beforeDetail = top.documentHeight;
        await evaluate(client, `(() => {
          const frame = ${rootExpression("08")}.querySelector('iframe.model-live-frame');
          frame.contentDocument.querySelector('.spread-category[data-focused="true"] .spread-product summary').click();
        })()`);
        await waitFor(
          client,
          `(() => {
            const frame = ${rootExpression("08")}.querySelector('iframe.model-live-frame');
            return frame.contentDocument.documentElement.scrollHeight > ${beforeDetail};
          })()`,
          "08/390 inline detail expands iframe document",
        );
        const expanded = await evaluate(client, snapshotExpression("08"));
        assertSingleVerticalOwner(expanded, "08/390 expanded detail");
        assert.ok(expanded.documentHeight > beforeDetail, "08/390 detail did not grow iframe document");
        await evaluate(client, `(() => {
          const frame = ${rootExpression("08")}.querySelector('iframe.model-live-frame');
          frame.contentDocument.querySelector('.spread-category[data-focused="true"] .spread-product[open] summary').click();
        })()`);
        await waitFor(
          client,
          `(() => {
            const frame = ${rootExpression("08")}.querySelector('iframe.model-live-frame');
            return Math.abs(frame.contentDocument.documentElement.scrollHeight - ${beforeDetail}) <= 2;
          })()`,
          "08/390 inline detail restores iframe document",
        );
        await capture(client, "model-spread-single-scroll-08-390-focus.png");
      }

      await evaluate(client, `(() => {
        const frame = ${rootExpression(objectId)}.querySelector('iframe.model-live-frame');
        frame.contentDocument.querySelector('#spread-overview').click();
      })()`);
      await waitFor(
        client,
        `${rootExpression(objectId)}?.dataset.livePresentationState === 'overview'`,
        `${objectId}/${viewport} return overview`,
      );

      results.push({
        objectId,
        viewport,
        path: result.path,
        initial: result.snapshot,
        bottom,
        top,
        pinned,
      });
    }
  }

  await writeFile(
    new URL("model-spread-overflow-results.json", outputDir),
    `${JSON.stringify({ browser, baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  socket.close();
  console.log("Model Spread overflow browser review: 08 and 08A keep one vertical owner, pinned real category controls, full Product reachability, detail growth, and return across 320 / 390 / desktop.");
} catch (error) {
  if (browserStderr.trim()) console.error(browserStderr.trim());
  throw error;
} finally {
  browserProcess.kill("SIGTERM");
}
