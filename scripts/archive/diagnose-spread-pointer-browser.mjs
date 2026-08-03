import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const baseUrl = process.env.MODEL_PREVIEW_BASE_URL ?? "http://127.0.0.1:4173";
const debugPort = Number(process.env.MODEL_SPREAD_POINTER_DEBUG_PORT ?? 9451);
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
      // Try the next candidate.
    }
  }
  throw new Error("No Chrome or Chromium binary was found.");
};

const waitForHttp = async (url, attempts = 300) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not ready yet.
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
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? "Evaluation failed.");
  return response.result?.value;
};

const waitFor = async (client, expression, label, attempts = 300) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(client, expression)) return;
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

await waitForHttp(`${baseUrl}/models/`);
const browser = await findBrowser();
const processHandle = spawn(browser, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--remote-allow-origins=*",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/menu-lens-spread-pointer-${process.pid}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

try {
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const targetResponse = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent("about:blank")}`,
    { method: "PUT" },
  );
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
    width: 1720,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 1720,
    screenHeight: 1100,
  });

  const url = new URL(
    "/models/?model=horizontal-navigation&section=spread&variant=08&view=focus&viewport=320",
    baseUrl,
  );
  await client.send("Page.navigate", { url: url.href });
  await waitFor(client, `(() => {
    const root = [...document.querySelectorAll('.model-pooled-surface')]
      .find((candidate) => candidate.dataset.objectId === '08');
    const frame = root?.querySelector('iframe.model-live-frame');
    return root?.dataset.liveState === 'ready' && frame?.contentDocument?.readyState === 'complete';
  })()`, "spread live surface");

  const point = await evaluate(client, `(async () => {
    const root = [...document.querySelectorAll('.model-pooled-surface')]
      .find((candidate) => candidate.dataset.objectId === '08');
    root.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const frame = root.querySelector('iframe.model-live-frame');
    const frameDocument = frame.contentDocument;
    const button = frameDocument.querySelector('.spread-category__focus');
    frameDocument.documentElement.dataset.pointerEvents = '[]';
    const record = (event) => {
      const events = JSON.parse(frameDocument.documentElement.dataset.pointerEvents || '[]');
      events.push({
        type: event.type,
        target: event.target?.className ?? event.target?.tagName,
        currentTarget: event.currentTarget?.className ?? event.currentTarget?.tagName,
        button: event.button,
        buttons: event.buttons,
        defaultPrevented: event.defaultPrevented,
      });
      frameDocument.documentElement.dataset.pointerEvents = JSON.stringify(events);
    };
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      frameDocument.addEventListener(type, record, true);
      button.addEventListener(type, record, false);
    }
    const frameRect = frame.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const localX = buttonRect.left + buttonRect.width / 2;
    const localY = buttonRect.top + buttonRect.height / 2;
    const x = frameRect.left + frame.clientLeft + localX;
    const y = frameRect.top + frame.clientTop + localY;
    const innerHit = frameDocument.elementFromPoint(localX, localY);
    const outerHit = document.elementFromPoint(x, y);
    return {
      x,
      y,
      localX,
      localY,
      frameRect: { left: frameRect.left, top: frameRect.top, right: frameRect.right, bottom: frameRect.bottom },
      buttonRect: { left: buttonRect.left, top: buttonRect.top, width: buttonRect.width, height: buttonRect.height },
      innerHit: innerHit?.className ?? innerHit?.tagName ?? null,
      outerHit: outerHit?.className ?? outerHit?.tagName ?? null,
      outerHitIsFrame: outerHit === frame,
      beforeMode: frameDocument.querySelector('.spread-map')?.dataset.mode,
      beforePresentationState: root.dataset.livePresentationState,
    };
  })()`);

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    pointerType: "mouse",
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
    pointerType: "mouse",
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
    pointerType: "mouse",
  });
  await delay(500);

  const result = await evaluate(client, `(() => {
    const root = [...document.querySelectorAll('.model-pooled-surface')]
      .find((candidate) => candidate.dataset.objectId === '08');
    const frameDocument = root.querySelector('iframe.model-live-frame').contentDocument;
    return {
      mode: frameDocument.querySelector('.spread-map')?.dataset.mode,
      presentationState: root.dataset.livePresentationState,
      activeElement: frameDocument.activeElement?.className ?? frameDocument.activeElement?.tagName,
      events: JSON.parse(frameDocument.documentElement.dataset.pointerEvents || '[]'),
    };
  })()`);

  console.log(`Spread pointer diagnostic: ${JSON.stringify({ point, result }, null, 2)}`);
  socket.close();
} finally {
  processHandle.kill("SIGTERM");
}
