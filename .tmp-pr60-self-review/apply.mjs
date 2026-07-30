import { readFile, rm, writeFile } from "node:fs/promises";

const replaceOnce = (source, from, to, label) => {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(from, to);
};

const patchFile = async (path, edits) => {
  let source = await readFile(path, "utf8");
  for (const [label, from, to] of edits) source = replaceOnce(source, from, to, label);
  await writeFile(path, source);
};

await patchFile("research-history/model-page.mjs", [
  [
    "add source presentation",
    `const previewAssetPath = (object, viewport = activeViewport) =>
  archivePath(\`previews/\${encodeURIComponent(object.id)}/\${viewport}.png\`);

const makePreviewPlaceholder = (object, message) => {`,
    `const previewAssetPath = (object, viewport = activeViewport) =>
  archivePath(\`previews/\${encodeURIComponent(object.id)}/\${viewport}.png\`);

const sourcePresentation = (object) => {
  if (object.objectType === "study") {
    return {
      action: "開啟研究工具 ↗",
      fallbackAction: "開啟研究工具",
      recordLabel: "Study tool",
      recordTitle: \`開啟 \${object.id} 研究工具\`,
    };
  }
  if (object.objectType === "correction") {
    return {
      action: "開啟修正畫面 ↗",
      fallbackAction: "開啟修正畫面",
      recordLabel: "Correction",
      recordTitle: \`開啟 \${object.id} 修正畫面\`,
    };
  }
  return {
    action: "開啟 prototype ↗",
    fallbackAction: "開啟 exact prototype",
    recordLabel: "Prototype",
    recordTitle: \`開啟 \${object.id} exact prototype\`,
  };
};

const makePreviewPlaceholder = (object, message) => {`,
  ],
  [
    "use source-aware fallback action",
    `    const link = makeText("a", "", "開啟 exact prototype");`,
    `    const link = makeText("a", "", sourcePresentation(object).fallbackAction);`,
  ],
  [
    "use generic static preview note",
    `  elements.viewportNote.textContent =
    \`\${viewportLabel()} 靜態預覽只保留 prototype 畫面；開啟 prototype 可實際操作。\`;`,
    `  elements.viewportNote.textContent =
    \`\${viewportLabel()} 靜態預覽只保留主要畫面；開啟原始頁面可實際操作。\`;`,
  ],
  [
    "reveal active comparison card",
    `  elements.allPreviewGrid.replaceChildren(...cards);
};`,
    `  elements.allPreviewGrid.replaceChildren(...cards);
  const currentCard = [...elements.allPreviewGrid.querySelectorAll?.("[data-current]") ?? []]
    .find((card) => card.dataset.current === "true");
  const revealCurrentCard = () => {
    if (!currentCard) return;
    if (typeof elements.allPreviewGrid.scrollTo === "function"
      && elements.allPreviewGrid.scrollWidth > elements.allPreviewGrid.clientWidth) {
      const left = Math.max(
        0,
        currentCard.offsetLeft - ((elements.allPreviewGrid.clientWidth - currentCard.offsetWidth) / 2),
      );
      elements.allPreviewGrid.scrollTo({ left, behavior: "auto" });
      return;
    }
    currentCard.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(revealCurrentCard);
  else revealCurrentCard();
};`,
  ],
  [
    "use source-aware exact action",
    `  elements.currentExactLink.hidden = !activeObject.entrypoint;
  if (activeObject.entrypoint) elements.currentExactLink.href = archivePath(activeObject.entrypoint);`,
    `  elements.currentExactLink.hidden = !activeObject.entrypoint;
  if (activeObject.entrypoint) {
    elements.currentExactLink.href = archivePath(activeObject.entrypoint);
    elements.currentExactLink.textContent = sourcePresentation(activeObject).action;
  }`,
  ],
  [
    "shorten compare label",
    `  elements.compareParent.textContent = parent ? \`與 parent \${parent.id} 並排\` : "與 parent 並排";`,
    `  elements.compareParent.textContent = "與 parent 並排";`,
  ],
  [
    "use source-aware record action",
    `  if (activeObject.entrypoint) {
    links.push(makeRecordLink(
      "Prototype",
      \`開啟 \${activeObject.id} exact prototype\`,
      archivePath(activeObject.entrypoint),
      "primary",
    ));
  }`,
    `  if (activeObject.entrypoint) {
    const source = sourcePresentation(activeObject);
    links.push(makeRecordLink(
      source.recordLabel,
      source.recordTitle,
      archivePath(activeObject.entrypoint),
      "primary",
    ));
  }`,
  ],
]);

await patchFile("research-history/model-page-workbench.css", [
  [
    "strengthen active comparison card",
    `.model-page .model-preview-card[data-current="true"] {
  border-top-color: var(--accent);
  box-shadow: inset 0 2px 0 var(--accent);
}`,
    `.model-page .model-preview-card[data-current="true"] {
  border-top-color: var(--accent);
  outline: 1px solid var(--accent);
  outline-offset: -1px;
  box-shadow: inset 0 2px 0 var(--accent);
}

.model-page .model-preview-card[data-current="true"] .model-preview-card__select {
  background: var(--surface-strong);
}`,
  ],
  [
    "compact mobile observation toolbar",
    `  .model-page .model-toolbar {
    align-items: flex-start;
  }`,
    `  .model-page .model-toolbar {
    align-items: flex-start;
    gap: .55rem .75rem;
  }

  .model-page .model-toolbar__group,
  .model-page .model-toolbar__actions {
    gap: .35rem;
  }

  .model-page .model-toolbar__group > span {
    display: none;
  }`,
  ],
]);

await patchFile("scripts/archive/generate-model-previews.mjs", [
  [
    "wait for target media and disable motion",
    `const readClip = (client, selector) => evaluate(client, \`(() => {`,
    `const preparePreviewTarget = (client, selector) => evaluate(client, \`(async () => {
  const element = document.querySelector(\${JSON.stringify(selector)});
  if (!element) return { missing: true, failedImages: [] };
  let style = document.querySelector('#model-preview-capture-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'model-preview-capture-style';
    document.head.append(style);
  }
  style.textContent = \`
    *, *::before, *::after {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      transition-delay: 0s !important;
      transition-duration: 0s !important;
      caret-color: transparent !important;
    }
  \`;
  window.scrollTo(0, 0);
  element.scrollTop = 0;
  const images = [...element.querySelectorAll('img')];
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => resolve();
      image.addEventListener('load', done, { once: true });
      image.addEventListener('error', done, { once: true });
      setTimeout(done, 5000);
    });
  }));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return {
    missing: false,
    failedImages: images.filter((image) => image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
  };
})()\`);

const readClip = (client, selector) => evaluate(client, \`(() => {`,
  ],
  [
    "prepare target before capture",
    `      const selector = await waitForPreviewTarget(client, path);
      const clip = await readClip(client, selector);`,
    `      const selector = await waitForPreviewTarget(client, path);
      const previewState = await preparePreviewTarget(client, selector);
      if (previewState.missing || previewState.failedImages.length) {
        throw new Error(\`\${object.id} preview target has unavailable media: \${previewState.failedImages.join(", ")}\`);
      }
      const clip = await readClip(client, selector);`,
  ],
]);

await patchFile("scripts/archive/validate-model-page-renderer.mjs", [
  [
    "verify prototype action label",
    `  if (selectors.get("#current-exact-link").hidden
    || selectors.get("#current-exact-link").href !== "../phases/18b-semantic-zoom/index.html") {`,
    `  if (selectors.get("#current-exact-link").hidden
    || selectors.get("#current-exact-link").href !== "../phases/18b-semantic-zoom/index.html"
    || selectors.get("#current-exact-link").textContent !== "開啟 prototype ↗") {`,
  ],
  [
    "verify compact compare label",
    `  if (selectors.get("#preview-grid").dataset.viewMode !== "compare") {
    throw new Error("Parent comparison must be represented as a side-by-side view mode.");
  }`,
    `  if (selectors.get("#preview-grid").dataset.viewMode !== "compare") {
    throw new Error("Parent comparison must be represented as a side-by-side view mode.");
  }
  if (selectors.get("#compare-parent").textContent !== "與 parent 並排") {
    throw new Error("Parent comparison action must remain concise.");
  }`,
  ],
  [
    "verify study action label",
    `  if (!selectors.get("#compare-parent").hidden || selectors.get("#parent-record-link").hidden) {
    throw new Error("Study objects must expose a parent record instead of a fake visual comparison.");
  }`,
    `  if (!selectors.get("#compare-parent").hidden || selectors.get("#parent-record-link").hidden) {
    throw new Error("Study objects must expose a parent record instead of a fake visual comparison.");
  }
  if (selectors.get("#current-exact-link").textContent !== "開啟研究工具 ↗") {
    throw new Error("Study entrypoints must be presented as research tools, not prototypes.");
  }`,
  ],
]);

await patchFile("scripts/archive/capture-model-page-review.mjs", [
  [
    "measure active all-view card visibility",
    `    const board = document.querySelector('#all-preview-grid');
    return {
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,`,
    `    const board = document.querySelector('#all-preview-grid');
    const currentCard = board.querySelector('[data-current="true"]');
    const boardRect = board.getBoundingClientRect();
    const currentRect = currentCard?.getBoundingClientRect();
    const visibleWidth = currentRect
      ? Math.max(0, Math.min(currentRect.right, boardRect.right) - Math.max(currentRect.left, boardRect.left))
      : 0;
    return {
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,`,
  ],
  [
    "record active all-view card visibility",
    `      urlHasAll: new URL(location.href).searchParams.get('view') === 'all',
    };`,
    `      urlHasAll: new URL(location.href).searchParams.get('view') === 'all',
      currentCardVisible: Boolean(currentRect && visibleWidth >= Math.min(currentRect.width, boardRect.width) * 0.8),
    };`,
  ],
  [
    "record study source action",
    `    titleDeduplicated: !document.querySelector('#current-object-title').textContent.match(/^(\\S+) · \\1\\b/),
  }))()` ,
    `    titleDeduplicated: !document.querySelector('#current-object-title').textContent.match(/^(\\S+) · \\1\\b/),
    sourceActionText: document.querySelector('#current-exact-link').textContent,
  }))()`,
  ],
  [
    "require active all-view card visibility",
    `    || mobileAllMetrics.iframeCount !== 0 || !mobileAllMetrics.urlHasAll) {`,
    `    || mobileAllMetrics.iframeCount !== 0 || !mobileAllMetrics.urlHasAll
    || !mobileAllMetrics.currentCardVisible) {`,
  ],
  [
    "require study source action label",
    `    || studyMetrics.iframeCount !== 0 || !studyMetrics.titleDeduplicated) {`,
    `    || studyMetrics.iframeCount !== 0 || !studyMetrics.titleDeduplicated
    || studyMetrics.sourceActionText !== "開啟研究工具 ↗") {`,
  ],
]);

await rm(".tmp-pr60-self-review", { recursive: true, force: true });
console.log("PR 60 self-review fixes applied.");
