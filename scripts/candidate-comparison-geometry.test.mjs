import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/candidate-comparison.css", import.meta.url), "utf8")
  .replace(/\s+/g, " ")
  .trim();

const requireCss = (fragment, message) => {
  if (!css.includes(fragment.replace(/\s+/g, " ").trim())) throw new Error(message);
};

requireCss(
  ".candidate-comparison { width: min(100%, 60rem); margin: 0 auto; padding: 0 0.85rem",
  "comparison document must keep bounded horizontal padding",
);
requireCss(
  ".candidate-comparison__dimension-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(6.8rem, 42%); align-items: start; gap: 0.55rem;",
  "dimension rows must keep one flexible name column and one bounded value column",
);
requireCss(
  ".candidate-comparison__selector-action { inline-size: 3.5rem; block-size: 1.7rem;",
  "selector buttons must have fixed geometry",
);
requireCss(
  '.candidate-comparison__selector-action[aria-pressed="true"] { border-color: var(--accent-deep); background: var(--accent-soft); color: var(--accent-deep); }',
  "pressed state must change paint only, not geometry",
);
requireCss(
  ".candidate-workspace__comparison-entry-row { display: flex; align-items: center; block-size: 2.35rem;",
  "Candidate workspace comparison entry must reserve one fixed header row",
);
requireCss(
  '.candidate-workspace__comparison-entry[data-empty="true"] { visibility: hidden; }',
  "unavailable comparison entry must preserve header geometry",
);

const rem = 16;
const horizontalPadding = 0.85 * rem * 2;
const gap = 0.55 * rem;
const selectorWidth = 3.5 * rem;
const minimumValueWidth = 6.8 * rem;
const focusExtension = 6;

for (const viewport of [320, 390]) {
  const contentWidth = viewport - horizontalPadding;
  const valueWidth = Math.max(minimumValueWidth, contentWidth * 0.42);
  const nameWidth = contentWidth - valueWidth - gap;
  const selectorCopyWidth = contentWidth - selectorWidth - gap;
  const focusInset = horizontalPadding / 2 - focusExtension;

  if (contentWidth <= 0) throw new Error(`${viewport}px comparison content width must remain positive`);
  if (nameWidth < 10 * rem) {
    throw new Error(`${viewport}px dimension name column is too narrow: ${nameWidth.toFixed(1)}px`);
  }
  if (valueWidth < minimumValueWidth) {
    throw new Error(`${viewport}px value column fell below its 6.8rem minimum`);
  }
  if (selectorCopyWidth < 14 * rem) {
    throw new Error(`${viewport}px selector copy column is too narrow: ${selectorCopyWidth.toFixed(1)}px`);
  }
  if (focusInset <= 0) {
    throw new Error(`${viewport}px focus outline would extend beyond the viewport padding`);
  }

  console.log(
    `✓ ${viewport}px: content ${contentWidth.toFixed(1)}px, ` +
    `name ${nameWidth.toFixed(1)}px, value ${valueWidth.toFixed(1)}px, ` +
    `selector copy ${selectorCopyWidth.toFixed(1)}px, focus inset ${focusInset.toFixed(1)}px`,
  );
}

console.log("✓ CMP1 CSS-derived geometry contract (not runtime-browser evidence)");
