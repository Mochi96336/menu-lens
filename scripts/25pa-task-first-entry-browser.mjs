import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:4173";
const prototypePath = "phases/25pa-task-first-entry/";
const outputDir = "research-history/review-assets/25pa-task-first-entry";
const screenshotDir = `${outputDir}/screenshots`;
const viewports = [
  { width: 320, height: 900 },
  { width: 390, height: 900 },
  { width: 1280, height: 1000 },
];
const forbiddenAnswers = ["紹興奶油蝦", "蒜酥椒鹽軟殼蟹", "宮保杏鮑菇", "季節時蔬豆腐煲"];
const failures = [];
const report = { scope: "real Chromium child page; implementation and layout evidence only", viewports: {}, checks: {} };

await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const fail = (message) => failures.push(message);
const within = (inner, outer, tolerance = 1) => inner.left >= outer.left - tolerance
  && inner.right <= outer.right + tolerance
  && inner.top >= outer.top - tolerance
  && inner.bottom <= outer.bottom + tolerance;

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseUrl}/${prototypePath}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll(".projection-node").length === 30);

    const initial = await page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height } : null;
      };
      const entry = document.querySelector("#task-first-entry");
      const workspace = document.querySelector("#task-first-workspace");
      const conditions = [...document.querySelectorAll(".task-first-condition")];
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        entryVisible: !entry?.hidden,
        workspaceHidden: Boolean(workspace?.hidden),
        phone: rect(".task-first-phone"),
        entry: rect("#task-first-entry"),
        action: rect("#enter-projection"),
        conditionOverflow: conditions.some((condition) => condition.scrollWidth > condition.clientWidth + 1),
        entryOverflow: entry ? entry.scrollHeight > entry.clientHeight + 1 : true,
        nodeCount: document.querySelectorAll(".projection-node").length,
        uniqueProductCount: new Set([...document.querySelectorAll(".projection-node")].map((node) => node.dataset.productId)).size,
        projectionCount: document.querySelectorAll("[data-projection]").length,
        activeProjection: document.querySelector("[data-projection][aria-pressed='true']")?.dataset.projection,
        entryText: entry?.innerText ?? "",
        taskState: globalThis.__menuLens25PA?.getState(),
        storageKeys: Object.keys(localStorage).length + Object.keys(sessionStorage).length,
      };
    });

    if (initial.documentWidth > initial.viewportWidth + 1) fail(`${viewport.width}: document overflows before entry`);
    if (!initial.entryVisible || !initial.workspaceHidden) fail(`${viewport.width}: task-first initial state failed`);
    if (!initial.phone || !initial.entry || !initial.action || !within(initial.entry, initial.phone) || !within(initial.action, initial.phone)) fail(`${viewport.width}: task entry is not contained by the phone`);
    if (initial.conditionOverflow) fail(`${viewport.width}: task condition row overflows`);
    if (initial.entryOverflow) fail(`${viewport.width}: task briefing requires internal scrolling`);
    if (initial.nodeCount !== 30 || initial.uniqueProductCount !== 30 || initial.projectionCount !== 3) fail(`${viewport.width}: inherited 25P identity failed`);
    if (initial.activeProjection !== "price-serving") fail(`${viewport.width}: task entry changed the default projection`);
    if (initial.taskState?.surface !== "briefing" || initial.taskState?.hasEntered !== false) fail(`${viewport.width}: bounded state reports wrong initial surface`);
    if (forbiddenAnswers.some((answer) => initial.entryText.includes(answer))) fail(`${viewport.width}: task entry leaks answer names`);
    if (initial.storageKeys) fail(`${viewport.width}: initial state persisted browser storage`);

    await page.screenshot({ path: `${screenshotDir}/${viewport.width}-entry.png`, fullPage: true });
    await page.locator("#enter-projection").click();
    await page.waitForFunction(() => !document.querySelector("#task-first-workspace")?.hidden);
    await page.waitForTimeout(100);

    const entered = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      entryHidden: Boolean(document.querySelector("#task-first-entry")?.hidden),
      workspaceVisible: !document.querySelector("#task-first-workspace")?.hidden,
      reminderVisible: document.querySelector("#show-task")?.getBoundingClientRect().width > 0,
      activeProjection: document.querySelector("[data-projection][aria-pressed='true']")?.dataset.projection,
      focusedProjection: document.activeElement?.getAttribute("data-projection"),
      nodeCount: document.querySelectorAll(".projection-node").length,
      taskState: globalThis.__menuLens25PA?.getState(),
    }));

    if (entered.documentWidth > entered.viewportWidth + 1) fail(`${viewport.width}: document overflows after entry`);
    if (!entered.entryHidden || !entered.workspaceVisible || !entered.reminderVisible) fail(`${viewport.width}: workspace entry transition failed`);
    if (entered.activeProjection !== "price-serving" || entered.focusedProjection !== "price-serving") fail(`${viewport.width}: entry did not preserve and focus the default projection`);
    if (entered.nodeCount !== 30 || entered.taskState?.surface !== "workspace") fail(`${viewport.width}: workspace identity or state failed`);

    await page.locator('[data-projection="price-preparation"]').click();
    await page.waitForTimeout(700);
    await page.locator(".projection-node").first().evaluate((node) => node.click());
    await page.waitForTimeout(100);
    const beforeRecall = await page.evaluate(() => ({
      activeProjection: document.querySelector("[data-projection][aria-pressed='true']")?.dataset.projection,
      selectedProducts: document.querySelectorAll(".projection-node[data-selected='true']").length,
      focusCardOpen: document.querySelector("#projection-focus-card")?.dataset.open,
    }));

    await page.locator("#show-task").click();
    await page.waitForFunction(() => !document.querySelector("#task-first-entry")?.hidden);
    const recalled = await page.evaluate(() => globalThis.__menuLens25PA?.getState());
    if (recalled?.surface !== "review" || recalled?.activeProjection !== beforeRecall.activeProjection || recalled?.selectedProducts !== beforeRecall.selectedProducts) {
      fail(`${viewport.width}: task recall did not preserve projection state`);
    }

    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#task-first-workspace")?.hidden);
    await page.waitForTimeout(100);
    const returned = await page.evaluate(() => ({
      activeProjection: document.querySelector("[data-projection][aria-pressed='true']")?.dataset.projection,
      selectedProducts: document.querySelectorAll(".projection-node[data-selected='true']").length,
      focusCardOpen: document.querySelector("#projection-focus-card")?.dataset.open,
      taskState: globalThis.__menuLens25PA?.getState(),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    }));

    if (returned.activeProjection !== "price-preparation" || returned.activeProjection !== beforeRecall.activeProjection) fail(`${viewport.width}: projection changed across task recall`);
    if (returned.selectedProducts !== beforeRecall.selectedProducts || returned.focusCardOpen !== beforeRecall.focusCardOpen) fail(`${viewport.width}: semantic-cell state changed across task recall`);
    if (returned.taskState?.surface !== "workspace") fail(`${viewport.width}: Escape did not return to workspace`);
    if (returned.documentWidth > returned.viewportWidth + 1) fail(`${viewport.width}: document overflows after task recall`);

    await page.screenshot({ path: `${screenshotDir}/${viewport.width}-workspace.png`, fullPage: true });
    const cookies = await context.cookies();
    if (cookies.length) fail(`${viewport.width}: 25PA created cookies`);
    if (errors.length) fail(`${viewport.width}: page errors: ${errors.join(" | ")}`);

    report.viewports[String(viewport.width)] = {
      viewport,
      initial: {
        noDocumentOverflow: initial.documentWidth <= initial.viewportWidth + 1,
        taskContained: Boolean(initial.phone && initial.entry && initial.action && within(initial.entry, initial.phone) && within(initial.action, initial.phone)),
        noConditionOverflow: !initial.conditionOverflow,
        noBriefingScroll: !initial.entryOverflow,
        workspaceHidden: initial.workspaceHidden,
        activeProjection: initial.activeProjection,
      },
      workspace: {
        noDocumentOverflow: entered.documentWidth <= entered.viewportWidth + 1,
        nodeCount: entered.nodeCount,
        activeProjectionAfterEntry: entered.activeProjection,
        reminderVisible: entered.reminderVisible,
      },
      recall: {
        projectionPreserved: returned.activeProjection === beforeRecall.activeProjection,
        semanticCellPreserved: returned.selectedProducts === beforeRecall.selectedProducts && returned.focusCardOpen === beforeRecall.focusCardOpen,
        escapeReturnsToWorkspace: returned.taskState?.surface === "workspace",
      },
      storageKeys: initial.storageKeys,
      cookies: cookies.length,
      pageErrors: errors,
    };
    await context.close();
  }
} finally {
  report.checks = {
    allViewportsNoOverflow: Object.values(report.viewports).every((entry) => entry.initial.noDocumentOverflow && entry.workspace.noDocumentOverflow),
    allTaskBriefingsContained: Object.values(report.viewports).every((entry) => entry.initial.taskContained && entry.initial.noConditionOverflow && entry.initial.noBriefingScroll),
    allParentIdentitiesRetained: Object.values(report.viewports).every((entry) => entry.workspace.nodeCount === 30 && entry.initial.activeProjection === "price-serving"),
    allRecallStatesPreserved: Object.values(report.viewports).every((entry) => entry.recall.projectionPreserved && entry.recall.semanticCellPreserved && entry.recall.escapeReturnsToWorkspace),
    noPersistenceOrPageErrors: Object.values(report.viewports).every((entry) => entry.storageKeys === 0 && entry.cookies === 0 && entry.pageErrors.length === 0),
  };
  await writeFile(`${outputDir}/browser-report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await browser.close();
}

if (failures.length) throw new Error(failures.join("; "));
console.log("25PA Task-first Entry browser checks passed.");
