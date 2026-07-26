# Menu Lens — Design Evolution and Failed Directions

手機菜單閱讀問題的設計演進、原始實作、失敗方向與可重用成果。

## 文件目的

這份檔案不是目前產品規格，也不是替舊 prototype 辯護。它讓第一次接觸 repository 的人快速回答：

1. 每個時期想解決什麼；
2. 使用者必須做哪些操作；
3. 哪些部分有效；
4. 哪些負擔只是被搬到別處；
5. 為什麼通過、部分保留或拒絕；
6. 哪些成果仍可重用；
7. 目前看到的畫面是歷史原件、後來重建，還是新假設。

HTML 研究入口位於：

```text
/research-history/
```

## 三種證據必須分開

### Original implementation

由固定歷史 commit 執行該 commit 自己的：

```text
npm install
npm run typecheck
npm test
npm run build
```

再將完整 `dist` 凍結到 `research-history/originals/`。這是當時真正執行過的 HTML、JavaScript、CSS 與資料。

### Interpretive reconstruction

後來為了說明流程或使用同一組任務比較而重新製作。可以保留，但不能取代歷史原件。

### New hypothesis

當時沒有既存可執行 HTML，後來才提出或補做的方向。

## 原始問題

多數 QR 菜單把紙本菜單轉成一條商品卡長頁，再提前放入規格、數量、購物車與結帳控制。核心困難不是單純美感，而是手機 viewport 將閱讀變成線性序列：

- 離開畫面的內容暫時消失；
- 全貌與局部很難同時存在；
- 跨分類比較依賴工作記憶；
- 分類切換容易像篩選，讓人懷疑內容被隱藏；
- 商品卡與交易控制稀釋菜單本身；
- 細節頁或 modal 破壞空間記憶與返回位置。

## 總時間線

| 階段 | 主要解法 | 處理了什麼 | 沒處理／新增了什麼 | 結論 |
|---|---|---|---|---|
| 01 Complete menu | 完整長頁＋分類跳轉＋inline detail | 完整性、分類定位、細節返回 | 長頁線性、跨分類比較、全貌與局部分離 | **Accepted substrate** |
| 02 Relational reading | Anchor＋semantic axis＋相對投影 | 相對差異、固定欄位、證據來源 | 必須先理解基準與比較軸 | **Rejected as main flow** |
| 03 Candidate workspace | Candidate marks＋獨立工作區 | 可逆保存、與購物車分離、跨分類回看 | 將短期考慮正式化成狀態管理 | **Rejected as default flow** |
| 04 Bounded comparison | Candidate 之外再選 2–3 道 | 真實差異、上限、canonical order | 已保留仍須再選一次 | **Technically coherent, product-invalid** |
| 05 Ledger document | 密集表列＋對齊價格／線索＋inline detail | 同分類掃描、卡片密度、資訊位置 | 仍是一條更漂亮的長頁 | **Useful partial solution** |
| 06 Multi-scale map | 全店摘要→分類展開→料理細節 | 嘗試保留全貌、地標與局部閱讀 | 展開成本與摘要可信度尚未驗證 | **Active hypothesis** |

## 01 — Complete menu + inline detail

**問題**：讓使用者相信完整菜單都在場，能跳到分類，並查看料理而不離開菜單。

```text
餐廳資訊
→ 分類導覽
→ 完整長菜單
→ 原地展開料理
→ 關閉並回到相同位置
```

**有效成果**

- 所有分類與 Product 都存在於 canonical document；
- 分類導航移動而不過濾；
- inline detail 保留相鄰料理；
- keyboard、Escape、focus、scroll return 與 reduced motion 有清楚行為；
- sold-out 與缺少資料不會讓料理消失。

**未解問題**

- 菜單仍是一條長線；
- 離開 viewport 後依賴記憶；
- 跨分類比較與遠距返回仍脆弱。

**Disposition**：**Accepted substrate**。

**Original**：PR #3，commit `087619c3cac4e7b019d58265b6233b3ff04e28f2`。

## 02 — Relational reading

**問題**：如果使用者難以記住多道料理的絕對資訊，能否直接顯示相對關係？

```text
選一道 Anchor
+ 選一條 semantic axis
→ 其他料理顯示相對差異
```

Prototype C 同時保留 canonical order、精確價差、絕對 semantic class、價格與 evidence label。

**有效成果**

- 價格、份量與準備節奏可被 pure projection；
- shared columns 有利掃描；
- 商家確認、分類預設、低可信與未提供有明確界線。

**失敗原因**

- 使用者必須先理解 Anchor；
- 必須先選如何比較，系統才顯示關係；
- 一般排版應直接提供的差異被包裝成控制；
- 認知負擔從記憶轉移到操作與術語。

**Disposition**：**Rejected as main flow**。

**Original**：PR #4，commit `b554f8a4784188d414ee2d82a434a0e1515d3579`。這個節點已完成 Prototype C，尚未開始 Candidate implementation。

## 03 — Candidate marks + workspace

**問題**：使用者是否需要在購物車之前保存幾道「認真考慮」的料理？

```text
在菜單按「考慮」
→ 繼續瀏覽
→ 打開「查看考慮項目」
→ 查看／移除／回到菜單
```

**有效成果**

- Candidate 與 order item 的 state boundary 清楚；
- 不要求數量、modifier 或付款承諾；
- identity-only references 避免複製 Product；
- return context 與 focus recovery 有完整規則。

**失敗原因**

- 將人的短期考慮正式化成產品狀態；
- 新增術語、按鈕與獨立工作區；
- 使用者開始管理清單，而不是讀菜單。

**Disposition**：**Rejected as default flow**。

兩個原始節點分開保存：

- CND1 Candidate marks：`53963f4ad15a145e3d8f8e1e25d0a5a5e4b925c2`，尚未加入 workspace；
- CND2 Candidate workspace：`5251bfcd6eafab132617891ed7bc98d6d3a551ca`，尚未加入 comparison。

## 04 — Bounded Candidate comparison

**問題**：如何讓兩至三道 Candidate 以 truthful、bounded 的方式比較？

```text
加入考慮
→ 打開 Candidate workspace
→ 打開比較
→ 再逐道按「比較」
→ 看到差異
```

**工程成果**

- 只允許目前 Candidate；
- identity-only、無重複、canonical order、最多三道；
- Candidate 移除會清理 comparison selection；
- vertical dimension blocks 避免窄螢幕矩陣。

**失敗原因**：使用者已經表達「我在考慮這幾道」，卻仍須再次表達「我要比較這幾道」。

**Disposition**：**Technically coherent, product-invalid**。

**Original**：PR #4，commit `923be38046b28baf9ba4687a020290bd6a0afbf4`。這是 CMP1 final implementation review，早於整體方向拒絕。

## 05 — Ledger-first digital document

**問題**：捨棄 Candidate 與 comparison workflow 後，能否只靠排版讓同分類料理自然可比？

```text
密集分類段落
+ 對齊名稱、線索與價格
+ inline detail
→ comparison through layout
```

快照刻意放入六個分類、30 道料理，且所有分類永久展開。

**有效成果**

- 分類取代 Product card 成為主要視覺單位；
- 價格、cue 與描述位置穩定；
- 同分類多道料理可直接掃描；
- row chrome 與交易按鈕下降；
- detail 可原地展開。

**未解問題**

- Header、分類、Product 仍依序向下延伸；
- 只改善線性清單品質，沒有改變線性 viewport；
- 全貌與當前分類仍難同時存在；
- 跨分類跳躍與空間記憶仍脆弱。

**Disposition**：**Useful partial solution**。

**Source type**：**New reconstruction**。當時只有方向文件與視覺討論，沒有可恢復的歷史 HTML。

## 06 — Multi-scale menu map

**問題**：如何保留完整菜單結構，同時避免所有 Product 永久展開成無限長頁？

```text
完整結構始終可見
+ 完整內容依閱讀尺度展開

全店尺度
→ 分類尺度
→ 料理尺度
```

**預期行為**

- 全店尺度顯示分類、數量、價格帶與少量內容線索；
- 當前分類原地展開成 Product ledger；
- 其他分類壓縮成仍可辨識的 landmarks；
- Product detail 在分類內原地展開。

**尚未證明**

- 摘要是否足以建立完整性信任；
- 展開／收合是否只是另一種操作負擔；
- 大小分類能否維持穩定空間；
- 是否會退化成 dashboard cards；
- 是否真的改善跨分類回想與返回。

**Disposition**：**Active hypothesis**。

**Source type**：**New hypothesis**。

## HTML 快照與來源

### Frozen originals

| 原始快照 | 路徑 | PR | Commit |
|---|---|---:|---|
| Complete menu | `research-history/originals/01-complete-menu/` | #3 | `087619c3` |
| Prototype C | `research-history/originals/02-prototype-c/` | #4 | `b554f8a4` |
| Candidate marks | `research-history/originals/03a-candidate-marks/` | #4 | `53963f4a` |
| Candidate workspace | `research-history/originals/03b-candidate-workspace/` | #4 | `5251bfcd` |
| Bounded comparison | `research-history/originals/04-bounded-comparison/` | #4 | `923be380` |

完整來源說明見 `docs/research-history/original-snapshot-provenance.md`。

### Reconstructions and hypotheses

| 快照 | 路徑 | 類型 |
|---|---|---|
| Complete menu explanation | `research-history/phases/01-complete-menu/` | Interpretive reconstruction |
| Relational explanation | `research-history/phases/02-relational-reading/` | Interpretive reconstruction |
| Candidate + comparison explanation | `research-history/phases/03-candidate-comparison/` | Interpretive reconstruction |
| Ledger document | `research-history/phases/05-ledger-document/` | New reconstruction |
| Multi-scale map | `research-history/phases/06-multiscale-menu-map/` | New hypothesis |

研究專用共用資料位於 `research-history/menu-fixture.js`；canonical source 仍是 `data/reference-menu.ts`。

## Repository 時期對照

- PR #3：Complete menu + inline detail 基線；
- PR #4：Relational、Candidate 與 bounded comparison 實驗，整體方向已拒絕；
- PR #5：digital menu document 重新定向文件；
- PR #6：研究時間線、frozen originals、重建證據與新假設。

## 跨階段可重用成果

- canonical Category／Product identity；
- reference menu 與 runtime validation；
- stable ordering；
- sold-out 與 incomplete metadata truthfulness；
- inline detail；
- keyboard、focus、Escape、scroll return、reduced motion；
- shared columns 與 bounded row cues；
- evidence source／confidence grammar；
- 以 falsification signal 判斷 revise／reject；
- 將失敗 prototype 當作正式研究證據。

## 未有新證據前不要重做

- Anchor 或 semantic axis 作為普通閱讀必要控制；
- Candidate workspace 作為所有人必經流程；
- Candidate 之外的 comparison membership；
- 一個 Product 一張大型電商卡；
- 以更多 state、surface 或按鈕代表產品進展；
- 以完整長頁作為完整菜單的唯一表達；
- 在閱讀問題未解前增加 Decision、Configuration、Current order 或 checkout。

## 下一步：直接比較，不再新增概念

使用相同內容與相同任務比較原始 Complete menu、Ledger reconstruction 與 Multi-scale hypothesis：

1. 在首屏說出餐廳類型、分類數與價格帶；
2. 比較同分類三道料理；
3. 找一道素食分享料理與一杯清爽飲料；
4. 查看料理細節後返回原位置；
5. 回想剛才料理位於哪個分類與大概位置。

需在 320px、390px 與 desktop 實際驗證 keyboard、overflow、欄位對齊、展開返回與空間回憶，再決定 Multi-scale 是新方向、早期方案的變體，或另一個應被拒絕的假設。
