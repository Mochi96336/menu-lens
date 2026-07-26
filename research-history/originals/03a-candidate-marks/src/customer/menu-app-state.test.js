import { referenceMenu } from "../domain/reference-menu.js";
import { beginAnchorSelection, cancelAnchorSelection, clearAnchor, focusCategory, selectAnchor, setSemanticAxis, showAllCategories, showMenuOverview, } from "./menu-reading.js";
import { createInitialMenuAppState, toggleAppCandidate, updateAppReading, } from "./menu-app-state.js";
import { isCandidate } from "./menu-candidates.js";
const tests = [];
const test = (name, run) => { tests.push({ name, run }); };
function assert(condition, message) { if (!condition)
    throw new Error(message); }
const sharedCategoryId = "shared-dishes";
const otherCategoryId = referenceMenu.categories.find((category) => category.id !== sharedCategoryId)?.id;
const sharedProducts = referenceMenu.products.filter((product) => product.categoryId === sharedCategoryId && product.availability === "available");
const otherProduct = referenceMenu.products.find((product) => product.categoryId === otherCategoryId && product.availability === "available");
assert(otherCategoryId !== undefined, "fixture must include another category");
assert(sharedProducts.length >= 2, "fixture must include two available shared products");
assert(otherProduct !== undefined, "fixture must include one available product in another category");
const anchorProduct = sharedProducts[0];
const candidateProduct = sharedProducts[1];
assert(anchorProduct !== undefined && candidateProduct !== undefined, "shared fixture products must exist");
const withTwoCandidates = () => {
    const initial = createInitialMenuAppState(referenceMenu);
    const first = toggleAppCandidate(initial, referenceMenu, candidateProduct.id);
    return toggleAppCandidate(first, referenceMenu, otherProduct.id);
};
const assertCandidatesPreserved = (before, after, message) => {
    assert(after.candidates === before.candidates, `${message}: Candidate state reference must be preserved`);
    assert(isCandidate(after.candidates, candidateProduct.id), `${message}: shared Candidate must remain`);
    assert(isCandidate(after.candidates, otherProduct.id), `${message}: cross-category Candidate must remain`);
};
test("initial app state keeps reading and Candidate state separate", () => {
    const state = createInitialMenuAppState(referenceMenu);
    assert(state.reading.expansion.kind === "overview", "reading must begin in overview");
    assert(state.candidates.productIds.length === 0, "Candidates must begin empty");
    assert(!state.quantity, "app state must not add quantity");
    assert(!state.order, "app state must not add order state");
});
test("Candidate toggle changes membership without altering reading state", () => {
    const initial = createInitialMenuAppState(referenceMenu);
    const added = toggleAppCandidate(initial, referenceMenu, candidateProduct.id);
    assert(added.reading === initial.reading, "Candidate add must preserve reading reference");
    assert(isCandidate(added.candidates, candidateProduct.id), "Candidate add must change membership");
    const removed = toggleAppCandidate(added, referenceMenu, candidateProduct.id);
    assert(removed.reading === added.reading, "Candidate removal must preserve reading reference");
    assert(!isCandidate(removed.candidates, candidateProduct.id), "Candidate removal must clear membership");
});
test("Candidates survive category focus, overview, and all-expanded transitions", () => {
    const state = withTwoCandidates();
    const focused = updateAppReading(state, focusCategory(state.reading, referenceMenu, sharedCategoryId));
    assertCandidatesPreserved(state, focused, "category focus");
    const overview = updateAppReading(focused, showMenuOverview(focused.reading));
    assertCandidatesPreserved(focused, overview, "overview");
    const all = updateAppReading(overview, showAllCategories(overview.reading));
    assertCandidatesPreserved(overview, all, "all-expanded");
    const other = updateAppReading(all, focusCategory(all.reading, referenceMenu, otherCategoryId));
    assertCandidatesPreserved(all, other, "different category");
});
test("Candidates survive every Prototype C Anchor and axis transition", () => {
    const state = withTwoCandidates();
    const focused = updateAppReading(state, focusCategory(state.reading, referenceMenu, sharedCategoryId));
    const selecting = updateAppReading(focused, beginAnchorSelection(focused.reading));
    assertCandidatesPreserved(focused, selecting, "begin Anchor selection");
    const cancelled = updateAppReading(selecting, cancelAnchorSelection(selecting.reading));
    assertCandidatesPreserved(selecting, cancelled, "cancel Anchor selection");
    const selectingAgain = updateAppReading(cancelled, beginAnchorSelection(cancelled.reading));
    const active = updateAppReading(selectingAgain, selectAnchor(selectingAgain.reading, referenceMenu, anchorProduct.id));
    assertCandidatesPreserved(selectingAgain, active, "choose Anchor");
    assert(isCandidate(active.candidates, candidateProduct.id), "Candidate and Anchor may coexist independently");
    const preparation = updateAppReading(active, setSemanticAxis(active.reading, referenceMenu, "preparation"));
    assertCandidatesPreserved(active, preparation, "switch semantic axis");
    const changedSelecting = updateAppReading(preparation, beginAnchorSelection(preparation.reading));
    const changedAnchor = updateAppReading(changedSelecting, selectAnchor(changedSelecting.reading, referenceMenu, candidateProduct.id));
    assertCandidatesPreserved(changedSelecting, changedAnchor, "change Anchor");
    assert(changedAnchor.reading.anchorReading.kind === "active" &&
        changedAnchor.reading.anchorReading.productId === candidateProduct.id &&
        isCandidate(changedAnchor.candidates, candidateProduct.id), "one Product may be both Candidate and Anchor");
    const removedCandidate = toggleAppCandidate(changedAnchor, referenceMenu, candidateProduct.id);
    assert(removedCandidate.reading.anchorReading.kind === "active" &&
        removedCandidate.reading.anchorReading.productId === candidateProduct.id, "removing Candidate membership must not clear Anchor");
    const clearedAnchor = updateAppReading(removedCandidate, clearAnchor(removedCandidate.reading));
    assert(clearedAnchor.candidates === removedCandidate.candidates, "clearing Anchor must preserve the post-removal Candidate state");
    assert(!isCandidate(clearedAnchor.candidates, candidateProduct.id), "clearing Anchor must not restore removed Candidate membership");
    assert(isCandidate(clearedAnchor.candidates, otherProduct.id), "clearing Anchor must preserve the remaining Candidate");
});
test("same-category reopen preserves both Candidate membership and explicit axis", () => {
    const state = withTwoCandidates();
    const focused = updateAppReading(state, focusCategory(state.reading, referenceMenu, sharedCategoryId));
    const selecting = updateAppReading(focused, beginAnchorSelection(focused.reading));
    const active = updateAppReading(selecting, selectAnchor(selecting.reading, referenceMenu, anchorProduct.id));
    const preparation = updateAppReading(active, setSemanticAxis(active.reading, referenceMenu, "preparation"));
    const overview = updateAppReading(preparation, showMenuOverview(preparation.reading));
    const reopened = updateAppReading(overview, focusCategory(overview.reading, referenceMenu, sharedCategoryId));
    assertCandidatesPreserved(overview, reopened, "same-category reopen");
    assert(reopened.reading.semanticAxis === "preparation", "same-category reopen must preserve explicit axis");
});
test("app state introduces no Comparison, Decision, Configuration, quantity, total, or order state", () => {
    const serialized = JSON.stringify(withTwoCandidates()).toLowerCase();
    ["comparison", "decision", "configuration", "quantity", "total", "draftorder", "currentorder", "submitted"].forEach((term) => assert(!serialized.includes(term), `${term} must remain absent from CND1 state`));
});
let failures = 0;
for (const testCase of tests) {
    try {
        testCase.run();
        console.log(`✓ ${testCase.name}`);
    }
    catch (error) {
        failures += 1;
        console.error(`✗ ${testCase.name}`);
        console.error(error);
    }
}
if (failures > 0)
    throw new Error(`${failures} Candidate app-state test(s) failed`);
console.log(`\n${tests.length} Candidate app-state tests passed.`);
