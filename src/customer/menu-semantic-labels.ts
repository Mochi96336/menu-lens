import type {
  CoarseTrait,
  MealRole,
  MetadataConfidence,
  MetadataSource,
  PortionClass,
  PreparationClass,
} from "../domain/menu-types.js";

export const mealRoleLabels: Readonly<Record<MealRole, string>> = {
  personal_main: "個人主餐",
  shared_main: "分享主菜",
  side: "小食或配菜",
  staple: "飯麵主食",
  drink: "飲品",
  dessert: "甜點",
};

export const portionClassLabels: Readonly<Record<PortionClass, string>> = {
  small: "小份",
  one_person: "一人份",
  two_to_three: "約 2–3 人",
  large_shared: "多人分享",
};

export const preparationClassLabels: Readonly<Record<PreparationClass, string>> = {
  fast: "較快",
  normal: "一般",
  slow: "較久",
};

export const shareabilityLabels: Readonly<Record<"true" | "false", string>> = {
  true: "適合分享",
  false: "偏個人",
};

export const coarseTraitLabels: Readonly<Record<CoarseTrait, string>> = {
  light: "清爽",
  rich: "濃郁",
  spicy: "辣味",
  vegetarian: "素食",
};

export const coarseTraitOrder: ReadonlyArray<CoarseTrait> = [
  "light",
  "rich",
  "spicy",
  "vegetarian",
];

export const metadataSourceLabels: Readonly<Record<MetadataSource, string>> = {
  merchant_confirmed: "商家確認",
  category_default: "分類預設",
};

export const metadataConfidenceLabels: Readonly<Record<MetadataConfidence, string>> = {
  high: "高可信",
  medium: "中可信",
  low: "低可信",
};
