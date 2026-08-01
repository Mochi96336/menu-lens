const freezeVignette = (vignette) => Object.freeze({ ...vignette });

const freezeSectionPresentation = (section) => Object.freeze({
  ...section,
  vignette: freezeVignette(section.vignette),
});

const freezeModelPresentation = (presentation) => Object.freeze({
  ...presentation,
  sections: Object.freeze(Object.fromEntries(
    Object.entries(presentation.sections)
      .map(([id, section]) => [id, freezeSectionPresentation(section)]),
  )),
});

export const modelDiagramPresentations = Object.freeze({
  "horizontal-navigation": freezeModelPresentation({
    kind: "sequence",
    signature: "Horizontal sequence",
    statement: "由市場基準逐步增加分類展寬、料理序列與局部焦點。",
    motif: "horizontal-axis",
    sections: {
      "market-baseline": {
        label: "市場基準",
        conceptLabel: "Stable category bands",
        note: "完整分類、固定寬度與穩定閱讀位置。",
        vignette: { type: "equal-bands" },
      },
      spread: {
        label: "分類 Spread",
        conceptLabel: "In-place expansion",
        note: "分類欄在同一張 spread 上原地展寬，鄰近欄位相應壓縮。",
        vignette: { type: "expanded-band", activeIndex: 1, expansion: 1.8 },
      },
      ribbon: {
        label: "料理 Ribbon",
        conceptLabel: "Continuous item axis",
        note: "料理項目形成一條保留順序與長距離位置的連續帶。",
        vignette: { type: "ribbon-sequence", activeIndex: 2 },
      },
      fisheye: {
        label: "Fisheye",
        conceptLabel: "Local width falloff",
        note: "焦點附近重新分配寬度，遠端項目與完整序列仍保留。",
        vignette: { type: "fisheye-axis", activeIndex: 3, falloff: 0.58 },
      },
    },
  }),
});

export const modelDiagramKinds = Object.freeze(["sequence", "branch", "parallel", "field"]);
export const modelDiagramMotifs = Object.freeze(["horizontal-axis", "paper-surface", "projected-field"]);
export const modelVignetteTypes = Object.freeze([
  "equal-bands",
  "expanded-band",
  "ribbon-sequence",
  "fisheye-axis",
]);
