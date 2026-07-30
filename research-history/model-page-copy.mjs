const workbench = document.querySelector("#workbench");

if (workbench) {
  const elements = {
    role: document.querySelector("#difference-eyebrow"),
    stageRole: document.querySelector("#stage-context-role"),
    stageCopy: document.querySelector("#stage-context-copy"),
    beforeLabel: document.querySelector("#difference-before-label"),
    before: document.querySelector("#difference-before"),
    afterLabel: document.querySelector("#difference-after-label"),
    after: document.querySelector("#difference-after"),
    unchangedLabel: document.querySelector("#difference-unchanged-label"),
    unchanged: document.querySelector("#difference-unchanged"),
    nextLabel: document.querySelector("#outcome-next-label"),
  };

  const roleLabels = new Map([
    ["Isolated difference", "受控變因"],
    ["Combined mechanisms", "組合機制"],
    ["Prerequisite correction", "必要修正"],
    ["Study role", "研究工具"],
    ["Stopped result", "停止結果"],
    ["Sub-study baseline", "比較基準"],
    ["Model transition", "模型轉換"],
  ]);

  const fieldLabels = new Map([
    ["Parent／Before", "調整前"],
    ["Current／After", "調整後"],
    ["未改變", "保留條件"],
    ["Tests", "研究對象"],
    ["Study instrument", "研究工具"],
    ["Does not establish", "證據邊界"],
    ["Problem", "問題"],
    ["Correction", "修正"],
    ["Research boundary", "研究邊界"],
    ["Attempt", "嘗試"],
    ["Observed limit", "觀察限制"],
    ["Consequence", "處理方式"],
    ["Inherited", "沿用條件"],
    ["Combined", "組合內容"],
    ["Still excluded", "研究邊界"],
    ["較早脈絡", "來源脈絡"],
    ["研究起點", "研究起點"],
    ["目前角色", "目前物件"],
    ["比較邊界", "保留條件"],
    ["Previous model", "前一模型"],
    ["New assumption", "新增假設"],
    ["Open boundary", "保留條件"],
  ]);

  const nextLabels = new Map([
    ["Next gate", "下一步"],
    ["Study gate", "研究條件"],
    ["後續限制", "後續限制"],
    ["研究邊界", "研究邊界"],
  ]);

  let observer;
  let scheduled = false;

  const translated = (map, text) => map.get(text.trim()) ?? text.trim();

  const syncCopy = () => {
    scheduled = false;
    observer?.disconnect();

    if (elements.role) {
      const role = translated(roleLabels, elements.role.textContent);
      elements.role.textContent = role;
      if (elements.stageRole) elements.stageRole.textContent = role;
    }

    for (const element of [elements.beforeLabel, elements.afterLabel, elements.unchangedLabel]) {
      if (element) element.textContent = translated(fieldLabels, element.textContent);
    }

    if (elements.nextLabel) {
      elements.nextLabel.textContent = translated(nextLabels, elements.nextLabel.textContent);
    }

    if (elements.stageCopy) {
      const after = elements.after?.textContent.trim() ?? "";
      const unchanged = elements.unchanged?.textContent.trim() ?? "";
      const role = elements.role?.textContent.trim() ?? "";
      if (role === "受控變因") {
        elements.stageCopy.textContent = [after, unchanged].filter(Boolean).join(" ");
      } else if (role === "停止結果") {
        elements.stageCopy.textContent = [after, unchanged].filter(Boolean).join(" ");
      } else {
        const before = elements.before?.textContent.trim() ?? "";
        elements.stageCopy.textContent = [before, after].filter(Boolean).join(" ");
      }
    }

    observer?.observe(workbench, { childList: true, characterData: true, subtree: true });
  };

  const scheduleSync = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(syncCopy);
  };

  observer = new MutationObserver(scheduleSync);
  syncCopy();
}
