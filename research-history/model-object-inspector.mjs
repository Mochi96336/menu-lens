const asArray = (value) => Array.isArray(value) ? value : [];

const makeText = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
};

export const createModelObjectInspector = ({
  elements,
  objectById,
  catalog,
  presentationNotes,
  stoppedDispositions,
  combinedObjectIds,
  dispositionLabels,
  dispositionExplanations,
  evidenceLabels,
  evidenceExplanations,
  objectLabel,
  setStatus,
  sourcePresentation,
  archivePath,
  onNavigate,
}) => {
  let activeTab = "summary";

  const setTab = (tab) => {
    activeTab = ["summary", "relations", "records"].includes(tab) ? tab : "summary";
    for (const button of elements.tabs.querySelectorAll("[data-inspector-tab]")) {
      const selected = button.dataset.inspectorTab === activeTab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    elements.summaryPanel.hidden = activeTab !== "summary";
    elements.relationsPanel.hidden = activeTab !== "relations";
    elements.recordsPanel.hidden = activeTab !== "records";
  };

  for (const button of elements.tabs.querySelectorAll("[data-inspector-tab]")) {
    button.addEventListener("click", () => setTab(button.dataset.inspectorTab));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const buttons = [...elements.tabs.querySelectorAll("[data-inspector-tab]")];
      const index = buttons.indexOf(button);
      const nextIndex = event.key === "Home"
        ? 0
        : (event.key === "End"
          ? buttons.length - 1
          : ((index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length));
      buttons[nextIndex].focus();
      setTab(buttons[nextIndex].dataset.inspectorTab);
    });
  }

  const describeReferences = (ids) => asArray(ids)
    .map((id) => objectById.get(id))
    .filter(Boolean)
    .map(objectLabel)
    .join("、");

  const differenceCopy = ({ model, section, object }) => {
    const parent = object.researchParentId ? objectById.get(object.researchParentId) : null;
    const note = presentationNotes[object.id];

    if (object.objectType === "study") {
      const targetIds = asArray(object.evidenceFor).filter((id) => objectById.has(id));
      return {
        eyebrow: "研究工具",
        variable: targetIds.length ? targetIds.join(" / ") + " 盲測" : "比較研究流程",
        beforeLabel: "比較對象",
        before: describeReferences(object.evidenceFor) || parent?.summary || "尚未記錄比較對象。",
        afterLabel: "研究流程",
        after: object.summary,
        unchangedLabel: "判讀限制",
        unchanged: "研究工具是否可執行，不等於其中任何 prototype 已獲採用。",
      };
    }

    if (object.objectType === "correction") {
      const targets = describeReferences(object.evidenceFor);
      return {
        eyebrow: "必要修正",
        variable: note?.variable ?? "可信閱讀的必要修正",
        beforeLabel: "問題",
        before: note?.before ?? (targets || parent?.summary || "沒有獨立 prototype parent。"),
        afterLabel: "修正",
        after: note?.after ?? object.summary,
        unchangedLabel: "研究邊界",
        unchanged: note?.unchanged ?? (parent
          ? `${parent.id} 的核心模型、內容身份與主要 interaction grammar 維持不變。`
          : model.retains),
      };
    }

    if (stoppedDispositions.has(object.disposition)) {
      return {
        eyebrow: "停止結果",
        variable: note?.variable ?? "停止原因",
        beforeLabel: "嘗試",
        before: note ? `${note.variable}：${note.after}` : object.summary,
        afterLabel: "觀察限制",
        after: object.summary,
        unchangedLabel: "處理方式",
        unchanged: object.nextGate ?? "保留為負面證據，不再沿此路線延伸。",
      };
    }

    if (note) {
      return {
        eyebrow: "受控變因",
        variable: note.variable,
        beforeLabel: "調整前",
        before: note.before,
        afterLabel: "調整後",
        after: note.after,
        unchangedLabel: "保留條件",
        unchanged: note.unchanged,
      };
    }

    if (combinedObjectIds.has(object.id)) {
      return {
        eyebrow: "組合機制",
        variable: "既有機制的組合實作",
        beforeLabel: "沿用條件",
        before: parent?.summary ?? model.substrate,
        afterLabel: "組合內容",
        after: object.summary,
        unchangedLabel: "研究邊界",
        unchanged: "各機制仍需分開判讀；此物件不建立新的綜合產品方向。",
      };
    }

    const isBaseline = object.id === section.defaultObjectId;
    if (!parent || isBaseline) {
      return {
        eyebrow: "比較基準",
        variable: section.title,
        beforeLabel: "來源脈絡",
        before: parent?.summary ?? "此物件是目前子研究的起點。",
        afterLabel: "目前物件",
        after: object.summary,
        unchangedLabel: "保留條件",
        unchanged: model.retains,
      };
    }

    return {
      eyebrow: "模型轉換",
      variable: section.title,
      beforeLabel: "前一模型",
      before: parent.summary,
      afterLabel: "新增假設",
      after: object.summary,
      unchangedLabel: "保留條件",
      unchanged: model.retains,
    };
  };

  const renderOutcomeValue = (root, canonicalValue, explanation) => {
    root.replaceChildren(
      makeText("strong", "", canonicalValue),
      makeText("small", "", explanation),
    );
    root.className = "model-outcome-value";
  };

  const renderSummary = (context) => {
    const copy = differenceCopy(context);
    elements.differenceEyebrow.textContent = copy.eyebrow;
    elements.differenceVariable.textContent = copy.variable;
    elements.differenceBeforeLabel.textContent = copy.beforeLabel;
    elements.differenceBefore.textContent = copy.before;
    elements.differenceAfterLabel.textContent = copy.afterLabel;
    elements.differenceAfter.textContent = copy.after;
    elements.differenceUnchangedLabel.textContent = copy.unchangedLabel;
    elements.differenceUnchanged.textContent = copy.unchanged;

    const object = context.object;
    renderOutcomeValue(
      elements.outcomeDisposition,
      dispositionLabels[object.disposition] ?? object.disposition,
      dispositionExplanations[object.disposition] ?? "Canonical catalog disposition。",
    );
    renderOutcomeValue(
      elements.outcomeEvidence,
      evidenceLabels[object.evidenceState] ?? object.evidenceState,
      evidenceExplanations[object.evidenceState] ?? "Canonical catalog evidence state。",
    );

    if (stoppedDispositions.has(object.disposition)) {
      elements.outcomeTitle.textContent = "停止原因";
      elements.outcomeNextLabel.textContent = "後續限制";
    } else if (object.objectType === "study") {
      elements.outcomeTitle.textContent = "研究狀態";
      elements.outcomeNextLabel.textContent = "研究條件";
    } else if (object.objectType === "correction") {
      elements.outcomeTitle.textContent = "研究狀態";
      elements.outcomeNextLabel.textContent = "研究邊界";
    } else {
      elements.outcomeTitle.textContent = "研究狀態";
      elements.outcomeNextLabel.textContent = "下一步";
    }
    elements.outcomeNextRow.hidden = !object.nextGate;
    elements.outcomeNextGate.textContent = object.nextGate ?? "";
  };

  const makeObjectButton = (object) => {
    const button = makeText("button", "", objectLabel(object));
    button.type = "button";
    button.addEventListener("click", () => onNavigate(object.id));
    return button;
  };

  const makeRelationGroup = (title, description, objects) => {
    const section = document.createElement("section");
    section.className = "model-lineage-group";
    section.append(makeText("h3", "", title), makeText("p", "", description));
    if (!objects.length) {
      section.append(makeText("p", "model-lineage-empty", "沒有記錄。"));
      return section;
    }
    const list = document.createElement("ul");
    for (const object of objects) {
      const item = document.createElement("li");
      item.append(makeObjectButton(object));
      list.append(item);
    }
    section.append(list);
    return section;
  };

  const renderRelations = ({ section, object }) => {
    const parent = object.researchParentId ? objectById.get(object.researchParentId) : null;
    const sameStudy = [...new Set(section.objectIds)]
      .filter((id) => id !== object.id && id !== parent?.id)
      .slice(0, 8)
      .map((id) => objectById.get(id))
      .filter(Boolean);
    const relatedIds = new Set([
      ...asArray(object.dependsOn),
      ...asArray(object.mechanismsFrom),
      ...asArray(object.evidenceFor),
      ...catalog.objects.filter((item) => item.researchParentId === object.id).map((item) => item.id),
    ]);
    relatedIds.delete(object.id);
    if (parent) relatedIds.delete(parent.id);
    const related = [...relatedIds].map((id) => objectById.get(id)).filter(Boolean);

    elements.relations.replaceChildren(
      makeRelationGroup("Parent", "Catalog 記錄的直接 parent。", parent ? [parent] : []),
      makeRelationGroup("同組物件", "同一子研究中的其他研究物件。", sameStudy),
      makeRelationGroup("明確關係", "Catalog 記錄的 children、dependsOn、mechanismsFrom 與 evidenceFor。", related),
    );
  };

  const makeRecordLink = (label, title, href, kind = "research") => {
    const link = document.createElement("a");
    link.className = "model-record-link";
    link.dataset.recordKind = kind;
    link.href = href;
    if (href.startsWith("https://")) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    link.append(makeText("small", "", label), makeText("strong", "", title));
    return link;
  };

  const renderRecords = ({ object }) => {
    const links = [];
    if (object.entrypoint) {
      const source = sourcePresentation(object);
      links.push(makeRecordLink(
        source.recordLabel,
        source.recordTitle,
        archivePath(object.entrypoint),
        "primary",
      ));
    }
    if (object.reviewDocument) {
      links.push(makeRecordLink("Research record", "查看 review record", archivePath(object.reviewDocument)));
    }
    if (object.evidencePath) {
      links.push(makeRecordLink("Evidence", "開啟 evidence artifact", archivePath(object.evidencePath)));
    }
    if (object.sourcePr) {
      links.push(makeRecordLink(
        "Source PR",
        `PR #${object.sourcePr}`,
        `https://github.com/a20030824/menu-lens/pull/${object.sourcePr}`,
        "provenance",
      ));
    }
    if (object.sourceCommit) {
      links.push(makeRecordLink(
        "Source commit",
        object.sourceCommit.slice(0, 12),
        `https://github.com/a20030824/menu-lens/commit/${object.sourceCommit}`,
        "provenance",
      ));
    }
    links.push(makeRecordLink("Catalog", "返回完整研究物件目錄", "../#catalog", "provenance"));

    if (!object.entrypoint) {
      const note = document.createElement("div");
      note.className = "model-record-note";
      note.append(
        makeText("small", "", "Executable boundary"),
        makeText("strong", "", "此物件沒有獨立 prototype entrypoint"),
      );
      links.unshift(note);
    }
    elements.records.replaceChildren(...links);
  };

  const render = (context) => {
    const { object } = context;
    elements.role.textContent = differenceCopy(context).eyebrow;
    elements.title.textContent = object.objectType === "study"
      ? object.id + " · 研究工具"
      : (object.objectType === "correction" ? object.id + " · 必要修正" : objectLabel(object));
    setStatus(elements.status, object);
    renderSummary(context);
    renderRelations(context);
    renderRecords(context);
    setTab(activeTab);
  };

  setTab("summary");
  return { render, setTab, get activeTab() { return activeTab; } };
};
