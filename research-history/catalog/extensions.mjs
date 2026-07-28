/*
 * Canonical schema-v2 intake surface.
 *
 * Existing objects continue to come from prototype-registry.js during the
 * migration. New prototypes, corrections, studies, and syntheses are added
 * here (or imported here from family modules) so browser rendering and Node
 * validation consume the same extension list.
 */
export const archiveExtensions = Object.freeze([
  {
    id: "25P-L1",
    slug: "25p-readable-band-labels",
    title: "25P Readable Band Labels",
    family: "depth",
    objectType: "correction",
    researchParentId: "25P",
    dependsOn: [],
    evidenceFor: [],
    mechanismsFrom: [],
    disposition: "keep-controlled",
    evidenceState: "browser-verified",
    entrypoint: null,
    validationProfile: "25p-readable-band-labels",
    summary: "在不改變 25P 三軸投影模型的前提下，補上可讀語意分帶、固定任務與受控的 focus-card 邊界修正，作為陌生讀者研究前置條件。",
    assets: {
      styles: ["menu-projection-band-labels.css"],
      scripts: ["menu-projection-band-labels.js"],
    },
    nextGate: "Run the consolidated unfamiliar-reader study 25P-S1.",
    reviewDocument: "records/25p-l1/index.html",
    evidencePath: "review-assets/25p-band-labels/browser-report.json",
    sourcePr: 31,
    sourceCommit: "36bc34f50333c239be0dc9b63ca914ac98084002",
  },
  {
    id: "25P-S1",
    slug: "25p-unfamiliar-reader-study",
    title: "25P Unfamiliar-reader Study",
    family: "depth",
    objectType: "study",
    researchParentId: "25P",
    dependsOn: ["25P-L1"],
    evidenceFor: ["25P", "25P-L1"],
    mechanismsFrom: [],
    disposition: "study-only",
    evidenceState: "participant-study-ready",
    entrypoint: "studies/25p-reader-task/index.html",
    validationProfile: "25p-unfamiliar-reader-study",
    summary: "以六場 2 × 3 反平衡的陌生讀者任務檢查 25P 是否能在沒有投影順序提示下完成三條件取捨；工具不自動評分、不儲存回答，也不授權 25PA。",
    assets: {
      styles: ["history.css"],
      scripts: [],
    },
    nextGate: "Execute S01–S06 and classify 25PA as eligible, still blocked, or stopped.",
    reviewDocument: "records/25p-s1/index.html",
    evidencePath: "review-assets/25p-reader-task/layout-report.json",
    sourcePr: 34,
    sourceCommit: "360c1947092363b72a545265ae3c0555e49de143",
  },
]);
