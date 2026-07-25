# Menu Lens — Design Evolution and Failed Directions

手機菜單閱讀問題的設計演進、失敗方向與可重用成果。

## 文件目的

這份檔案不是目前產品規格，也不是替任何舊 prototype 辯護。它讓第一次接觸 repository 的人能快速回答：

1. 每個時期想解決什麼；
2. 使用者必須做哪些操作；
3. 哪些部分有效；
4. 哪些負擔只是被搬到別處；
5. 為什麼通過、部分保留或拒絕；
6. 哪些成果仍可重用；
7. 哪些方向不應在沒有新證據時重做。

HTML 研究入口位於：

```text
/research-history/
```

目前共有五個可操作快照，覆蓋六個研究時期：

```text
01 完整長菜單
→ 02 Relational Prototype C
→ 03 Candidate workspace
→ 04 Bounded comparison（包含於 03）
→ 05 Ledger-first document
→ 06 Multi-scale menu map
```

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
| 03 Candidate workspace | 菜單標記＋候選工作區 | 可逆保存、與購物車分離、跨分類回看 | 將短期考慮正式化成狀態管理 | **Rejected as default flow** |
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

**Disposition**：**Accepted substrate**。保留完整性、inline detail 與 continuity，但不能把長文件本身當作線性問題的完整答案。

## 02 — Relational reading

**問題**：如果使用者難以記住多道料理的絕對資訊，能否直接顯示相對關係？

```text
選一道 Anchor
+ 選一條 semantic axis
→ 其他料理顯示相對差異
```

Prototype C 同時保留 canonical order、絕對值、價格、相對關係與 evidence label。

**有效成果**

- 價格、份量與準備節奏可被 pure projection；
- shared columns 有利掃描；
- 商家確認、分類預設、低可信與未提供有明確界線。

**失敗原因**

- 使用者必須先理解 Anchor；
- 必須先選如何比較，系統才顯示關係；
- 一般排版應直接提供的差異被包裝成控制；
- 認知負擔從記憶轉移到操作與術語。

**Disposition**：**Rejected as main flow**。shared columns 與 truthful evidence 可重用；Anchor／axis 不應作為普通閱讀必要步驟。

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

**Disposition**：**Technically coherent, product-invalid**。這是工程正確不等於產品有效的主要反例。

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

**Disposition**：**Useful partial solution**。row grammar、alignment 與 inline detail 可重用，但完整長 ledger 不等於核心問題已解。

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

**Disposition**：**Active hypothesis**。不得以概念新穎取代直接任務比較。

## HTML 快照與來源

| 快照 | 路徑 | 目的 | 忠實保留的問題 |
|---|---|---|---|
| Complete menu | `research-history/phases/01-complete-menu/` | 長頁與 inline detail 基線 | viewport 限制、跨分類距離 |
| Relational Prototype C | `research-history/phases/02-relational-reading/` | 體驗 Anchor／axis 相對投影 | 先理解再操作，軸切換覆蓋前一維度 |
| Candidate + comparison | `research-history/phases/03-candidate-comparison/` | 體驗候選與再次比較選取 | 術語、重複選擇、surface transition |
| Ledger document | `research-history/phases/05-ledger-document/` | 觀察密集對齊長頁 | 30 道永久展開、跨分類線性 |
| Multi-scale map | `research-history/phases/06-multiscale-menu-map/` | 測試完整結構＋局部展開 | 展開成本、摘要可信度、空間穩定性 |

研究專用共用資料位於：

```text
research-history/menu-fixture.js
```

它只服務封閉 snapshot；canonical source 仍是 `data/reference-menu.ts`。

## Repository 時期對照

- PR #3：Complete menu + inline detail 基線；
- PR #4：Relational、Candidate 與 bounded comparison 實驗，整體方向已拒絕；
- PR #5：digital menu document 重新定向文件；
- PR #6：研究時間線與互動快照檔案。

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

使用相同內容與相同任務比較 Complete menu、Ledger 與 Multi-scale：

1. 在首屏說出餐廳類型、分類數與價格帶；
2. 比較同分類三道料理；
3. 找一道素食分享料理與一杯清爽飲料；
4. 查看料理細節後返回原位置；
5. 回想剛才料理位於哪個分類與大概位置。

需在 320px、390px 與 desktop 實際驗證 keyboard、overflow、欄位對齊、展開返回與空間回憶，再決定 Multi-scale 是新方向、早期方案的變體，或另一個應被拒絕的假設。
