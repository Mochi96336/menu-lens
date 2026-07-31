const viewModes = new Set(["all", "focus", "compare"]);
const viewportValues = new Set(["320", "390", "desktop"]);

export const sectionForObject = (model, objectId) =>
  model.sections.find((section) => section.objectIds.includes(objectId));

export const featuredSectionForModel = (model) =>
  sectionForObject(model, model.featuredObjectId) ?? model.sections[0];

export const createModelPageState = ({
  designModels,
  modelById,
  objectById,
  defaultModelId = "landscape-paper",
  location = window.location,
  history = window.history,
}) => {
  const resolve = (search = location.search) => {
    const params = new URLSearchParams(search);
    const fallbackModel = modelById.get(defaultModelId) ?? designModels[0];
    const model = modelById.get(params.get("model")) ?? fallbackModel;
    const requestedSection = model.sections.find((section) => section.id === params.get("section"));
    const section = requestedSection ?? featuredSectionForModel(model);
    let object = objectById.get(params.get("variant"));
    if (!object || !section.objectIds.includes(object.id)) {
      const preferredId = requestedSection ? section.defaultObjectId : model.featuredObjectId;
      object = objectById.get(preferredId) ?? objectById.get(section.defaultObjectId);
    }
    const viewMode = params.get("view") === "focus"
      ? "focus"
      : (params.get("compare") === "parent" ? "compare" : "all");
    return {
      model,
      section,
      object,
      viewport: viewportValues.has(params.get("viewport")) ? params.get("viewport") : "390",
      viewMode,
    };
  };

  let current = resolve();

  const snapshot = () => ({ ...current });
  const patch = (next) => {
    current = { ...current, ...next };
    if (!viewModes.has(current.viewMode)) current.viewMode = "all";
    if (!viewportValues.has(current.viewport)) current.viewport = "390";
    return snapshot();
  };

  const setModel = (model) => {
    const section = featuredSectionForModel(model);
    const object = objectById.get(model.featuredObjectId) ?? objectById.get(section.defaultObjectId);
    return patch({ model, section, object, viewMode: "all" });
  };

  const setSection = (section) => patch({
    section,
    object: objectById.get(section.defaultObjectId),
    viewMode: "all",
  });

  const setObject = (object) => patch({ object });
  const setViewport = (viewport) => patch({ viewport });
  const setViewMode = (viewMode) => patch({ viewMode });

  const replaceFromLocation = () => {
    current = resolve(location.search);
    return snapshot();
  };

  const buildUrl = () => {
    const params = new URLSearchParams({
      model: current.model.id,
      section: current.section.id,
      variant: current.object.id,
      viewport: current.viewport,
    });
    if (current.viewMode === "focus") params.set("view", "focus");
    if (current.viewMode === "compare" && current.object.researchParentId) {
      params.set("compare", "parent");
    }
    return `?${params.toString()}${location.hash ?? ""}`;
  };

  const commitUrl = (mode = "replace") => {
    if (!mode) return;
    const url = buildUrl();
    if (mode === "push" && typeof history.pushState === "function") {
      history.pushState(null, "", url);
    } else if (typeof history.replaceState === "function") {
      history.replaceState(null, "", url);
    }
  };

  return {
    get value() { return snapshot(); },
    patch,
    setModel,
    setSection,
    setObject,
    setViewport,
    setViewMode,
    replaceFromLocation,
    buildUrl,
    commitUrl,
  };
};
