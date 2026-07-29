import { archiveExtensions as coreArchiveExtensions } from "./extensions.mjs";
import { landscapeAblationExtensions } from "./landscape-ablations.mjs";
import { closureIntakeExtensions } from "./closure-intakes.mjs";

export const archiveExtensions = Object.freeze([
  ...coreArchiveExtensions,
  ...landscapeAblationExtensions,
  ...closureIntakeExtensions,
]);
