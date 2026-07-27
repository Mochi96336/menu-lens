import { referenceMenuData } from "../../data/reference-menu.js";
import { validateMenu } from "./menu-validation.js";
export const referenceMenu = validateMenu(referenceMenuData);
