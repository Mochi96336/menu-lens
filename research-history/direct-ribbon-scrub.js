/* Direct manipulation for the existing 09 minimap viewport window. */
(() => {
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const productIndexFromPointer = ({ clientX, left, width, productCount }) => {
    if (!Number.isFinite(clientX) || !Number.isFinite(left) || !Number.isFinite(width)) {
      throw new Error("Direct ribbon scrub requires finite pointer geometry.");
    }
    if (!Number.isInteger(productCount) || productCount < 1) {
      throw new Error("Direct ribbon scrub requires at least one Product.");
    }

    const ratio = clamp((clientX - left) / Math.max(1, width), 0, 1);
    return Math.min(productCount - 1, Math.floor(ratio * productCount));
  };

  window.menuLensRibbonProductIndexFromPointer = productIndexFromPointer;

  window.enableMenuLensDirectRibbonScrub = (options) => {
    const {
      minimap,
      windowControl,
      productCount,
      getScale,
      enterReading,
      moveReading,
    } = options;

    if (!(minimap instanceof HTMLElement) || !(windowControl instanceof HTMLElement)) {
      throw new Error("Direct ribbon scrub requires minimap and window elements.");
    }

    let activePointerId = null;
    let animationFrame = null;
    let queuedClientX = null;

    const moveToClientX = (clientX) => {
      const bounds = minimap.getBoundingClientRect();
      const index = productIndexFromPointer({
        clientX,
        left: bounds.left,
        width: bounds.width,
        productCount,
      });
      if (getScale() === "overview") {
        enterReading(index);
      } else {
        moveReading(index);
      }
    };

    const flushPointer = () => {
      animationFrame = null;
      if (queuedClientX === null) return;
      const clientX = queuedClientX;
      queuedClientX = null;
      moveToClientX(clientX);
    };

    const queuePointer = (clientX) => {
      queuedClientX = clientX;
      if (animationFrame === null) animationFrame = requestAnimationFrame(flushPointer);
    };

    windowControl.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      event.stopPropagation();
      activePointerId = event.pointerId;
      windowControl.setPointerCapture(event.pointerId);
      windowControl.classList.add("is-scrubbing");
      queuePointer(event.clientX);
    });

    windowControl.addEventListener("pointermove", (event) => {
      if (event.pointerId !== activePointerId) return;
      event.preventDefault();
      queuePointer(event.clientX);
    });

    const finishPointer = (event) => {
      if (event.pointerId !== activePointerId) return;
      queuePointer(event.clientX);
      activePointerId = null;
      if (windowControl.hasPointerCapture(event.pointerId)) {
        windowControl.releasePointerCapture(event.pointerId);
      }
      windowControl.classList.remove("is-scrubbing");
    };

    windowControl.addEventListener("pointerup", finishPointer);
    windowControl.addEventListener("pointercancel", finishPointer);

    windowControl.addEventListener("keydown", (event) => {
      const current = Number(windowControl.getAttribute("aria-valuenow")) - 1;
      let nextIndex = null;
      if (event.key === "ArrowLeft") nextIndex = current - 1;
      if (event.key === "ArrowRight") nextIndex = current + 1;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = productCount - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      event.stopPropagation();
      const boundedIndex = clamp(nextIndex, 0, productCount - 1);
      if (getScale() === "overview") {
        enterReading(boundedIndex);
      } else {
        moveReading(boundedIndex);
      }
    });

    return {
      stop() {
        if (animationFrame !== null) cancelAnimationFrame(animationFrame);
        animationFrame = null;
        queuedClientX = null;
      },
    };
  };
})();