import { createModelLiveSurface } from "./model-live-surface.mjs";

export const createModelSurfacePool = ({ createSurface = createModelLiveSurface } = {}) => {
  const entries = new Map();

  const ensure = (object) => {
    let entry = entries.get(object.id);
    if (entry) return entry;
    const root = document.createElement("div");
    root.className = "model-pooled-surface";
    root.dataset.objectId = object.id;
    const surface = createSurface(root);
    entry = { objectId: object.id, root, surface };
    entries.set(object.id, entry);
    return entry;
  };

  const mount = ({ object, container, sync }) => {
    const entry = ensure(object);
    if (entry.root.parentElement !== container) container.replaceChildren(entry.root);
    sync(entry.surface, object);
    return entry;
  };

  const parkExcept = (visibleObjectIds, parkingRoot) => {
    const visible = new Set(visibleObjectIds);
    for (const [objectId, entry] of entries) {
      if (visible.has(objectId)) continue;
      if (entry.root.parentElement !== parkingRoot) parkingRoot.append(entry.root);
    }
  };

  const prune = (allowedObjectIds) => {
    const allowed = new Set(allowedObjectIds);
    for (const [objectId, entry] of entries) {
      if (allowed.has(objectId)) continue;
      entry.surface.destroy();
      entries.delete(objectId);
    }
  };

  const destroy = () => {
    for (const entry of entries.values()) entry.surface.destroy();
    entries.clear();
  };

  return {
    ensure,
    mount,
    parkExcept,
    prune,
    destroy,
    get: (objectId) => entries.get(objectId) ?? null,
    has: (objectId) => entries.has(objectId),
    values: () => [...entries.values()],
    get size() { return entries.size; },
  };
};
