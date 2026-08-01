const freezeVignette = (vignette) => Object.freeze({ ...vignette });
const freezePosition = (position) => Object.freeze({ ...position });
const freezeEdge = (edge) => Object.freeze([...edge]);

const freezeSectionPresentation = (section) => Object.freeze({
  ...section,
  position: freezePosition(section.position),
  vignette: freezeVignette(section.vignette),
});

const freezeModelPresentation = (presentation) => Object.freeze({
  ...presentation,
  edges: Object.freeze(presentation.edges.map(freezeEdge)),
  sections: Object.freeze(Object.fromEntries(
    Object.entries(presentation.sections)
      .map(([id, section]) => [id, freezeSectionPresentation(section)]),
  )),
});

export const modelDiagramPresentations = Object.freeze({
  "complete-document": freezeModelPresentation({
    kind: "sequence",
    signature: "Linear document",
    statement: "由完整長頁比較基準，轉向更緊密的 Ledger 節奏與窄欄重排。",
    motif: "linear-document",
    edges: [["baseline", "ledger-density"]],
    sections: {
      baseline: {
        label: "完整基準",
        conceptLabel: "Continuous document",
        note: "完整順序 · 原地細節",
        position: { x: 24, y: 50 },
        vignette: { type: "document", variant: "baseline" },
      },
      "ledger-density": {
        label: "Ledger",
        conceptLabel: "Compressed reading rhythm",
        note: "密度調整 · 窄欄重排",
        position: { x: 76, y: 50 },
        vignette: { type: "document", variant: "density" },
      },
    },
  }),

  "horizontal-navigation": freezeModelPresentation({
    kind: "sequence",
    signature: "Horizontal sequence",
    statement: "沿著實際研究 lineage，比較分類展寬、料理序列與局部焦點。",
    motif: "horizontal-axis",
    edges: [["market-baseline", "spread"], ["spread", "ribbon"], ["ribbon", "fisheye"]],
    sections: {
      "market-baseline": {
        label: "市場基準",
        conceptLabel: "Stable category bands",
        note: "等寬分類 · 固定位置",
        position: { x: 8, y: 50 },
        vignette: { type: "horizontal", variant: "baseline" },
      },
      spread: {
        label: "分類 Spread",
        conceptLabel: "In-place expansion",
        note: "原地展寬 · 鄰欄壓縮",
        position: { x: 36, y: 50 },
        vignette: { type: "horizontal", variant: "spread", activeIndex: 1, expansion: 1.8 },
      },
      ribbon: {
        label: "料理 Ribbon",
        conceptLabel: "Continuous item axis",
        note: "連續序列 · 長距離定位",
        position: { x: 64, y: 50 },
        vignette: { type: "horizontal", variant: "ribbon", activeIndex: 2 },
      },
      fisheye: {
        label: "Fisheye",
        conceptLabel: "Local width falloff",
        note: "局部放大 · 遠端保留",
        position: { x: 92, y: 50 },
        vignette: { type: "horizontal", variant: "fisheye", activeIndex: 3, falloff: 0.58 },
      },
    },
  }),

  "paper-field": freezeModelPresentation({
    kind: "field",
    signature: "Two-dimensional paper",
    statement: "固定二維紙面是共同場域；局部鏡頭與彈性幾何分別測試閱讀邊界。",
    motif: "paper-field",
    edges: [["semantic-information", "stopped-lenses"], ["semantic-information", "elastic-geometry"]],
    sections: {
      "semantic-information": {
        label: "固定紙面",
        conceptLabel: "Scale-aware paper",
        note: "固定格線 · 分尺度資訊",
        position: { x: 18, y: 28 },
        vignette: { type: "paper-field", variant: "semantic" },
      },
      "stopped-lenses": {
        label: "局部鏡頭",
        conceptLabel: "Bounded local lens",
        note: "局部可讀 · 邊界受限",
        position: { x: 50, y: 74 },
        vignette: { type: "paper-field", variant: "stopped" },
      },
      "elastic-geometry": {
        label: "彈性幾何",
        conceptLabel: "Weighted local field",
        note: "局部加權 · 全局仍在場",
        position: { x: 82, y: 28 },
        vignette: { type: "paper-field", variant: "elastic" },
      },
    },
  }),

  "landscape-paper": freezeModelPresentation({
    kind: "branch",
    signature: "Three-column paper",
    statement: "共同的 3 × 2 紙面向閱讀文法、焦點、表面、直排與停止結果分支。",
    motif: "landscape-paper",
    edges: [
      ["core", "reading-grammar"],
      ["core", "focus-geometry"],
      ["core", "reading-surface"],
      ["core", "vertical-writing"],
      ["core", "stopped-routes"],
    ],
    sections: {
      core: {
        label: "共同母體",
        conceptLabel: "Shared paper substrate",
        note: "3 × 2 紙面 · 固定地標",
        position: { x: 10, y: 50 },
        vignette: { type: "landscape", variant: "core" },
      },
      "reading-grammar": {
        label: "閱讀文法",
        conceptLabel: "Entry and reading path",
        note: "入口方式 · 細節位置",
        position: { x: 38, y: 17 },
        vignette: { type: "landscape", variant: "grammar" },
      },
      "focus-geometry": {
        label: "焦點幾何",
        conceptLabel: "Separated focus variables",
        note: "列欄加權 · Camera 分離",
        position: { x: 65, y: 17 },
        vignette: { type: "landscape", variant: "focus" },
      },
      "reading-surface": {
        label: "閱讀表面",
        conceptLabel: "Content-bearing surface",
        note: "字級內距 · 配對收合",
        position: { x: 90, y: 50 },
        vignette: { type: "landscape", variant: "surface" },
      },
      "vertical-writing": {
        label: "直排",
        conceptLabel: "Vertical reading lanes",
        note: "直排名稱 · 價格方向",
        position: { x: 65, y: 83 },
        vignette: { type: "landscape", variant: "vertical" },
      },
      "stopped-routes": {
        label: "停止路線",
        conceptLabel: "Blocked spatial routes",
        note: "定位遮擋 · 閱讀窗口",
        position: { x: 38, y: 83 },
        vignette: { type: "landscape", variant: "stopped" },
      },
    },
  }),

  "multiscale-focus": freezeModelPresentation({
    kind: "sequence",
    signature: "Overview to category",
    statement: "由 overview 進入單一分類後，以返回 continuity 與狀態 truth 補齊可信閱讀。",
    motif: "scale-transition",
    edges: [["model", "necessary-corrections"]],
    sections: {
      model: {
        label: "尺度模型",
        conceptLabel: "Overview-preserving focus",
        note: "單類放大 · 其餘留作地標",
        position: { x: 25, y: 50 },
        vignette: { type: "scale", variant: "focus" },
      },
      "necessary-corrections": {
        label: "必要修正",
        conceptLabel: "Return and status truth",
        note: "返回連續 · 完整菜單仍在",
        position: { x: 75, y: 50 },
        vignette: { type: "scale", variant: "continuity" },
      },
    },
  }),

  "depth-projection": freezeModelPresentation({
    kind: "parallel",
    signature: "Third dimension",
    statement: "三個方向平行比較：重置維度、以資料軸投影，以及把 depth 當成排版體積。",
    motif: "depth-projection",
    edges: [["dimension-reset", "projection-lens"], ["projection-lens", "parallax-volume"]],
    sections: {
      "dimension-reset": {
        label: "Dimension Reset",
        conceptLabel: "Shared depth slices",
        note: "共同切片 · 資料語意待證",
        position: { x: 18, y: 50 },
        vignette: { type: "depth", variant: "reset" },
      },
      "projection-lens": {
        label: "Projection Lens",
        conceptLabel: "Data-axis projection",
        note: "價格份量時間 · 可逆投影",
        position: { x: 50, y: 50 },
        vignette: { type: "depth", variant: "projection" },
      },
      "parallax-volume": {
        label: "Parallax Volume",
        conceptLabel: "Layered spatial volume",
        note: "深度地標 · Flat recovery",
        position: { x: 82, y: 50 },
        vignette: { type: "depth", variant: "parallax" },
      },
    },
  }),
});

export const modelDiagramKinds = Object.freeze(["sequence", "branch", "parallel", "field"]);
export const modelDiagramMotifs = Object.freeze([
  "linear-document",
  "horizontal-axis",
  "paper-field",
  "landscape-paper",
  "scale-transition",
  "depth-projection",
]);
export const modelVignetteVariants = Object.freeze({
  document: Object.freeze(["baseline", "density"]),
  horizontal: Object.freeze(["baseline", "spread", "ribbon", "fisheye"]),
  "paper-field": Object.freeze(["semantic", "stopped", "elastic"]),
  landscape: Object.freeze(["core", "grammar", "focus", "surface", "vertical", "stopped"]),
  scale: Object.freeze(["focus", "continuity"]),
  depth: Object.freeze(["reset", "projection", "parallax"]),
});
export const modelVignetteTypes = Object.freeze(Object.keys(modelVignetteVariants));
