from pathlib import Path


def replace_exact(path, old, new):
    file_path = Path(path)
    text = file_path.read_text()
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:80]!r}")
    file_path.write_text(text.replace(old, new, 1))


replace_exact(
    "research-history/model-page.css",
    '''.model-section-tabs,
.model-variant-list {
  display: grid;
  border-top: 1px solid var(--line);
}

.model-section-tabs button,
.model-variant-list button {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  text-align: left;
  cursor: pointer;
}

.model-section-tabs button {
  position: relative;
  padding: .78rem .7rem .78rem 1rem;
  border-left: 3px solid transparent;
  font-family: "Noto Serif TC", "PMingLiU", Georgia, serif;
  font-size: .96rem;
  font-weight: 700;
}

.model-section-tabs button[aria-selected="true"] {
  border-left-color: var(--accent);
  background: var(--surface-strong);
  color: var(--ink);
}
''',
    '''.model-variant-list {
  display: grid;
  border-top: 1px solid var(--line);
}

.model-variant-list button {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  text-align: left;
  cursor: pointer;
}
''',
)

replace_exact(
    "research-history/model-page.css",
    '''  .model-section-tabs,
  .model-variant-list {
    display: flex;
    gap: .45rem;
    overflow-x: auto;
    border-top: 0;
    padding: .1rem 0 .55rem;
    scrollbar-width: thin;
  }

  .model-section-tabs button,
  .model-variant-list button {
    flex: 0 0 auto;
    width: auto;
    min-height: 2.5rem;
    border: 1px solid var(--line-strong);
    white-space: nowrap;
  }

  .model-section-tabs button {
    padding: .55rem .75rem;
    border-left-width: 1px;
    font-family: inherit;
    font-size: .78rem;
  }

  .model-section-tabs button[aria-selected="true"] {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--surface-strong);
  }

  .model-variant-list button {
    display: block;
    padding: .5rem .7rem;
  }
''',
    '''  .model-variant-list {
    display: flex;
    gap: .45rem;
    overflow-x: auto;
    border-top: 0;
    padding: .1rem 0 .55rem;
    scrollbar-width: thin;
  }

  .model-variant-list button {
    display: block;
    flex: 0 0 auto;
    width: auto;
    min-height: 2.5rem;
    padding: .5rem .7rem;
    border: 1px solid var(--line-strong);
    white-space: nowrap;
  }
''',
)

replace_exact(
    "research-history/model-page-workbench.css",
    '''.model-section-tabs {
  display: flex;
  min-width: 0;
  gap: .35rem;
  overflow-x: auto;
  padding-bottom: .1rem;
  scrollbar-width: none;
}
''',
    '''.model-section-tabs {
  --section-tab-fade: 1rem;
  display: flex;
  min-width: 0;
  gap: .35rem;
  overflow-x: auto;
  padding-bottom: .1rem;
  overscroll-behavior-inline: contain;
  scroll-padding-inline: .75rem;
  scrollbar-width: none;
}

.model-section-tabs[data-overflow-start="true"][data-overflow-end="true"] {
  -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--section-tab-fade), #000 calc(100% - var(--section-tab-fade)), transparent);
  mask-image: linear-gradient(to right, transparent, #000 var(--section-tab-fade), #000 calc(100% - var(--section-tab-fade)), transparent);
}

.model-section-tabs[data-overflow-start="true"][data-overflow-end="false"] {
  -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--section-tab-fade));
  mask-image: linear-gradient(to right, transparent, #000 var(--section-tab-fade));
}

.model-section-tabs[data-overflow-start="false"][data-overflow-end="true"] {
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - var(--section-tab-fade)), transparent);
  mask-image: linear-gradient(to right, #000 calc(100% - var(--section-tab-fade)), transparent);
}
''',
)

replace_exact(
    "research-history/model-page-workbench.css",
    '''.model-section-tabs button {
  width: auto;
  flex: 0 0 auto;
  padding: .55rem .75rem;
  white-space: nowrap;
  font-family: "Noto Serif TC", "PMingLiU", Georgia, serif;
}
''',
    '''.model-section-tabs button {
  width: auto;
  min-height: 2.65rem;
  flex: 0 0 auto;
  padding: .55rem .75rem;
  scroll-margin-inline: .75rem;
  white-space: nowrap;
  font-family: "Noto Serif TC", "PMingLiU", Georgia, serif;
  font-size: .9rem;
  font-weight: 600;
  text-align: left;
}

.model-section-tabs button:hover {
  background: var(--surface);
}

.model-section-tabs button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
''',
)

replace_exact(
    "research-history/model-page-workbench.css",
    '''.model-section-tabs button[aria-selected="true"] {
  border-color: transparent transparent var(--accent);
  background: transparent;
  color: var(--ink);
}
''',
    '''.model-section-tabs button[aria-selected="true"] {
  border-color: transparent;
  background: transparent;
  box-shadow: inset 0 -2px 0 var(--accent);
  color: var(--ink);
  font-weight: 700;
}
''',
)

replace_exact(
    "research-history/model-page-workbench.css",
    '''@media (max-width: 700px) {
  .model-workbench-shell {
''',
    '''@media (max-width: 700px) {
  .model-section-tabs button {
    min-height: 2.5rem;
    padding: .5rem .65rem;
    font-size: .78rem;
  }

  .model-workbench-shell {
''',
)

replace_exact(
    "research-history/model-page.mjs",
    '''const sectionTabLabel = (section) => shortSectionLabels[section.id] ?? section.title;

const revealSelectedSectionTab = (button) => {
  if (!button) return;
  const reveal = () => {
    const container = elements.sectionTabs;
    const tabStart = button.offsetLeft;
    const tabEnd = tabStart + button.offsetWidth;
    const visibleStart = Number(container.scrollLeft) || 0;
    const visibleEnd = visibleStart + container.clientWidth;
    if (tabStart < visibleStart) container.scrollLeft = tabStart;
    else if (tabEnd > visibleEnd) container.scrollLeft = tabEnd - container.clientWidth;
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(reveal);
  else reveal();
};
''',
    '''const sectionTabLabel = (section) => shortSectionLabels[section.id] ?? section.title;

const syncSectionTabOverflow = () => {
  const container = elements.sectionTabs;
  const viewportWidth = Number(container.clientWidth) || 0;
  const contentWidth = Number(container.scrollWidth) || 0;
  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  const scrollLeft = Math.min(maxScroll, Math.max(0, Number(container.scrollLeft) || 0));
  container.dataset.overflowStart = String(scrollLeft > 1);
  container.dataset.overflowEnd = String(scrollLeft < maxScroll - 1);
};

const revealSelectedSectionTab = (button) => {
  if (!button) return;
  const reveal = () => {
    const container = elements.sectionTabs;
    const viewportWidth = Number(container.clientWidth) || 0;
    const maxScroll = Math.max(0, (Number(container.scrollWidth) || 0) - viewportWidth);
    const edgeInset = 12;
    const tabStart = button.offsetLeft;
    const tabEnd = tabStart + button.offsetWidth;
    const visibleStart = Number(container.scrollLeft) || 0;
    const visibleEnd = visibleStart + viewportWidth;
    let target = visibleStart;
    if (tabStart < visibleStart + edgeInset) target = tabStart - edgeInset;
    else if (tabEnd > visibleEnd - edgeInset) target = tabEnd - viewportWidth + edgeInset;
    container.scrollLeft = Math.min(maxScroll, Math.max(0, target));
    syncSectionTabOverflow();
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  } else {
    reveal();
  }
};
''',
)

replace_exact(
    "research-history/model-page.mjs",
    '''for (const button of viewportButtons) {
  button.addEventListener("click", () => {
    state.setViewport(button.dataset.viewport);
    render({ historyMode: "push" });
  });
}

window.addEventListener?.("popstate", () => {
''',
    '''for (const button of viewportButtons) {
  button.addEventListener("click", () => {
    state.setViewport(button.dataset.viewport);
    render({ historyMode: "push" });
  });
}

elements.sectionTabs.addEventListener("scroll", syncSectionTabOverflow, { passive: true });
const sectionTabsResizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver(syncSectionTabOverflow)
  : null;
sectionTabsResizeObserver?.observe(elements.sectionTabs);

window.addEventListener?.("popstate", () => {
''',
)

replace_exact(
    "scripts/archive/validate-section-tabs-browser.mjs",
    '''    requireAllVisible: false,
    requireScrollable: true,
  },
];
''',
    '''    requireAllVisible: false,
    requireScrollable: true,
    expectedOverflowStart: "true",
    expectedOverflowEnd: "false",
    requireMask: true,
  },
];
''',
)

replace_exact(
    "scripts/archive/validate-section-tabs-browser.mjs",
    '''      const selected = tabs.find((button) => button.getAttribute('aria-selected') === 'true');
      const selectedRect = selected.getBoundingClientRect();
      const tabMetrics = tabs.map((button) => {
''',
    '''      const selected = tabs.find((button) => button.getAttribute('aria-selected') === 'true');
      const selectedRect = selected.getBoundingClientRect();
      const style = getComputedStyle(strip);
      const maskImage = style.maskImage || style.webkitMaskImage || 'none';
      const tabMetrics = tabs.map((button) => {
''',
)

replace_exact(
    "scripts/archive/validate-section-tabs-browser.mjs",
    '''        selectedVisible: selectedRect.left >= stripRect.left - 1
          && selectedRect.right <= stripRect.right + 1,
        allVisible: tabMetrics.every((tab) => tab.fullyVisible),
''',
    '''        selectedVisible: selectedRect.left >= stripRect.left - 1
          && selectedRect.right <= stripRect.right + 1,
        selectedFocused: document.activeElement === selected,
        allVisible: tabMetrics.every((tab) => tab.fullyVisible),
''',
)

replace_exact(
    "scripts/archive/validate-section-tabs-browser.mjs",
    '''        stripScrollLeft: strip.scrollLeft,
        stripScrollable: strip.scrollWidth > strip.clientWidth + 1,
        summary: document.querySelector('#section-summary').textContent,
''',
    '''        stripScrollLeft: strip.scrollLeft,
        stripScrollable: strip.scrollWidth > strip.clientWidth + 1,
        overflowStart: strip.dataset.overflowStart,
        overflowEnd: strip.dataset.overflowEnd,
        maskImage,
        summary: document.querySelector('#section-summary').textContent,
''',
)

replace_exact(
    "scripts/archive/validate-section-tabs-browser.mjs",
    '''        objectIds: [...document.querySelectorAll('#all-live-board .model-live-card')]
          .map((card) => card.dataset.objectId),
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
''',
    '''        objectIds: [...document.querySelectorAll('#all-live-board .model-live-card')]
          .map((card) => card.dataset.objectId),
        url: location.href,
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
''',
)

replace_exact(
    "scripts/archive/validate-section-tabs-browser.mjs",
    '''      || (testCase.requireAllVisible && !metrics.allVisible)
      || (testCase.requireScrollable && !metrics.stripScrollable)
      || metrics.documentOverflow) {
''',
    '''      || (testCase.requireAllVisible && !metrics.allVisible)
      || (testCase.requireScrollable && !metrics.stripScrollable)
      || (testCase.expectedOverflowStart && metrics.overflowStart !== testCase.expectedOverflowStart)
      || (testCase.expectedOverflowEnd && metrics.overflowEnd !== testCase.expectedOverflowEnd)
      || (testCase.requireMask && (!metrics.maskImage || metrics.maskImage === "none"))
      || metrics.documentOverflow) {
''',
)

interactive = r'''
  const interactiveLabels = ["共同母體", "閱讀文法", "焦點幾何", "閱讀表面", "直排", "停止路線"];
  const waitForInteractiveSection = (selectedId, objectIds, label) => waitFor(client, `(() => {
    const selected = document.querySelector('#section-tabs button[aria-selected="true"]');
    const visibleIds = [...document.querySelectorAll('#all-live-board .model-live-card')]
      .map((card) => card.dataset.objectId);
    return document.querySelector('#model-title')?.textContent === 'Landscape Paper'
      && selected?.dataset.sectionId === ${JSON.stringify(selectedId)}
      && JSON.stringify(visibleIds) === ${JSON.stringify(JSON.stringify(objectIds))};
  })()`, label);
  const settleInteractiveLayout = async () => {
    await evaluate(client, "document.fonts?.ready ?? Promise.resolve()");
    await evaluate(client, `new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  };
  const readInteractiveMetrics = () => evaluate(client, `(() => {
    const strip = document.querySelector('#section-tabs');
    const stripRect = strip.getBoundingClientRect();
    const selected = strip.querySelector('button[aria-selected="true"]');
    const selectedRect = selected.getBoundingClientRect();
    const style = getComputedStyle(strip);
    return {
      labels: [...strip.querySelectorAll('button')].map((button) => button.textContent),
      selectedId: selected.dataset.sectionId,
      selectedVisible: selectedRect.left >= stripRect.left - 1
        && selectedRect.right <= stripRect.right + 1,
      selectedFocused: document.activeElement === selected,
      stripScrollable: strip.scrollWidth > strip.clientWidth + 1,
      stripScrollLeft: strip.scrollLeft,
      overflowStart: strip.dataset.overflowStart,
      overflowEnd: strip.dataset.overflowEnd,
      maskImage: style.maskImage || style.webkitMaskImage || 'none',
      summary: document.querySelector('#section-summary').textContent,
      objectIds: [...document.querySelectorAll('#all-live-board .model-live-card')]
        .map((card) => card.dataset.objectId),
      url: location.href,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  })()`);

  await setViewport(client, 390);
  await client.send("Page.navigate", {
    url: `${baseUrl}/models/?model=landscape-paper&section=core&variant=18&viewport=390`,
  });
  await waitForInteractiveSection("core", ["18", "18A"], "interactive core initial state");
  await settleInteractiveLayout();
  const initialMetrics = await readInteractiveMetrics();

  await evaluate(client, `document.querySelector('[data-section-id="stopped-routes"]').click()`);
  await waitForInteractiveSection("stopped-routes", ["19", "20", "21"], "interactive clicked stopped routes");
  await settleInteractiveLayout();
  const clickedMetrics = await readInteractiveMetrics();
  await capture(client, "landscape-390-section-click.png");

  await evaluate(client, "history.back()");
  await waitForInteractiveSection("core", ["18", "18A"], "interactive history back");
  await settleInteractiveLayout();
  const backMetrics = await readInteractiveMetrics();

  await evaluate(client, "history.forward()");
  await waitForInteractiveSection("stopped-routes", ["19", "20", "21"], "interactive history forward");
  await settleInteractiveLayout();
  const forwardMetrics = await readInteractiveMetrics();

  const coreSummary = "比較等寬三欄與依內容數量配置的 14:10:6 外欄比例，其他閱讀機制維持不變。";
  const stoppedSummary = "Rigid locator、3D fold 與 two-column window 的執行結果顯示定位、遮擋或閱讀窗口限制，因此停止延伸。";
  const coreValid = (metrics) => JSON.stringify(metrics.labels) === JSON.stringify(interactiveLabels)
    && metrics.selectedId === "core"
    && metrics.selectedVisible
    && metrics.stripScrollable
    && metrics.overflowStart === "false"
    && metrics.overflowEnd === "true"
    && metrics.maskImage !== "none"
    && metrics.summary === coreSummary
    && JSON.stringify(metrics.objectIds) === JSON.stringify(["18", "18A"])
    && metrics.url.includes("section=core")
    && metrics.url.includes("variant=18")
    && !metrics.documentOverflow;
  const stoppedValid = (metrics) => JSON.stringify(metrics.labels) === JSON.stringify(interactiveLabels)
    && metrics.selectedId === "stopped-routes"
    && metrics.selectedVisible
    && metrics.stripScrollable
    && metrics.overflowStart === "true"
    && metrics.overflowEnd === "false"
    && metrics.maskImage !== "none"
    && metrics.summary === stoppedSummary
    && JSON.stringify(metrics.objectIds) === JSON.stringify(["19", "20", "21"])
    && metrics.url.includes("section=stopped-routes")
    && metrics.url.includes("variant=19")
    && !metrics.documentOverflow;
  if (!coreValid(initialMetrics)
    || !stoppedValid(clickedMetrics)
    || !clickedMetrics.selectedFocused
    || !coreValid(backMetrics)
    || !stoppedValid(forwardMetrics)) {
    failures.push(`click/back/forward contract: ${JSON.stringify({
      initialMetrics,
      clickedMetrics,
      backMetrics,
      forwardMetrics,
    })}`);
  }
  results.push({
    name: "landscape-390-click-back-forward",
    metrics: { initialMetrics, clickedMetrics, backMetrics, forwardMetrics },
  });

'''
replace_exact(
    "scripts/archive/validate-section-tabs-browser.mjs",
    '''  const report = {
''',
    interactive + '''  const report = {
''',
)

replace_exact(
    "scripts/archive/validate-section-tabs-browser.mjs",
    '''  console.log("Section-tab browser review: labels, active section, summary, cards, and visible selected tab verified.");
''',
    '''  console.log("Section-tab browser review: overflow cues, direct URLs, click navigation, and history restoration verified.");
''',
)

print("Applied section navigation polish.")
