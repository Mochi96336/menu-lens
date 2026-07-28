# 25P reader-task study layout review

## Result

**PASS as evidence infrastructure layout.**

This review covers presentation defects found before participant sessions. It does not report participant evidence and does not change the study task, counterbalancing, eligibility gate, or stop boundary.

## Parent 25P focus result

The existing semantic-cell result card could be clipped by the projection field because placement selected left or right from the anchor X coordinate without measuring the rendered card. Large result sets also exposed vertical overflow while the card remained pointer-inert.

The parent prerequisite branch now:

- measures field and card rectangles;
- chooses the side with usable space;
- clamps X and Y inside the field;
- maintains the pointer line after clamping;
- repositions during projection animation and resize;
- makes long results pointer-scrollable and keyboard-focusable.

A bounded Chromium matrix checked 168 cases at each of 320px, 390px, and 1280px. No tested card crossed the field boundary, and eleven-row cards remained scrollable.

## Study runner

The original active state left an empty facilitator panel in layout and kept the 1280px frame inside the two-column study shell.

The runner now:

- removes the complete facilitator panel while a session is active;
- gives the participant surface one `minmax(0, 1fr)` column;
- contains 320px and 390px frame overflow inside the frame wrapper;
- exposes the 1280px frame at full width without a horizontal study-frame scroll;
- restores the observer column only after the task finishes.

The bounded runner matrix covers eleven setup, active, and finished states from 320px through 1920px. No case widened the document.

Machine-readable records:

- `research-history/review-assets/25p-band-labels/browser-report.json` on the stacked parent;
- `research-history/review-assets/25p-reader-task/layout-report.json` on this study branch.

## Boundary

The layout pass removes known presentation interference. It does not establish that readers understand the three-axis projection grammar. `25PA Task-first Entry` remains blocked until actual S01–S06 sessions are completed and summarized anonymously.
