export const studyPresentations = Object.freeze({
  "12A-S1": Object.freeze({
    method: "盲測比較",
    cardMeta: "盲測比較 · 12 / 12A",
    subjectLabel: "比較對象",
    subjectIds: Object.freeze(["12", "12A"]),
    prerequisiteIds: Object.freeze([]),
    boundaryLabel: "判讀限制",
    boundary: "研究工具是否可執行，不等於其中任何 prototype 已獲採用。",
  }),
  "25P-S1": Object.freeze({
    method: "陌生讀者任務",
    cardMeta: "陌生讀者任務 · 25P",
    subjectLabel: "受測物件",
    subjectIds: Object.freeze(["25P"]),
    prerequisiteIds: Object.freeze(["25P-L1"]),
    boundaryLabel: "前置條件與判讀",
    boundary: "25P-L1 是執行研究前的可讀性修正，不是另一個比較條件；研究結果不直接授權 25PA。",
  }),
});
