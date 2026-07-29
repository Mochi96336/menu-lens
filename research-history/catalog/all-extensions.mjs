import { archiveExtensions as coreArchiveExtensions } from "./extensions.mjs";
import { landscapeAblationExtensions } from "./landscape-ablations.mjs";

export const archiveExtensions = Object.freeze([
  ...coreArchiveExtensions,
  ...landscapeAblationExtensions,
]);
