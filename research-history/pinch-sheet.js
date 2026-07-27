/* Shared two-pointer camera for the 18-derived paper-sheet prototypes. */
(() => {
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  window.createMenuLensPinchCamera = (viewport, sheet, options = {}) => {
    if (!(viewport instanceof HTMLElement) || !(sheet instanceof HTMLElement)) {
      throw new Error("Pinch camera requires a viewport and sheet element.");
    }

    const minimumScale = options.minimumScale ?? 1;
    const maximumScale = options.maximumScale ?? 3.2;
    const pointers = new Map();
    const state = { scale: minimumScale, x: 0, y: 0 };
    let gesture = null;
    let suppressClickUntil = 0;

    const notify = () => options.onChange?.({ ...state });

    const clampTranslation = () => {
      const rightInset = viewport.clientWidth - sheet.offsetLeft - sheet.offsetWidth;
      const bottomInset = viewport.clientHeight - sheet.offsetTop - sheet.offsetHeight;
      const minimumX = viewport.clientWidth - rightInset - sheet.offsetLeft - sheet.offsetWidth * state.scale;
      const minimumY = viewport.clientHeight - bottomInset - sheet.offsetTop - sheet.offsetHeight * state.scale;
      state.x = clamp(state.x, Math.min(0, minimumX), 0);
      state.y = clamp(state.y, Math.min(0, minimumY), 0);
      if (state.scale <= minimumScale + 0.001) {
        state.x = 0;
        state.y = 0;
      }
    };

    const render = (animate = false) => {
      clampTranslation();
      sheet.classList.toggle("is-camera-animating", animate);
      sheet.style.setProperty("--camera-x", `${state.x}px`);
      sheet.style.setProperty("--camera-y", `${state.y}px`);
      sheet.style.setProperty("--camera-scale", String(state.scale));
      viewport.dataset.cameraDepth = state.scale <= minimumScale + 0.04 ? "overview" : "reading";
      notify();
      if (animate) {
        window.setTimeout(() => sheet.classList.remove("is-camera-animating"), 260);
      }
    };

    const pointInViewport = (clientX, clientY) => {
      const bounds = viewport.getBoundingClientRect();
      return { x: clientX - bounds.left - sheet.offsetLeft, y: clientY - bounds.top - sheet.offsetTop };
    };

    const beginPan = (pointer) => {
      gesture = {
        type: "pan",
        startX: pointer.x,
        startY: pointer.y,
        cameraX: state.x,
        cameraY: state.y,
        moved: false,
      };
    };

    const beginPinch = () => {
      const [first, second] = [...pointers.values()];
      const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const localCenter = pointInViewport(center.x, center.y);
      gesture = {
        type: "pinch",
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        scale: state.scale,
        anchorX: (localCenter.x - state.x) / state.scale,
        anchorY: (localCenter.y - state.y) / state.scale,
        moved: false,
      };
    };

    const setScaleAt = (nextScale, clientX, clientY, animate = false) => {
      const targetScale = clamp(nextScale, minimumScale, maximumScale);
      const point = pointInViewport(clientX, clientY);
      const anchorX = (point.x - state.x) / state.scale;
      const anchorY = (point.y - state.y) / state.scale;
      state.scale = targetScale;
      state.x = point.x - anchorX * targetScale;
      state.y = point.y - anchorY * targetScale;
      render(animate);
    };

    viewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      viewport.classList.add("is-camera-gesturing");
      if (pointers.size === 1) beginPan(pointers.values().next().value);
      else if (pointers.size === 2) beginPinch();
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size >= 2) {
        if (gesture?.type !== "pinch") beginPinch();
        const [first, second] = [...pointers.values()];
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
        const localCenter = pointInViewport(center.x, center.y);
        state.scale = clamp(gesture.scale * (distance / Math.max(1, gesture.distance)), minimumScale, maximumScale);
        state.x = localCenter.x - gesture.anchorX * state.scale;
        state.y = localCenter.y - gesture.anchorY * state.scale;
        gesture.moved ||= Math.abs(distance - gesture.distance) > 4;
        render();
        event.preventDefault();
        return;
      }

      if (gesture?.type !== "pan" || state.scale <= minimumScale + 0.01) return;
      const pointer = pointers.values().next().value;
      const deltaX = pointer.x - gesture.startX;
      const deltaY = pointer.y - gesture.startY;
      state.x = gesture.cameraX + deltaX;
      state.y = gesture.cameraY + deltaY;
      gesture.moved ||= Math.hypot(deltaX, deltaY) > 5;
      render();
      event.preventDefault();
    });

    const endPointer = (event) => {
      if (!pointers.has(event.pointerId)) return;
      const moved = gesture?.moved;
      pointers.delete(event.pointerId);
      if (moved) suppressClickUntil = performance.now() + 320;
      if (pointers.size === 1) beginPan(pointers.values().next().value);
      else if (pointers.size === 0) {
        gesture = null;
        viewport.classList.remove("is-camera-gesturing");
      } else {
        beginPinch();
      }
    };

    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);
    viewport.addEventListener("click", (event) => {
      if (performance.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    viewport.addEventListener("wheel", (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      setScaleAt(state.scale * Math.exp(-event.deltaY * 0.012), event.clientX, event.clientY);
    }, { passive: false });

    const camera = {
      reset() {
        state.scale = minimumScale;
        state.x = 0;
        state.y = 0;
        render(true);
      },
      zoomBy(factor) {
        const bounds = viewport.getBoundingClientRect();
        setScaleAt(state.scale * factor, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, true);
      },
      focusElement(element, targetScale, focusOptions = {}) {
        const elementBounds = element.getBoundingClientRect();
        const sheetBounds = sheet.getBoundingClientRect();
        const localCenterX = (elementBounds.left + elementBounds.width / 2 - sheetBounds.left) / state.scale;
        const localCenterY = (elementBounds.top + elementBounds.height / 2 - sheetBounds.top) / state.scale;
        const localTop = (elementBounds.top - sheetBounds.top) / state.scale;
        state.scale = clamp(targetScale, minimumScale, maximumScale);
        state.x = (viewport.clientWidth / 2 - sheet.offsetLeft) - localCenterX * state.scale;
        if (focusOptions.alignY === "start") {
          const padding = focusOptions.padding ?? sheet.offsetTop;
          state.y = padding - sheet.offsetTop - localTop * state.scale;
        } else {
          state.y = (viewport.clientHeight / 2 - sheet.offsetTop) - localCenterY * state.scale;
        }
        render(true);
      },
      getState() {
        return { ...state };
      },
    };

    window.addEventListener("resize", () => render());
    render();
    return camera;
  };
})();
