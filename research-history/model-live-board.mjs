// Card roles distinguish active selection, research tools, and explicit comparison positions.
export const createModelLiveBoard = ({
  boardRoot,
  surfacePool,
  objectLabel,
  setStatus,
  syncSurface,
  cardPresentation,
  onSelect,
}) => {
  const cards = new Map();

  const createCard = (object) => {
    const card = document.createElement("article");
    card.className = "model-live-card";
    card.dataset.objectId = object.id;

    const header = document.createElement("header");
    const role = document.createElement("span");
    role.className = "model-live-card__role phase-index";
    role.hidden = true;

    const select = document.createElement("button");
    select.type = "button";
    select.className = "model-live-card__select";
    select.dataset.allObjectId = object.id;
    const title = document.createElement("strong");
    const meta = document.createElement("small");
    meta.className = "model-live-card__meta";
    select.append(title, meta);
    select.addEventListener("click", () => onSelect(object));

    const status = document.createElement("span");
    status.className = "status";

    header.append(role, select, status);
    const surface = document.createElement("div");
    surface.className = "model-live-card__surface";
    card.append(header, surface);

    const entry = { card, role, select, title, meta, status, surface };
    cards.set(object.id, entry);
    return entry;
  };

  const syncCard = (entry, object, active) => {
    const presentation = cardPresentation(object);
    entry.card.dataset.current = String(active);
    entry.card.dataset.objectType = object.objectType;
    entry.select.setAttribute("aria-current", String(active));
    entry.title.textContent = presentation.title;
    entry.meta.textContent = presentation.meta;
    entry.meta.hidden = !presentation.meta;
    setStatus(entry.status, object);
  };

  const syncSection = (objects, activeObject, extraObjects = []) => {
    const orderedObjects = [...objects];
    for (const object of extraObjects) {
      if (object && !orderedObjects.some((candidate) => candidate.id === object.id)) orderedObjects.push(object);
    }
    const allowed = new Set(orderedObjects.map((object) => object.id));
    surfacePool.prune(allowed);

    for (const [objectId, entry] of cards) {
      if (allowed.has(objectId)) continue;
      entry.card.remove?.();
      cards.delete(objectId);
    }

    const orderedEntries = orderedObjects.map((object) => cards.get(object.id) ?? createCard(object));
    const orderChanged = orderedEntries.length !== boardRoot.children.length
      || orderedEntries.some((entry, index) => boardRoot.children[index] !== entry.card);
    if (orderChanged) boardRoot.replaceChildren(...orderedEntries.map((entry) => entry.card));

    for (const object of orderedObjects) {
      const entry = cards.get(object.id);
      syncCard(entry, object, object.id === activeObject.id);
      surfacePool.mount({
        object,
        container: entry.surface,
        sync: (surface, target) => syncSurface(surface, target, "本組"),
      });
    }
    return orderedObjects;
  };

  const revealActiveCard = (activeObjectId) => {
    const card = cards.get(activeObjectId)?.card;
    if (!card) return;
    const reveal = () => card.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(reveal));
    } else reveal();
  };

  const resetFilteredBoardPosition = (activeObjectId, viewMode) => {
    if (viewMode === "all") return;
    const card = cards.get(activeObjectId)?.card;
    if (!card) return;
    const reset = () => {
      const boardWidth = boardRoot.getBoundingClientRect?.().width ?? boardRoot.clientWidth;
      const cardWidth = card.getBoundingClientRect?.().width ?? card.offsetWidth;
      const cardFits = cardWidth <= boardWidth + 1;
      boardRoot.style.scrollSnapType = "none";
      boardRoot.style.justifyContent = "flex-start";
      card.style.marginInline = viewMode === "focus" && cardFits ? "auto" : "0";

      const finalize = () => { boardRoot.scrollLeft = 0; };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(finalize);
      else finalize();
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(reset));
    } else reset();
  };

  const render = ({ objects, activeObject, parent = null, viewMode, viewport }) => {
    boardRoot.hidden = false;
    boardRoot.dataset.viewMode = viewMode;
    boardRoot.dataset.viewport = viewport;
    const sectionObjects = syncSection(
      objects,
      activeObject,
      viewMode === "compare" && parent ? [parent] : [],
    );

    for (const [index, object] of sectionObjects.entries()) {
      const entry = cards.get(object.id);
      const isActive = object.id === activeObject.id;
      const isParent = viewMode === "compare" && object.id === parent?.id;
      const visible = viewMode === "all" || isActive || isParent;
      entry.card.hidden = !visible;
      entry.card.style.order = viewMode === "compare"
        ? String(isActive ? 0 : (isParent ? 1 : index + 2))
        : String(index);
      entry.card.style.marginInline = "";
      let roleText = "";
      if (viewMode === "compare" && visible) {
        roleText = isActive ? "比較對象" : (isParent ? "比較基準" : "");
      } else if (object.objectType === "study") {
        roleText = "研究工具";
      } else if (object.objectType === "correction") {
        roleText = "必要修正";
      } else if (isActive) {
        roleText = "已選取";
      }
      entry.role.hidden = !roleText;
      entry.role.textContent = roleText;
    }

    if (viewMode === "all") {
      boardRoot.style.justifyContent = "";
      boardRoot.style.scrollSnapType = "";
      revealActiveCard(activeObject.id);
    } else {
      resetFilteredBoardPosition(activeObject.id, viewMode);
    }
  };

  return {
    render,
    getCard: (objectId) => cards.get(objectId) ?? null,
    get cardCount() { return cards.size; },
  };
};
