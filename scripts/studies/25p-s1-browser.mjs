import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4173";
const studyPath = "studies/25p-reader-task/";
const expectedFramePath = "/phases/25-menu-depth/projections.html";
const widths = [320, 390, 1280];
const failures = [];
const report = { viewports: {}, privacy: {}, reset: {} };

const fail = (message) => failures.push(message);
const browser = await chromium.launch({ headless: true });

try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 1100 } });
    const page = await context.newPage();
    const pageErrors = [];
    const unexpectedRequests = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      const method = request.method();
      if (["http:", "https:"].includes(url.protocol)
        && (url.origin !== baseUrl || !["GET", "HEAD"].includes(method))) {
        unexpectedRequests.push(`${method} ${request.url()}`);
      }
    });

    await page.goto(`${baseUrl}/${studyPath}?viewport=${width}&start=price-serving`, { waitUntil: "networkidle" });

    const participantText = await page.locator("body").innerText();
    for (const leakedAnswer of ["紹興奶油蝦", "蒜酥椒鹽軟殼蟹", "宮保杏鮑菇", "季節時蔬豆腐煲"]) {
      if (participantText.includes(leakedAnswer)) fail(`${width}: answer leaked into the participant runner (${leakedAnswer})`);
    }

    const initialState = await page.evaluate(() => ({
      studyState: document.querySelector("#study-grid")?.dataset.state,
      frameSrc: document.querySelector("#prototype-frame")?.getAttribute("src"),
      timer: document.querySelector("#timer")?.textContent,
      startDisabled: document.querySelector("#start-session")?.disabled,
      participantHidden: document.querySelector("#participant-stage")?.hidden,
      observerHidden: document.querySelector("#observer-panel")?.hidden,
    }));
    if (initialState.studyState !== "setup" || initialState.frameSrc !== null || initialState.startDisabled
      || initialState.participantHidden !== true || initialState.observerHidden !== true) {
      fail(`${width}: runner did not start in an ephemeral setup state`);
    }

    await page.locator("#start-session").click();
    await page.waitForFunction(() => document.querySelector("#study-grid")?.dataset.state === "active");
    await page.waitForFunction(() => document.querySelector("#prototype-frame")?.contentDocument?.querySelectorAll(".projection-node").length === 30);

    const frame = page.frames().find((candidate) => new URL(candidate.url()).pathname === expectedFramePath);
    if (!frame) {
      fail(`${width}: canonical 25P iframe did not load`);
      await context.close();
      continue;
    }

    const frameState = await frame.evaluate(() => ({
      nodeCount: document.querySelectorAll(".projection-node").length,
      nodeIds: [...document.querySelectorAll(".projection-node")].map((node) => node.getAttribute("data-product-id")),
      projectionCount: document.querySelectorAll("[data-projection]").length,
      activeProjection: document.querySelector("[data-projection][aria-pressed='true']")?.getAttribute("data-projection"),
      summary: document.querySelector("#projection-band-summary")?.textContent?.trim() ?? "",
      headerHidden: document.querySelector(".prototype-header")?.hidden ?? false,
      intentHidden: document.querySelector(".projection-intent")?.hidden ?? false,
      notesHidden: document.querySelector(".projection-notes")?.hidden ?? false,
    }));
    if (frameState.nodeCount !== 30 || new Set(frameState.nodeIds).size !== 30) fail(`${width}: Product identity contract failed`);
    if (frameState.projectionCount !== 3 || frameState.activeProjection !== "price-serving") fail(`${width}: assigned starting projection failed`);
    if (!frameState.summary) fail(`${width}: readable band summary missing`);
    if (!frameState.headerHidden || !frameState.intentHidden || !frameState.notesHidden) fail(`${width}: research chrome was not isolated`);

    const activeLayout = await page.evaluate(() => ({
      stageWidth: document.querySelector("#frame-stage")?.getBoundingClientRect().width,
      facilitatorDisplay: getComputedStyle(document.querySelector("#facilitator-panel")).display,
      participantHidden: document.querySelector("#participant-stage")?.hidden,
      state: document.querySelector("#study-grid")?.dataset.state,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (Math.abs(activeLayout.stageWidth - width) > 0.6) fail(`${width}: iframe stage width mismatch (${activeLayout.stageWidth})`);
    if (activeLayout.facilitatorDisplay !== "none" || activeLayout.participantHidden || activeLayout.state !== "active") {
      fail(`${width}: active-session layout contract failed`);
    }
    if (activeLayout.documentOverflow) fail(`${width}: active runner widened the document`);

    await frame.locator('[data-projection="price-preparation"]').click();
    await frame.waitForFunction(() => document.querySelector('[data-projection="price-preparation"]')?.getAttribute("aria-pressed") === "true");
    await frame.locator(".projection-node").first().click({ force: true });
    await page.locator("#finish-session").click();
    await page.waitForFunction(() => document.querySelector("#study-grid")?.dataset.state === "finished");

    const finishedState = await page.evaluate(() => ({
      observerVisible: !document.querySelector("#observer-panel")?.hidden,
      finishedVisible: !document.querySelector("#finished-stage")?.hidden,
      participantHidden: document.querySelector("#participant-stage")?.hidden,
      facilitatorDisplay: getComputedStyle(document.querySelector("#facilitator-panel")).display,
      totalTime: document.querySelector("#observer-time")?.textContent,
      projectionSequence: document.querySelector("#observer-projections")?.textContent,
      openedProducts: document.querySelector("#observer-products")?.textContent,
      localStorageKeys: Object.keys(localStorage),
      sessionStorageKeys: Object.keys(sessionStorage),
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    if (!finishedState.observerVisible || !finishedState.finishedVisible || !finishedState.participantHidden
      || finishedState.facilitatorDisplay === "none") fail(`${width}: finished-state restoration failed`);
    if (!finishedState.totalTime || !finishedState.projectionSequence?.includes("價格 × 時間")
      || !finishedState.openedProducts || finishedState.openedProducts === "none recorded") {
      fail(`${width}: in-memory trace was not exposed after completion`);
    }
    if (finishedState.localStorageKeys.length || finishedState.sessionStorageKeys.length) fail(`${width}: runner persisted browser storage`);
    if (finishedState.documentOverflow) fail(`${width}: finished runner widened the document`);
    if (pageErrors.length) fail(`${width}: page errors: ${pageErrors.join(" | ")}`);
    if (unexpectedRequests.length) fail(`${width}: unexpected network submission: ${unexpectedRequests.join(" | ")}`);

    const cookies = await context.cookies();
    if (cookies.length) fail(`${width}: runner created cookies`);

    report.viewports[String(width)] = {
      stageWidth: activeLayout.stageWidth,
      framePath: new URL(frame.url()).pathname,
      nodeCount: frameState.nodeCount,
      uniqueProductCount: new Set(frameState.nodeIds).size,
      projectionCount: frameState.projectionCount,
      activeProjection: frameState.activeProjection,
      bandSummaryPresent: Boolean(frameState.summary),
      researchChromeHidden: frameState.headerHidden && frameState.intentHidden && frameState.notesHidden,
      sessionFlowPassed: finishedState.observerVisible && finishedState.finishedVisible,
      projectionTracePresent: finishedState.projectionSequence?.includes("價格 × 時間") ?? false,
      productTracePresent: Boolean(finishedState.openedProducts && finishedState.openedProducts !== "none recorded"),
      storageKeys: finishedState.localStorageKeys.length + finishedState.sessionStorageKeys.length,
      cookies: cookies.length,
      unexpectedRequests,
      pageErrors,
    };
    report.privacy[String(width)] = {
      storageKeys: report.viewports[String(width)].storageKeys,
      cookies: cookies.length,
      unexpectedRequests: unexpectedRequests.length,
    };
    await context.close();
  }

  const resetContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const resetPage = await resetContext.newPage();
  await resetPage.goto(`${baseUrl}/${studyPath}?viewport=390&start=price-serving`, { waitUntil: "networkidle" });
  const resetState = await resetPage.evaluate(() => ({
    studyState: document.querySelector("#study-grid")?.dataset.state,
    frameSrc: document.querySelector("#prototype-frame")?.getAttribute("src"),
    timer: document.querySelector("#timer")?.textContent,
    startDisabled: document.querySelector("#start-session")?.disabled,
    waitingVisible: !document.querySelector("#waiting-stage")?.hidden,
    participantHidden: document.querySelector("#participant-stage")?.hidden,
    observerHidden: document.querySelector("#observer-panel")?.hidden,
    storageKeys: Object.keys(localStorage).length + Object.keys(sessionStorage).length,
  }));
  report.reset = resetState;
  if (resetState.studyState !== "setup" || resetState.frameSrc !== null || resetState.timer !== "00:00"
    || resetState.startDisabled || !resetState.waitingVisible || !resetState.participantHidden
    || !resetState.observerHidden || resetState.storageKeys !== 0) {
    fail("reload: canonical runner did not return to its ephemeral setup state");
  }
  const resetCookies = await resetContext.cookies();
  if (resetCookies.length) fail("reload: runner retained cookies");
  await resetContext.close();
} finally {
  await writeFile("/tmp/25p-s1-browser-report.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await browser.close();
}

if (failures.length) throw new Error(failures.join("; "));
console.log("25P-S1 browser checks passed.");
