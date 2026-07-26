# Menu Lens — Research History

手機菜單閱讀問題的研究檔案。這份文件保存實作、轉向與回訪，不把所有版本寫成一條必然進步的時間線。

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

而是兩條互相靠近、反覆回訪的研究路線：

```text
Line A — 完整菜單閱讀
01 Complete menu
└─ 05 Ledger revisit

Line B — 結構、局部與比較投影
02 Relational reading
├─ 03 Candidate marks / workspace
├─ 04 Bounded comparison
└─ 06 Multi-scale revisit
```

這個分組只描述親緣與問題來源，不代表已判定：

- 05 等於 01；
- 06 等於 02；
- 05 或 06 沒有新價值；
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

## 下一輪比較

不急著選答案，先用相同任務比較：

- 01 Complete menu；
- 05 Ledger revisit；
- 02 Prototype C；
- 06 Multi-scale revisit。

觀察：

1. 首屏能否說出分類數、菜單類型與價格帶；
2. 同分類比較三道料理的移動與記憶成本；
3. 跨分類找到兩道指定料理；
4. 查看細節後是否知道原位置；
5. 是否需要先理解新術語或模式；
6. 操作後能否回想料理位於哪一區。

## 視覺處理

研究首頁與後來重建 prototype 使用偏檔案／印刷物的視覺語言：

- 灰白紙色；
- 黑褐文字；
- 氧化紅作少量索引；
- 鉛灰線條；
- 不使用綠色成功語言；
- 不以彩色膠囊、柔和漸層、浮卡陰影表現狀態。

歷史原件保持原始 build 的畫面，不做事後換色。
