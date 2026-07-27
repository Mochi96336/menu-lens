/* Pointer-based horizontal drag for spatial research prototypes. */
(() => {
  window.enableMenuLensHorizontalDrag = (element, options = {}) => {
    const enabled = options.enabled ?? (() => true);
    const onSettle = options.onSettle ?? (() => {});
    const threshold = options.threshold ?? 7;
    let gesture = null;
    let animationFrame = null;
    let suppressClickUntil = 0;

    const stopInertia = () => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };

    const settle = () => {
      element.classList.remove("is-dragging");
      onSettle();
    };

    const startInertia = (initialVelocity) => {
      stopInertia();
      let velocity = initialVelocity;
      let previousTime = performance.now();

      const step = (now) => {
        const elapsed = Math.min(32, now - previousTime);
        previousTime = now;
        const previousLeft = element.scrollLeft;
        element.scrollLeft += velocity * elapsed;
        const hitBoundary = Math.abs(element.scrollLeft - previousLeft) < 0.2;
        velocity *= Math.pow(0.9, elapsed / 16);

        if (Math.abs(velocity) < 0.025 || hitBoundary) {
          animationFrame = null;
          settle();
          return;
        }
        animationFrame = requestAnimationFrame(step);
      };

      if (Math.abs(velocity) < 0.04) {
        settle();
        return;
      }
      animationFrame = requestAnimationFrame(step);
    };

    element.addEventListener("pointerdown", (event) => {
      if (!enabled() || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      stopInertia();
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: element.scrollLeft,
        lastScrollLeft: element.scrollLeft,
        lastTime: performance.now(),
        velocity: 0,
        axis: null,
      };
    });

    element.addEventListener("pointermove", (event) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;

      if (gesture.axis === null && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= threshold) {
        gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.12 ? "horizontal" : "vertical";
        if (gesture.axis === "horizontal") {
          element.setPointerCapture(event.pointerId);
          element.classList.add("is-dragging");
        }
      }

      if (gesture.axis !== "horizontal") return;
      event.preventDefault();
      element.scrollLeft = gesture.startScrollLeft - deltaX;
      const now = performance.now();
      const elapsed = Math.max(1, now - gesture.lastTime);
      const instantaneousVelocity = (element.scrollLeft - gesture.lastScrollLeft) / elapsed;
      gesture.velocity = gesture.velocity * 0.55 + instantaneousVelocity * 0.45;
      gesture.lastScrollLeft = element.scrollLeft;
      gesture.lastTime = now;
    });

    const finishPointer = (event, cancelled = false) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const completed = gesture;
      gesture = null;

      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
      if (completed.axis !== "horizontal") return;

      if (cancelled) {
        stopInertia();
        settle();
        return;
      }

      suppressClickUntil = performance.now() + 320;
      startInertia(completed.velocity);
    };

    element.addEventListener("pointerup", finishPointer);
    element.addEventListener("pointercancel", (event) => finishPointer(event, true));
    element.addEventListener(
      "click",
      (event) => {
        if (performance.now() >= suppressClickUntil) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true,
    );

    return { stop: stopInertia };
  };
})();
