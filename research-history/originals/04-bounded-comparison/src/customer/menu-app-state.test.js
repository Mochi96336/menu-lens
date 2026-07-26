import { referenceMenu } from "../domain/reference-menu.js";
import { beginAnchorSelection, cancelAnchorSelection, clearAnchor, focusCategory, selectAnchor, setSemanticAxis, showAllCategories, showMenuOverview, } from "./menu-reading.js";
import { closeCandidateWorkspace, createInitialMenuAppState, openCandidateWorkspace, removeAppCandidate, showCandidateInMenu, toggleAppCandidate, updateAppReading, } from "./menu-app-state.js";
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
    assert(after.comparison === before.comparison, `${message}: comparison state reference must be preserved`);
    assert(isCandidate(after.candidates, candidateProduct.id), `${message}: shared Candidate must remain`);
    assert(isCandidate(after.candidates, otherProduct.id), `${message}: cross-category Candidate must remain`);
};
test("initial app state keeps reading, Candidate, comparison, and surface state separate", () => {
    const state = createInitialMenuAppState(referenceMenu);
    assert(state.reading.expansion.kind === "overview", "reading must begin in overview");
    assert(state.candidates.productIds.length === 0, "Candidates must begin empty");
    assert(state.comparison.productIds.length === 0, "comparison selection must begin empty");
    assert(state.surface.kind === "menu", "the canonical menu must be the initial active surface");
    assert(!state.quantity, "app state must not add quantity");
    assert(!state.order, "app state must not add order state");
});
test("Candidate toggle changes membership without altering reading or surface state", () => {
    const initial = createInitialMenuAppState(referenceMenu);
    const added = toggleAppCandidate(initial, referenceMenu, candidateProduct.id);
    assert(added.reading === initial.reading, "Candidate add must preserve reading reference");
    assert(added.surface === initial.surface, "Candidate add must preserve surface reference");
    assert(added.comparison === initial.comparison, "Candidate add must not select it for comparison");
    assert(isCandidate(added.candidates, candidateProduct.id), "Candidate add must change membership");
    const removed = toggleAppCandidate(added, referenceMenu, candidateProduct.id);
    assert(removed.reading === added.reading, "Candidate removal must preserve reading reference");
    assert(removed.surface === added.surface, "Candidate removal must preserve surface reference");
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
test("same-category reopen preserves Candidate membership, comparison state, and explicit axis", () => {
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
test("workspace cannot open without a canonical Candidate", () => {
    const initial = createInitialMenuAppState(referenceMenu);
    assert(openCandidateWorkspace(initial, referenceMenu) === initial, "empty Candidate state must not open the workspace");
});
test("workspace open and close preserve complete reading, Candidate, and comparison references", () => {
    const candidates = withTwoCandidates();
    const focused = updateAppReading(candidates, focusCategory(candidates.reading, referenceMenu, sharedCategoryId));
    const selecting = updateAppReading(focused, beginAnchorSelection(focused.reading));
    const active = updateAppReading(selecting, selectAnchor(selecting.reading, referenceMenu, anchorProduct.id));
    const preparation = updateAppReading(active, setSemanticAxis(active.reading, referenceMenu, "preparation"));
    const opened = openCandidateWorkspace(preparation, referenceMenu);
    assert(opened.surface.kind === "candidates", "workspace open must activate the Candidate surface");
    assert(opened.reading === preparation.reading, "workspace open must preserve complete reading reference");
    assert(opened.candidates === preparation.candidates, "workspace open must preserve Candidate reference");
    assert(opened.comparison === preparation.comparison, "workspace open must preserve comparison reference");
    const closed = closeCandidateWorkspace(opened);
    assert(closed.surface.kind === "menu", "workspace close must restore the menu surface");
    assert(closed.reading === opened.reading, "workspace close must preserve complete reading reference");
    assert(closed.candidates === opened.candidates, "workspace close must preserve Candidate reference");
    assert(closed.comparison === opened.comparison, "workspace close must preserve comparison reference");
});
test("explicit workspace removal preserves reading, surface, and an active Anchor", () => {
    const candidates = withTwoCandidates();
    const focused = updateAppReading(candidates, focusCategory(candidates.reading, referenceMenu, sharedCategoryId));
    const selecting = updateAppReading(focused, beginAnchorSelection(focused.reading));
    const active = updateAppReading(selecting, selectAnchor(selecting.reading, referenceMenu, candidateProduct.id));
    const opened = openCandidateWorkspace(active, referenceMenu);
    const removed = removeAppCandidate(opened, candidateProduct.id);
    assert(removed.surface === opened.surface, "removal must leave the workspace open");
    assert(removed.reading === opened.reading, "removal must preserve reading reference");
    assert(removed.reading.anchorReading.kind === "active" && removed.reading.anchorReading.productId === candidateProduct.id, "removing the active Anchor's Candidate membership must leave the Anchor active");
    assert(!isCandidate(removed.candidates, candidateProduct.id), "explicit removal must clear only Candidate membership");
    const empty = removeAppCandidate(removed, otherProduct.id);
    assert(empty.surface.kind === "candidates", "removing the final Candidate must leave the empty workspace open");
    assert(empty.candidates.productIds.length === 0, "final removal must produce an empty Candidate state");
});
test("show in menu uses existing category-focus rules and preserves Candidate membership", () => {
    const candidates = withTwoCandidates();
    const focused = updateAppReading(candidates, focusCategory(candidates.reading, referenceMenu, sharedCategoryId));
    const opened = openCandidateWorkspace(focused, referenceMenu);
    const located = showCandidateInMenu(opened, referenceMenu, otherProduct.id);
    assert(located.surface.kind === "menu", "Product locator must return to the menu surface");
    assert(located.candidates === opened.candidates, "Product locator must preserve Candidate reference");
    assert(located.comparison === opened.comparison, "Product locator must preserve comparison reference");
    assert(located.reading.expansion.kind === "category" && located.reading.expansion.categoryId === otherProduct.categoryId, "Product locator must focus the canonical destination category");
    assert(located.reading.anchorReading.kind === "idle", "cross-category locator must use existing Anchor reset rules");
    assert(showCandidateInMenu(opened, referenceMenu, "missing-product") === opened, "invalid Product locator must be a referential no-op");
});
test("app state introduces no Decision, Configuration, quantity, total, or order state", () => {
    const serialized = JSON.stringify(openCandidateWorkspace(withTwoCandidates(), referenceMenu)).toLowerCase();
    ["decision", "configuration", "quantity", "total", "draftorder", "currentorder", "submitted"].forEach((term) => assert(!serialized.includes(term), `${term} must remain absent from CMP1 state`));
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
