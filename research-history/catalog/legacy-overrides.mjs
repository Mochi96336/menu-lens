export const archiveLegacyOverrides = Object.freeze({
  "07": Object.freeze({
    disposition: "reference",
    evidenceState: "implementation-only",
    entrypoint: "phases/07-horizontal-menu-atlas/index.html",
    validationProfile: "horizontal-market-baseline",
    summary: "市場常見的橫向分類 tabs 與分類內垂直列表，以共同 fixture 重建為可執行參考基準。",
    assets: Object.freeze({
      styles: Object.freeze(["history.css", "horizontal-menu-atlas.css"]),
      scripts: Object.freeze(["menu-fixture.js", "horizontal-menu-atlas-renderer.js"]),
    }),
    nextGate: "Use 07 only as a familiar reference when comparing horizontal spatial mechanisms; do not promote it as a product recommendation.",
    reviewDocument: "records/07/index.html",
    evidencePath: "review-assets/07/README.md",
    sourcePr: 29,
    sourceCommit: "6128517df68f711c49d737ee8601dd3d34415a86",
  }),
});
