(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const phone = document.querySelector(".task-first-phone");
    const entry = document.querySelector("#task-first-entry");
    const workspace = document.querySelector("#task-first-workspace");
    const entryTitle = document.querySelector("#task-first-title");
    const enterButton = document.querySelector("#enter-projection");
    const showTaskButton = document.querySelector("#show-task");
    const controls = [...document.querySelectorAll("[data-projection]")];
    if (!phone || !entry || !workspace || !entryTitle || !enterButton || !showTaskButton || controls.length !== 3) return;

    let hasEntered = false;

    const activeProjectionControl = () => controls.find((control) => control.getAttribute("aria-pressed") === "true") ?? controls[0];

    const showWorkspace = () => {
      hasEntered = true;
      entry.hidden = true;
      workspace.hidden = false;
      phone.dataset.taskState = "workspace";
      enterButton.textContent = "返回投影";
      requestAnimationFrame(() => {
        globalThis.dispatchEvent(new Event("resize"));
        activeProjectionControl()?.focus({ preventScroll: true });
      });
    };

    const showEntry = () => {
      workspace.hidden = true;
      entry.hidden = false;
      phone.dataset.taskState = hasEntered ? "review" : "briefing";
      enterButton.textContent = hasEntered ? "返回投影" : "進入投影";
      requestAnimationFrame(() => entryTitle.focus({ preventScroll: true }));
    };

    enterButton.addEventListener("click", showWorkspace);
    showTaskButton.addEventListener("click", showEntry);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || entry.hidden || !hasEntered) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      showWorkspace();
    }, true);

    globalThis.__menuLens25PA = Object.freeze({
      getState: () => Object.freeze({
        hasEntered,
        surface: entry.hidden ? "workspace" : hasEntered ? "review" : "briefing",
        activeProjection: activeProjectionControl()?.dataset.projection ?? null,
        selectedProducts: document.querySelectorAll(".projection-node[data-selected='true']").length,
      }),
    });
  });
})();
