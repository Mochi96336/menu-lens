# Menu Lens — Research History

手機菜單閱讀問題的研究檔案。這份文件保存實作、轉向與回訪，不把所有版本寫成一條必然進步的時間線。

版本、家族、父系、狀態、路徑與資產的單一真相來源是 `research-history/prototype-registry.js`；新增與整理規則見 [`architecture.md`](architecture.md)。本文件負責解釋研究脈絡，不再承擔機器可讀的版本清單。

HTML 入口：

```text
/research-history/
```

## 閱讀原則

研究證據分成三種：

1. **Original implementation**：由固定歷史 commit 執行當時的 typecheck、test 與 build，完整保存輸出。
2. **Interpretive reconstruction**：後來為了說明流程或比較任務而重建，不能取代歷史原件。
3. **Later revisit / new prototype**：後來再次碰到相似問題時建立的版本，先保存，不預設它是進步、重複或失敗。

## 不再使用六步進步史

目前較合適的整理不是：

```text
01 → 02 → 03 → 04 → 05 → 06
```

而是六個可分支、可停止、可回訪的 prototype 家族。完整節點以 registry 為準：

```text
document       01 → 05
relational     02 → 03 → 04
               └→ 06 revisit
horizontal     07 → 08 → 09 → 10
matrix-paper   11 → 12 → 13 / 14 / 15 → 16 → 17
landscape      16 → 18 → 19 / 20 / 21 / 22 / 23 / 24
depth          25 → 25P（real-axis projection）/ 25B（falsification）→ 26（layout volume）
                  ├→ Menu Sections（rejected semantic-depth model）
                  └→ 25B（first-pass falsification）
```

這個分組只描述親緣與問題來源，不代表已判定：

- 05 等於 01；
- 06 等於 02；
- 05 或 06 沒有新價值；
- 後來的編號必然優於既有方向；
- 任何一條路線已經勝出。

## 歷史原件

| 階段 | 來源 | 固定 commit | 邊界 |
|---|---|---|---|
| 01 Complete menu | merged PR #3 | `087619c3cac4e7b019d58265b6233b3ff04e28f2` | 完整菜單與 inline detail 基線 |
| 02 Prototype C | PR #4 | `b554f8a4784188d414ee2d82a434a0e1515d3579` | Relational 完成，尚未加入 Candidate |
| 03A Candidate marks | PR #4 | `53963f4ad15a145e3d8f8e1e25d0a5a5e4b925c2` | CND1 完成，尚未加入 workspace |
| 03B Candidate workspace | PR #4 | `5251bfcd6eafab132617891ed7bc98d6d3a551ca` | CND2 完成，尚未加入 comparison |
| 04 Bounded comparison | PR #4 | `923be38046b28baf9ba4687a020290bd6a0afbf4` | CMP1 最終 review，方向拒絕之前 |

完整來源記錄：

- `original-snapshot-provenance.md`
- `original-milestones.tsv`
- `pr4-commits.tsv`
- `pr4-files-by-commit.txt`

## Line A — 完整菜單閱讀

### 01 Complete menu

核心做法：

```text
餐廳資訊
→ 分類導覽
→ 完整長菜單
→ inline detail
→ 關閉並回到原位置
```

保留下來的成果：

- 完整 Category／Product document；
- 分類導覽只移動，不過濾；
- inline detail 保留相鄰內容；
- sold-out 與缺資料不會讓料理消失；
- keyboard、Escape、focus 與 scroll return 有清楚契約。

仍存在的問題：

- viewport 之外的內容暫時消失；
- 跨分類比較依賴移動與記憶；
- 全貌與局部難以同時存在。

歷史 disposition：**Accepted substrate**。

### 05 Ledger revisit

來源：後來重建，當時沒有獨立可執行歷史 HTML。

回訪問題：

> 在完整菜單不收合、不增加模式的前提下，密度、共享欄位與 inline detail 能把線性閱讀改善到什麼程度？

相對於 01，05 保留：

- 完整長頁；
- 分類順序；
- inline detail；
- 所有料理永久存在。

05 改變：

- Product card 降為密集 row；
- 名稱、cue 與價格更穩定對齊；
- 分類成為主要視覺段落；
- 30 道料理被完整放入 prototype，讓長頁成本仍可觀察。

目前暫不判定：

- 05 是否只是 01 的視覺 refinement；
- 排版改善是否足以帶來可測量的任務差異；
- 線性限制是否仍主導整體體驗。

狀態：**Unresolved revisit**。

## Line B — 結構、局部與比較投影

### 02 Relational reading

核心做法：

```text
選 Anchor
+ 選 shared semantic axis
→ 顯示精確價差與同一維度的關係
```

保留下來的成果：

- canonical order；
- shared columns；
- exact price delta；
- missing／low-confidence evidence grammar；
- pure projection 與清楚的 state boundary。

失敗原因：普通閱讀必須先理解 Anchor 與 axis，資訊排版問題被轉化成控制操作。

歷史 disposition：**Rejected as main flow**。

### 03 Candidate marks / workspace

```text
菜單列按「考慮」
→ 繼續瀏覽
→ 打開 Candidate workspace
→ 查看、移除、返回
```

工程成果：

- Candidate 與 order item 分離；
- identity-only references；
- canonical order；
- return context 與 focus recovery。

失敗原因：把短期考慮正式化成清單與獨立工作區管理。

歷史 disposition：**Rejected as default flow**。

### 04 Bounded comparison

```text
Candidate workspace
→ 再選 2–3 道 comparison members
→ 查看 vertical difference blocks
```

工程成果：

- 只允許目前 Candidate；
- 上限三道；
- 無重複、canonical order；
- Candidate 移除會清理 comparison state；
- 窄螢幕不使用橫向矩陣。

失敗原因：使用者已表達「考慮這些」，仍須再次表達「比較這些」。

歷史 disposition：**Technically coherent, product-invalid**。

### 06 Multi-scale revisit

來源：後來提出的新 prototype，不是早期畫面的復原。

回訪問題：

> 完整結構能否始終在場，而內容依全店、分類與料理尺度局部展開？

與早期方向的親緣：

- 再次處理 overview 與局部焦點；
- 再次透過顯式操作改變畫面投影；
- 再次試圖減少 viewport 外內容造成的記憶負擔。

與 02–04 的差異：

- 焦點單位從 Product Anchor 改為 Category；
- 不使用 semantic axis；
- 不使用 Candidate 或 comparison membership；
- 其他分類保留為壓縮地標，而非完全離開畫面。

目前暫不判定：

- 這些差異是否構成新的互動機制；
- 它是否只是早期 overview／focus family 的另一種包裝；
- 展開成本是否小於長頁移動成本；
- 地標是否真的改善位置回憶與跨分類返回。

狀態：**Unresolved revisit**。

## 05、06 的保存方式

05 與 06 都保留完整可操作 HTML，不刪除、不併回早期 prototype，也不先改寫 disposition。

它們在研究首頁中獨立放於：

```text
Later revisits / no disposition yet
```

後續討論應先回答：

1. 哪些 UI 結構直接延續早期方案？
2. 哪些機制確實不同？
3. 不同機制是否帶來可觀察的任務差異？
4. 若沒有新效益，是否只保留為回訪證據？

## Line C — 空間互動探索

完整探索邊界記錄於 [`spatial-exploration.md`](spatial-exploration.md)。

### 07 Horizontal Menu Atlas

市面常見的橫向分類導覽加分類內垂直清單。它保留為 market baseline 記錄，目前不重建；需要正式比較時才以同一 fixture 補上。

### 08 Menu Spread

目前的 active spatial hypothesis。它不以橫向 tabs 替換分類，而把六個分類視為同一張連續 spread：聚焦分類在原位置展寬，其他分類壓縮但不消失，料理細節再於分類內展開。

HTML 入口：

```text
/research-history/phases/08-menu-spread/
```

第一輪先觀察空間機制，不要求淘汰任何既有方向，也不把自我操作記錄當成參與者證據。

### 09 Horizontal Ribbon

把橫向推到更極端：30 道料理不再分別存在於六個垂直分類清單，而是依 canonical order 佔據同一條水平 ribbon。全店尺度顯示分類章節與料理刻度，閱讀尺度展開同一批料理，垂直方向只用於 product detail。

HTML 入口：

```text
/research-history/phases/09-horizontal-ribbon/
```

### 10 Fisheye Ribbon

延續 09 的單一水平菜序，但取消長距離軌道。30 道料理固定在同一個手機寬度，拖曳只移動閱讀鏡頭。現在也加入類似 06 的分類尺度：先放大分類中的料理地標，再進入單一道料理鏡頭與細節。

HTML 入口：

```text
/research-history/phases/10-fisheye-ribbon/
```

### 11 Menu Matrix

把六個分類固定成列、分類內最多八道固定成欄。選分類時伸展整列而不改變格位；料理細節在獨立面板顯示。橫軸只代表分類內菜序，不承擔價格或份量等語意。

HTML 入口：

```text
/research-history/phases/11-menu-matrix/
```

### 12 Paper Menu Field

矩陣單位改為六個分類區塊。兩欄三列只有紙面編排意義，不代表任何比較軸；全貌是整張 sheet 縮小，聚焦時則依分類原始座標移動並放大同一張 sheet。

HTML 入口：

```text
/research-history/phases/12-paper-menu-field/
```

### 13 Static Loupe

紙面與分類位置完全固定，只有矩形閱讀鏡頭在底圖上移動。鏡頭內放大相同來源座標，並可直接點料理開啟細節。

```text
/research-history/phases/13-static-loupe/
```

### 14 Folded Menu

六個分類成為同一張手風琴摺頁。焦點紙面攤平，其他分類沿可見摺線留下帶角度的窄紙條。

```text
/research-history/phases/14-folded-menu/
```

### 15 Elastic Paper

固定紙張外框，焦點所在的欄與列在原位置取得主要空間。使用者可直接拖曳焦點穿過二維分類版面。

```text
/research-history/phases/15-elastic-paper/
```

### 16 Weighted Elastic Paper

保留 15 的 2 欄×3 列與直接拖曳，但欄寬、列高和聚焦後面積都依分類料理數量計算。八道主餐與兩道甜點不再取得相同閱讀空間。

```text
/research-history/phases/16-weighted-elastic-paper/
```

### 17 Weighted Horizontal Strip

六分類依 8:6:6:4:4:2 共用同一個手機寬度。聚焦分類的原始權重乘四後重新分配；沒有固定大欄，也沒有橫向捲動。

```text
/research-history/phases/17-weighted-horizontal-strip/
```

### 18 Landscape Paper

三個等寬橫向紙欄各含上下兩分類，欄內高度依各分類數量配置。整張尺度保留全貌，閱讀尺度才沿紙欄橫向拖曳。

```text
/research-history/phases/18-landscape-paper/
```

### 19 Rigid Horizontal Sheet

固定 840×560 的 3×2 紙面，overview 與 reading 都使用等比例縮放。閱讀時只移動 camera 的 translateX，上方縮圖持續標示可見紙面範圍。

```text
/research-history/phases/19-rigid-horizontal-sheet/
```

### 20 Tri-fold Matrix

沿三個紙欄折疊，而不是把六分類做成 accordion。每個 panel 始終保留上下兩分類與水平分隔線。

```text
/research-history/phases/20-trifold-matrix/
```

### 21 Two-column Reading Window

在固定三欄紙面上只設 A+B 與 B+C 兩個閱讀窗口。每次橫移一欄，中間 B 欄與其兩分類持續在場。

```text
/research-history/phases/21-two-column-window/
```

### 22–24 Landscape Paper branches

18 is now the common substrate rather than another branch to replace. The three new variants isolate native content-aware zoom, local category collapse, and vertical product typography.

```text
/research-history/phases/22-weighted-pinch-sheet/
/research-history/phases/23-collapsible-landscape/
/research-history/phases/24-vertical-landscape/
```

Direct product-owner reactions and branch consequences are recorded separately in `product-direction-review.md`. They are not participant-study results.

## 視覺處理

研究首頁與後來重建 prototype 使用偏檔案／印刷物的視覺語言：

- 灰白紙色；
- 黑褐文字；
- 氧化紅作少量索引；
- 鉛灰線條；
- 不使用綠色成功語言；
- 不以彩色膠囊、柔和漸層、浮卡陰影表現狀態。

歷史原件保持原始 build 的畫面，不做事後換色。
