# Menu Lens — Design Evolution and Failed Directions

手機菜單閱讀問題的設計演進、失敗方向與可重用成果。

## 文件目的

這份檔案不是目前產品規格，也不是替任何舊 prototype 辯護。

它用一致格式記錄每個時期：

1. 當時想解決什麼；
2. 核心假設；
3. 使用者必須做什麼；
4. 實際得到什麼；
5. 哪裡有效；
6. 哪裡失敗；
7. 為什麼停止或轉向；
8. 哪些成果仍可重用；
9. 哪些互動不應在沒有新證據時重做。

對應的 HTML 研究入口位於：

```text
/research-history/
```

第一批包含三個可操作的代表性快照：

```text
完整長菜單
→ Candidate + comparison 決策工作流
→ 多尺度菜單地圖
```

舊方向必須忠實保留當時的流程成本，不以後來的知識偷偷修正。

## 原始問題

多數 QR 菜單把紙本菜單轉成一條商品卡長頁，再提前放入規格、數量、購物車與結帳控制。

核心困難不是單純的視覺美感，而是手機 viewport 將閱讀變成線性序列：

- 離開畫面的內容暫時消失；
- 難以同時掌握全貌與局部；
- 跨分類比較依賴工作記憶；
- 分類切換容易像篩選，讓人懷疑內容被隱藏；
- 商品卡與交易控制稀釋菜單本身；
- 細節頁或 modal 破壞空間記憶與返回位置。

## 總時間線

| 階段 | 主要解法 | 處理了什麼 | 沒處理／新增了什麼 | 結論 |
|---|---|---|---|---|
| 01 Complete menu | 完整長頁＋分類跳轉＋inline detail | 完整性、分類定位、細節返回 | 長頁線性、跨分類比較、全貌與局部分離 | **Accepted substrate** |
| 02 Relational reading | Anchor＋semantic axis＋相對投影 | 將差異形式化、固定欄位、證據來源 | 使用者需先理解基準與比較軸；排版問題變成查詢操作 | **Rejected as main flow** |
| 03 Candidate workspace | 菜單標記＋候選工作區 | 可逆保存、與購物車分離、跨分類回看 | 將短期考慮正式化成狀態管理 | **Rejected as default flow** |
| 04 Bounded comparison | Candidate 之外再選 2–3 道比較 | 真實差異、上限、canonical order | 已保留仍須再選一次；流程重複 | **Technically coherent, product-invalid** |
| 05 Ledger document | 密集表列＋對齊價格／線索＋inline detail | 同分類掃描、卡片密度、資訊位置 | 仍是一條更漂亮的長頁 | **Useful partial solution** |
| 06 Multi-scale map | 全店摘要→分類展開→料理細節 | 嘗試同時保留全貌、地標與局部閱讀 | 展開成本、摘要可信度與空間穩定性尚未驗證 | **Active hypothesis** |

## 01 — Complete menu + inline detail

### 當時問題

讓使用者相信完整菜單都在場，能快速跳到分類，並查看一道料理而不離開菜單。

### 核心假設

```text
完整、穩定、連續的菜單文件
+ 原地展開細節
→ 比商品卡 feed 更容易理解與返回
```

### 使用者流程

```text
餐廳資訊
→ 分類導覽
→ 完整長菜單
→ 點一道料理原地展開
→ 關閉並回到相同位置
```

### 有效成果

- 所有分類與 Product 都存在於 canonical document；
- 分類導航移動而不過濾；
- inline detail 保留相鄰料理；
- Escape、keyboard focus、scroll return 與 reduced motion 有明確行為；
- sold-out 與缺少資料不會讓料理消失。

### 未解問題

- 菜單仍是一條長線；
- 只能看到當前 viewport；
- 遠距分類與料理之間的空間關係脆弱；
- 同分類可比較，但跨分類仍依賴記憶；
- 菜單越大，滑動與回想負擔越高。

### 結論

**Accepted substrate**。保留完整性、inline detail 與 continuity，但不能把長文件本身當作線性問題的完整答案。

## 02 — Relational reading

### 當時問題

如果使用者難以記住多道料理的絕對資訊，是否能直接顯示料理之間的相對關係？

### 核心假設

```text
選一道 Anchor
+ 選一條 semantic axis
→ 其他料理顯示相對差異
```

### UI 方法

- Prototype A：只看單一語意軸；
- Prototype B：只看 Anchor 關係；
- Prototype C：Anchor＋明確共享軸＋固定 ledger。

### 有效成果

- 價格、份量、準備節奏等差異可被 pure projection；
- canonical order 與 shared columns 有利於掃描；
- merchant-confirmed、category-default、low-confidence、missing 有清楚界線；
- 失敗 prototype 的負面證據被保留。

### 失敗原因

- 使用者必須理解 Anchor 是什麼；
- 必須先選擇如何比較，系統才顯示關係；
- 一般排版應直接提供的差異被包裝成控制；
- 認知負擔從記憶轉移到操作與術語。

### 結論

**Rejected as main flow**。shared columns 與 truthful evidence 可重用；Anchor／axis 不應作為普通閱讀的必要步驟。

## 03 — Candidate marks + workspace

### 當時問題

使用者是否需要在購物車之前保存幾道「認真考慮」的料理？

### 核心假設

```text
Product
→ reversible Candidate membership
→ Candidate workspace
```

### 使用者流程

```text
在菜單按「考慮」
→ 繼續瀏覽
→ 打開「查看考慮項目」
→ 查看／移除／回到菜單
```

### 有效成果

- Candidate 與 order item 的 state boundary 清楚；
- 不要求數量、modifier 或付款承諾；
- identity-only references 避免複製 Product；
- return context、focus recovery 與 sold-out locator 有完整規則。

### 失敗原因

- 將人的短期考慮正式化成產品狀態；
- 新增「考慮」「查看考慮項目」等術語與按鈕；
- 使用者開始管理清單，而不是讀菜單；
- 對普通大小菜單的收益不足以抵銷操作成本。

### 結論

**Rejected as default flow**。state 與 accessibility 經驗可重用，但 Candidate 不應成為理解菜單的必經流程。

## 04 — Bounded Candidate comparison

### 當時問題

如何讓兩至三道 Candidate 在手機上以 truthful、bounded 的方式比較？

### 核心假設

```text
Candidate membership
≠ comparison membership
```

因此使用者必須在 Candidate workspace 之外，再明確選擇比較集合。

### 使用者流程

```text
加入考慮
→ 打開 Candidate workspace
→ 打開比較
→ 再逐道按「比較」
→ 看到 2–3 道差異
```

### 工程成果

- 只允許目前 Candidate；
- identity-only、無重複、canonical order、最多三道；
- 第四道是 bounded no-op；
- Candidate 移除會清理 comparison selection；
- vertical dimension blocks 避免窄螢幕矩陣；
- 只顯示有意義差異、缺失與低可信證據。

### 失敗原因

使用者已經表達「我在考慮這幾道」，卻仍須再次表達「我要比較這幾道」。

狀態模型乾淨，但產品流程重複，且沒有產生相稱價值。

### 結論

**Technically coherent, product-invalid**。這是工程正確不等於產品有效的主要反例。

## 05 — Ledger-first digital document

### 當時問題

捨棄 Candidate 與 comparison workflow 後，能否僅靠排版讓同分類料理自然可比？

### 核心假設

```text
密集分類段落
+ 對齊名稱、線索與價格
+ inline detail
→ comparison through layout
```

### 有效成果

- 分類取代 Product card 成為主要視覺單位；
- 價格、份量與描述位置穩定；
- 同分類多道料理可同時掃描；
- row chrome 與交易按鈕下降；
- detail 可原地展開。

### 未解問題

- Header、分類、Product 仍依序向下延伸；
- 只改善線性清單的品質，沒有改變線性 viewport；
- 全貌與當前分類仍難同時存在；
- 跨分類跳躍與空間記憶仍脆弱。

### 結論

**Useful partial solution**。row grammar、alignment 與 inline detail 可進入後續方案；完整長 ledger 不應被誤認為核心問題已解。

## 06 — Multi-scale menu map

### 當時問題

如何在手機上保留完整菜單結構，同時避免所有 Product 永久展開成無限長頁？

### 核心假設

```text
完整結構始終可見
+ 完整內容依閱讀尺度展開
```

閱讀尺度：

```text
全店尺度
→ 分類尺度
→ 料理尺度
```

### 預期行為

- 全店尺度顯示所有分類、數量、價格帶與少量內容線索；
- 點分類後，當前分類原地展開為完整 Product ledger；
- 其他分類壓縮成仍可辨識、可切換的 landmarks；
- 點 Product 後在該分類內原地展開 detail；
- 關閉後回到相同分類與位置。

### 尚未證明

- 分類摘要是否足以建立「完整內容沒有被隱藏」的信任；
- 展開／收合是否只是另一種操作負擔；
- 不同大小分類能否保持穩定空間；
- 是否會退化成 dashboard cards；
- 是否真的改善跨分類回想與返回；
- 是否比 linear ledger 更快、更易懂。

### 結論

**Active hypothesis**。不得以概念新穎取代直接比較與使用者測試。

## 跨階段可重用成果

- canonical Category／Product identity；
- reference menu 與 runtime validation；
- stable ordering；
- sold-out 與 incomplete metadata truthfulness；
- inline detail；
- keyboard、focus、Escape、scroll return、reduced motion；
- shared columns 與 bounded row cues；
- merchant-confirmed／category-default／confidence 證據模型；
- 以 falsification signal 判斷 revise／reject 的方法；
- 將失敗 prototype 當作正式研究證據。

## 未有新證據前不要重做

- Anchor 或 semantic-axis 作為普通閱讀的必要控制；
- Candidate workspace 作為所有人必經流程；
- Candidate 之外的 comparison membership；
- 一個 Product 一張大型電商卡；
- 以更多 state、surface 或按鈕代表產品進展；
- 以「完整長頁」作為完整菜單的唯一表達；
- 在閱讀問題尚未解決前增加 Decision、Configuration、Current order 或 checkout。

## 代表性 HTML 快照

| 快照 | 目的 | 忠實保留的問題 |
|---|---|---|
| `01-complete-menu` | 觀察完整長頁與 inline detail 的基線 | 長頁、當前 viewport 限制 |
| `03-candidate-comparison` | 親自感受 Candidate 與再次比較選取的流程成本 | 術語、重複選擇、surface transition |
| `06-multiscale-menu-map` | 測試完整結構＋局部分類展開 | 展開成本、摘要可信度、空間穩定性 |

## 研究原則

1. 所有快照使用相同餐廳與相同代表料理；
2. 舊方向不得事後美化到失去原本失敗原因；
3. 快照使用封閉 HTML／CSS／少量原生 JavaScript；
4. 不共用正式 app state，不建立第二套 domain model；
5. 不呼叫 API、不保存資料、不加入 analytics；
6. 快照是研究證據，不是 production fallback；
7. 新方向必須和既有方向使用相同任務直接比較。

## 下一批

- 補上 Relational Prototype C 與 Ledger-first 快照；
- 將每一階段連回對應 PR、commit 與正式 plan；
- 加入同一組 moderated tasks 與 observation sheet；
- 在 320px、390px 與 desktop 實際驗證三個代表性快照；
- 決定 Multi-scale 是新方向、早期方向的變體，或另一個應被拒絕的假設。
