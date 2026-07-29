(() => {
  const menu = window.menuLensResearchMenu;
  const volume = document.querySelector("#parallax-volume");
  const landmarks = document.querySelector("#parallax-transition-landmarks");
  const announcement = document.querySelector("#parallax-transition-announcement");
  if (!menu || !volume || !landmarks || !announcement) return;

  const categoryAnchors = [
    { x: 0, y: 0, color: "#95543d", pale: "#ead8cd" },
    { x: -27, y: 52, color: "#537357", pale: "#dce7d9" },
    { x: 29, y: 48, color: "#486a7c", pale: "#d8e4e8" },
    { x: -31, y: -49, color: "#8a6b38", pale: "#eadfca" },
    { x: 31, y: -47, color: "#785b79", pale: "#e5dce6" },
    { x: 54, y: 2, color: "#9a5b68", pale: "#ead9de" },
  ];
  const targets = categoryAnchors.map((anchor) => ({ x: -anchor.x, y: -anchor.y }));
  const productCounts = menu.categories.map((category) => (
    menu.products.filter((product) => product.categoryId === category.id).length
  ));
  const landmarkElements = {
    origin: {
      root: document.querySelector('[data-landmark-role="origin"]'),
      label: document.querySelector("#parallax-landmark-origin-label"),
      title: document.querySelector("#parallax-landmark-origin-title"),
      count: document.querySelector("#parallax-landmark-origin-count"),
      extent: document.querySelector("#parallax-landmark-origin-extent"),
    },
    target: {
      root: document.querySelector('[data-landmark-role="target"]'),
      label: document.querySelector("#parallax-landmark-target-label"),
      title: document.querySelector("#parallax-landmark-target-title"),
      count: document.querySelector("#parallax-landmark-target-count"),
      extent: document.querySelector("#parallax-landmark-target-extent"),
    },
  };
  let transitionOriginIndex = 0;
  let lastPair = "";

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const viewFromTransform = () => {
    const transform = volume.style.transform || "";
    const match = transform.match(/rotateX\((-?[\d.]+)deg\)\s+rotateY\((-?[\d.]+)deg\)/);
    return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
  };
  const scoreFor = (view, target) => clamp(
    1 - Math.hypot(view.x - target.x, view.y - target.y) / 78,
    0,
    1,
  );
  const directionHint = (view, target) => {
    const horizontalDifference = target.y - view.y;
    const verticalDifference = target.x - view.x;
    const horizontal = Math.abs(horizontalDifference) > 5
      ? (horizontalDifference > 0 ? "右" : "左")
      : "";
    const vertical = Math.abs(verticalDifference) > 5
      ? (verticalDifference > 0 ? "上" : "下")
      : "";
    return `${horizontal}${vertical}` || "前";
  };
  const extentDescription = (score, approaching) => {
    if (score >= .72) return approaching ? "輪廓已清楚" : "大部分範圍仍在";
    if (score >= .48) return approaching ? "範圍正在成形" : "仍可辨識範圍";
    if (score >= .24) return approaching ? "輪廓開始出現" : "留下局部輪廓";
    return approaching ? "遠方碎片出現" : "只剩少量碎片";
  };
  const updateLandmark = (element, index, score, approaching, view) => {
    const category = menu.categories[index];
    const anchor = categoryAnchors[index];
    element.root.style.setProperty("--landmark-color", anchor.color);
    element.root.style.setProperty("--landmark-pale", anchor.pale);
    element.root.style.setProperty("--landmark-score", String(score));
    element.label.textContent = approaching
      ? `往${directionHint(view, targets[index])}`
      : "從這裡離開";
    element.title.textContent = category.name;
    element.count.textContent = `${productCounts[index]} 道`;
    element.extent.textContent = extentDescription(score, approaching);
  };

  const renderTransitionLandmarks = () => {
    const view = viewFromTransform();
    const scored = targets
      .map((target, index) => ({ index, score: scoreFor(view, target) }))
      .sort((a, b) => b.score - a.score);
    const nearest = scored[0];

    if (nearest.score >= .9) {
      transitionOriginIndex = nearest.index;
      landmarks.dataset.visible = "false";
      landmarks.setAttribute("aria-hidden", "true");
      announcement.textContent = "";
      lastPair = "";
      return;
    }

    const origin = scored.find((candidate) => candidate.index === transitionOriginIndex) || nearest;
    const target = scored.find((candidate) => candidate.index !== origin.index) || nearest;
    updateLandmark(landmarkElements.origin, origin.index, origin.score, false, view);
    updateLandmark(landmarkElements.target, target.index, target.score, true, view);
    landmarks.dataset.visible = "true";
    landmarks.dataset.originIndex = String(origin.index);
    landmarks.dataset.targetIndex = String(target.index);
    landmarks.setAttribute("aria-hidden", "true");

    const pair = `${origin.index}:${target.index}`;
    if (pair !== lastPair) {
      const originName = menu.categories[origin.index].name;
      const targetName = menu.categories[target.index].name;
      announcement.textContent = `從${originName}穿越到${targetName}；${targetName}正在成形，${originName}仍保留範圍。`;
      lastPair = pair;
    }
  };

  new MutationObserver(renderTransitionLandmarks).observe(volume, {
    attributes: true,
    attributeFilter: ["style"],
  });
  renderTransitionLandmarks();
})();
