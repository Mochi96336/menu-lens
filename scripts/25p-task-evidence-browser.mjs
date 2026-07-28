import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4173";
const outputDir = "research-history/review-assets/25p-task-evidence";
const studyPath = "studies/25p-task-evidence/";
const expectedFramePath = "/phases/25-menu-depth/projections.html";
const widths = [320, 390, 1280];
const failures = [];
const report = { viewports: {}, privacy: {}, reset: {} };

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

const fail = (message) => failures.push(message);

try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(`${baseUrl}/${studyPath}`, { waitUntil: "networkidle" });
    await page.locator(`[data-viewport="${width}"]`).click();

    const stageWidth = await page.locator("#frame-stage").evaluate((element) => element.getBoundingClientRect().width);
    if (Math.abs(stageWidth - width) > 0.6) fail(`${width}: iframe stage width mismatch (${stageWidth})`);

    const participantText = await page.locator("body").innerText();
    for (const leakedAnswer of ["紹興奶油蝦", "蒜酥椒鹽軟殼蟹", "宮保杏鮑菇"]) {
      if (participantText.includes(leakedAnswer)) fail(`${width}: answer leaked outside iframe (${leakedAnswer})`);
    }

    await page.locator("#start-task").click();
    await page.waitForFunction(() => document.querySelector("#prototype-frame")?.contentDocument?.querySelector("#projection-node-layer"));
    await page.waitForTimeout(200);

    const frame = page.frame({ url: new RegExp(`${expectedFramePath.replaceAll("/", "\\/")}$`) });
    if (!frame) {
      fail(`${width}: 25P iframe did not load`);
      await context.close();
      continue;
    }

    const frameState = await frame.evaluate(() => ({
      nodeCount: document.querySelectorAll(".projection-node").length,
      projectionCount: document.querySelectorAll("[data-projection]").length,
      activeProjection: document.querySelector("[data-projection][aria-pressed='true']")?.getAttribute("data-projection"),
      summary: document.querySelector("#projection-band-summary")?.textContent?.trim() ?? "",
      headerHidden: document.querySelector(".prototype-header")?.hidden ?? false,
      intentHidden: document.querySelector(".projection-intent")?.hidden ?? false,
      notesHidden: document.querySelector(".projection-notes")?.hidden ?? false,
      nodeIds: [...document.querySelectorAll(".projection-node")].map((node) => node.getAttribute("data-product-id")),
    }));

    if (frameState.nodeCount !== 30 || new Set(frameState.nodeIds).size !== 30) fail(`${width}: 25P identity contract failed`);
    if (frameState.projectionCount !== 3 || frameState.activeProjection !== "price-serving") fail(`${width}: default projection contract failed`);
    if (!frameState.summary) fail(`${width}: readable band summary missing`);
    if (!frameState.headerHidden || !frameState.intentHidden || !frameState.notesHidden) fail(`${width}: research chrome was not isolated`);

    await page.locator("#mark-first").click();
    await page.waitForTimeout(120);
    await page.locator("#mark-complete").click();
    await page.waitForTimeout(120);
    await page.locator("#end-task").click();

    const runnerState = await page.evaluate(() => ({
      studyState: globalThis.__menuLens25PTaskEvidence?.getState(),
      firstMarked: document.querySelector("#first-time")?.textContent !== "—",
      completeMarked: document.querySelector("#complete-time")?.textContent !== "—",
      debriefVisible: !document.querySelector("#debrief")?.hidden,
      status: document.querySelector("#session-status")?.textContent,
      localStorageKeys: Object.keys(localStorage),
      sessionStorageKeys: Object.keys(sessionStorage),
    }));

    if (!runnerState.firstMarked || !runnerState.completeMarked || !runnerState.debriefVisible) fail(`${width}: facilitator milestone flow failed`);
    if (runnerState.studyState?.running !== false) fail(`${width}: study clock did not stop`);
    if (runnerState.localStorageKeys.length || runnerState.sessionStorageKeys.length) fail(`${width}: study persisted browser storage`);
    if (errors.length) fail(`${width}: page errors: ${errors.join(" | ")}`);

    report.viewports[String(width)] = {
      stageWidth,
      framePath: new URL(frame.url()).pathname,
      nodeCount: frameState.nodeCount,
      uniqueProductCount: new Set(frameState.nodeIds).size,
      projectionCount: frameState.projectionCount,
      activeProjection: frameState.activeProjection,
      bandSummaryPresent: Boolean(frameState.summary),
      researchChromeHidden: frameState.headerHidden && frameState.intentHidden && frameState.notesHidden,
      milestoneFlowPassed: runnerState.firstMarked && runnerState.completeMarked && runnerState.debriefVisible,
      storageKeys: runnerState.localStorageKeys.length + runnerState.sessionStorageKeys.length,
      pageErrors: errors,
    };

    const cookies = await context.cookies();
    if (cookies.length) fail(`${width}: study created cookies`);
    report.privacy[String(width)] = { cookies: cookies.length, storageKeys: report.viewports[String(width)].storageKeys };
    await context.close();
  }

  const resetContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const resetPage = await resetContext.newPage();
  await resetPage.goto(`${baseUrl}/${studyPath}`, { waitUntil: "networkidle" });
  const resetState = await resetPage.evaluate(() => ({
    frameSrc: document.querySelector("#prototype-frame")?.getAttribute("src"),
    first: document.querySelector("#first-time")?.textContent,
    complete: document.querySelector("#complete-time")?.textContent,
    status: document.querySelector("#session-status")?.textContent,
    startDisabled: document.querySelector("#start-task")?.disabled,
  }));
  report.reset = resetState;
  if (resetState.frameSrc !== "about:blank" || resetState.first !== "—" || resetState.complete !== "—" || resetState.startDisabled) {
    fail("reload: ephemeral session state did not reset");
  }
  await resetContext.close();
} finally {
  await writeFile(`${outputDir}/browser-report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await browser.close();
}

if (failures.length) throw new Error(failures.join("; "));
console.log("25P task evidence browser checks passed.");
