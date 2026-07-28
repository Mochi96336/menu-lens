(() => {
  const settleLayout = (callback) => {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  };

  window.createMenuLensMultiscaleController = ({ root, collapseAll, scaleLabel, screen = root?.closest('.multiscale-screen') }) => {
    if (!(root instanceof HTMLElement) || !(collapseAll instanceof HTMLButtonElement) || !(scaleLabel instanceof HTMLElement)) {
      throw new Error('Multi-scale controller requires root, reset button, and scale label.');
    }

    const categories = [...root.querySelectorAll('.scale-category')];
    const details = [...root.querySelectorAll('.scale-product')];
    let expandedCategory = null;
    let returnContext = null;

    const applyExpandedState = (target) => {
      categories.forEach((category) => {
        const expanded = category === target;
        category.dataset.expanded = String(expanded);
        category.querySelector(':scope > button').setAttribute('aria-expanded', String(expanded));
        if (!expanded) category.querySelectorAll('details[open]').forEach((detail) => detail.removeAttribute('open'));
      });
      expandedCategory = target;
      collapseAll.disabled = !target;
      if (screen) screen.dataset.focused = String(Boolean(target));
      scaleLabel.textContent = target
        ? `分類尺度 · ${target.querySelector('.scale-category-title').textContent}`
        : '全店尺度';
    };

    const expandCategory = (target) => {
      const sourceButton = target.querySelector(':scope > button');
      returnContext = {
        button: sourceButton,
        viewportTop: sourceButton.getBoundingClientRect().top,
      };
      applyExpandedState(target);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    const returnToOverview = () => {
      const context = returnContext ?? (expandedCategory
        ? { button: expandedCategory.querySelector(':scope > button'), viewportTop: expandedCategory.querySelector(':scope > button').getBoundingClientRect().top }
        : null);
      details.forEach((detail) => detail.removeAttribute('open'));
      applyExpandedState(null);
      settleLayout(() => {
        if (!context) return;
        const currentTop = context.button.getBoundingClientRect().top;
        const documentElement = document.documentElement;
        const previousScrollBehavior = documentElement.style.scrollBehavior;
        documentElement.style.scrollBehavior = 'auto';
        window.scrollBy({ top: currentTop - context.viewportTop, behavior: 'auto' });
        context.button.focus({ preventScroll: true });
        requestAnimationFrame(() => { documentElement.style.scrollBehavior = previousScrollBehavior; });
        returnContext = null;
      });
    };

    categories.forEach((category) => {
      const button = category.querySelector(':scope > button');
      button.addEventListener('click', () => {
        if (category === expandedCategory) returnToOverview();
        else expandCategory(category);
      });
    });

    details.forEach((detail) => {
      detail.addEventListener('toggle', () => {
        if (!detail.open) return;
        details.forEach((otherDetail) => {
          if (otherDetail !== detail) otherDetail.removeAttribute('open');
        });
      });
    });

    collapseAll.addEventListener('click', returnToOverview);
    applyExpandedState(null);

    return { expandCategory, returnToOverview };
  };
})();
