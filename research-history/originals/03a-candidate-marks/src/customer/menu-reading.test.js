import { referenceMenu } from "../domain/reference-menu.js";
import { beginAnchorSelection, cancelAnchorSelection, categoryIsExpanded, categoryScrollBehavior, clearAnchor, createCompleteMenuModel, createInitialMenuReadingState, focusCategory, isAnchorSelectionCancelKey, selectAnchor, setSemanticAxis, showAllCategories, showMenuOverview, } from "./menu-reading.js";
const tests = [];
const test = (name, run) => { tests.push({ name, run }); };
function assert(condition, message) { if (!condition)
    throw new Error(message); }
const firstCategoryId = referenceMenu.categories[0]?.id;
const sharedCategoryId = "shared-dishes";
const drinksCategoryId = "drinks";
const firstProductId = referenceMenu.products.find((product) => product.categoryId === firstCategoryId)?.id;
const sharedProductIds = referenceMenu.products
    .filter((product) => product.categoryId === sharedCategoryId)
    .map((product) => product.id);
const otherCategoryProductId = referenceMenu.products.find((product) => product.categoryId === drinksCategoryId)?.id;
assert(firstCategoryId !== undefined, "fixture must include a first category");
assert(firstProductId !== undefined, "fixture must include a first product");
assert(sharedProductIds.length >= 2, "fixture must include two shared products");
assert(otherCategoryProductId !== undefined, "fixture must include a product in another category");
const firstSharedProductId = sharedProductIds[0];
const secondSharedProductId = sharedProductIds[1];
test("initial state starts in overview with the first eligible category axis", () => {
    const state = createInitialMenuReadingState(referenceMenu);
    assert(state.expansion.kind === "overview", "initial mode must be overview");
    assert(state.anchorReading.kind === "idle", "initial anchor state must be idle");
    assert(state.semanticAxis === "preparation", "personal mains default to their only eligible axis");
    referenceMenu.categories.forEach((category) => assert(!categoryIsExpanded(state, category.id), "overview keeps every category compressed"));
});
test("focusing a different category resets to its first eligible semantic axis", () => {
    const shared = focusCategory(createInitialMenuReadingState(referenceMenu), referenceMenu, sharedCategoryId);
    assert(shared.semanticAxis === "portion", "shared dishes default to portion before preparation");
    assert(shared.anchorReading.kind === "idle", "category focus starts without an anchor");
    const drinks = focusCategory(shared, referenceMenu, drinksCategoryId);
    assert(drinks.semanticAxis === null, "an ineligible category stores no active semantic axis");
    assert(beginAnchorSelection(drinks).anchorReading.kind === "idle", "an ineligible category cannot enter Prototype C selection");
});
test("selection mode preserves category, axis, and canonical expansion", () => {
    const focused = focusCategory(createInitialMenuReadingState(referenceMenu), referenceMenu, sharedCategoryId);
    const selecting = beginAnchorSelection(focused);
    assert(selecting.anchorReading.kind === "selecting", "eligible focused category may enter anchor selection");
    assert(selecting.semanticAxis === "portion", "selection preserves the shared axis");
    assert(selecting.expansion === focused.expansion, "selection must preserve the expansion object");
    assert(referenceMenu.categories.filter((category) => categoryIsExpanded(selecting, category.id)).length === 1, "exactly one category remains expanded");
});
test("cancelling selection returns to idle without changing category or axis", () => {
    const focused = focusCategory(createInitialMenuReadingState(referenceMenu), referenceMenu, sharedCategoryId);
    const cancelled = cancelAnchorSelection(beginAnchorSelection(focused));
    assert(cancelled.anchorReading.kind === "idle", "cancel must leave no anchor");
    assert(cancelled.expansion === focused.expansion, "cancel must preserve category expansion");
    assert(cancelled.activeCategoryId === sharedCategoryId, "cancel must preserve active category");
    assert(cancelled.semanticAxis === "portion", "cancel must preserve the selected axis");
});
test("changing an anchor stores exactly one ProductId and preserves the selected axis", () => {
    const focused = focusCategory(createInitialMenuReadingState(referenceMenu), referenceMenu, sharedCategoryId);
    const first = selectAnchor(beginAnchorSelection(focused), referenceMenu, firstSharedProductId);
    assert(first.anchorReading.kind === "active" && first.anchorReading.productId === firstSharedProductId, "first product becomes the anchor");
    const preparation = setSemanticAxis(first, referenceMenu, "preparation");
    assert(preparation.semanticAxis === "preparation", "active anchor may switch to an eligible shared axis");
    const changed = selectAnchor(beginAnchorSelection(preparation), referenceMenu, secondSharedProductId);
    assert(changed.anchorReading.kind === "active" && changed.anchorReading.productId === secondSharedProductId, "new anchor replaces the prior ProductId");
    assert(changed.semanticAxis === "preparation", "changing anchor preserves the active semantic axis");
    assert(JSON.stringify(changed).split(firstSharedProductId).length === 1, "prior ProductId must not accumulate in state");
    const invalid = selectAnchor(beginAnchorSelection(changed), referenceMenu, otherCategoryProductId);
    assert(invalid.anchorReading.kind === "selecting", "a product outside the active category cannot become the anchor");
    assert(invalid.semanticAxis === "preparation", "invalid selection cannot change the axis");
});
test("axis switching is active-only and category-eligible", () => {
    const focused = focusCategory(createInitialMenuReadingState(referenceMenu), referenceMenu, sharedCategoryId);
    assert(setSemanticAxis(focused, referenceMenu, "preparation") === focused, "idle state cannot switch the disabled axis group");
    const active = selectAnchor(beginAnchorSelection(focused), referenceMenu, firstSharedProductId);
    assert(setSemanticAxis(active, referenceMenu, "preparation").semanticAxis === "preparation", "active shared category can select preparation");
    const personal = focusCategory(active, referenceMenu, firstCategoryId);
    const personalActive = selectAnchor(beginAnchorSelection(personal), referenceMenu, firstProductId);
    assert(setSemanticAxis(personalActive, referenceMenu, "portion") === personalActive, "ineligible portion axis cannot be injected into personal mains");
});
test("overview, all-expanded mode, clear, and category changes reset only the documented state", () => {
    const active = setSemanticAxis(selectAnchor(beginAnchorSelection(focusCategory(createInitialMenuReadingState(referenceMenu), referenceMenu, sharedCategoryId)), referenceMenu, firstSharedProductId), referenceMenu, "preparation");
    const overview = showMenuOverview(active);
    assert(overview.anchorReading.kind === "idle" && overview.semanticAxis === "preparation", "overview clears anchor but preserves category axis preference");
    const reopened = focusCategory(overview, referenceMenu, sharedCategoryId);
    assert(reopened.anchorReading.kind === "idle" && reopened.semanticAxis === "preparation", "reopening the same category preserves its explicit axis preference");
    const all = showAllCategories(active);
    assert(all.anchorReading.kind === "idle" && all.semanticAxis === "preparation", "all-expanded mode clears anchor but preserves axis preference");
    const cleared = clearAnchor(active);
    assert(cleared.anchorReading.kind === "idle" && cleared.semanticAxis === "preparation", "clear disables but preserves the selected axis");
    const changedCategory = focusCategory(active, referenceMenu, firstCategoryId);
    assert(changedCategory.anchorReading.kind === "idle" && changedCategory.semanticAxis === "preparation", "category change clears anchor and resets to the destination default axis");
});
test("complete model preserves canonical order and exposes complete C projections", () => {
    const model = createCompleteMenuModel(referenceMenu);
    const productIds = model.categories.flatMap((category) => category.products.map((product) => product.id));
    assert(JSON.stringify(productIds) === JSON.stringify(referenceMenu.products.map((product) => product.id)), "model order must remain canonical");
    const shared = model.categories.find((category) => category.id === sharedCategoryId);
    assert(shared !== undefined, "shared category model must exist");
    assert(JSON.stringify(shared.semanticAxes) === JSON.stringify(["portion", "preparation"]), "model exposes stable category-level axes");
    const portionProjection = shared.anchorAxisRelations[firstSharedProductId]?.portion;
    const preparationProjection = shared.anchorAxisRelations[firstSharedProductId]?.preparation;
    assert(portionProjection !== undefined && Object.keys(portionProjection).length === shared.products.length, "portion projection covers every canonical row");
    assert(preparationProjection !== undefined && Object.keys(preparationProjection).length === shared.products.length, "preparation projection covers every canonical row");
});
test("sold-out and partial metadata products remain in the shared ledger", () => {
    const model = createCompleteMenuModel(referenceMenu);
    const products = model.categories.flatMap((category) => category.products);
    assert(products.length === referenceMenu.products.length, "all products remain reachable");
    assert(model.categories.reduce((sum, category) => sum + category.soldOutCount, 0) === 2, "both sold-out products remain represented");
    assert(model.categories.reduce((sum, category) => sum + category.partialMetadataCount, 0) === 6, "all partial metadata products remain represented");
    assert(products.findIndex((product) => product.id === "sichuan-mapo-tofu-pot") === 4, "sold-out mapo tofu keeps its canonical position");
});
test("Prototype C state introduces no Candidate, Comparison, detail, score, configuration, or order state", () => {
    const state = selectAnchor(beginAnchorSelection(focusCategory(createInitialMenuReadingState(referenceMenu), referenceMenu, sharedCategoryId)), referenceMenu, firstSharedProductId);
    const serialized = JSON.stringify(state).toLowerCase();
    ["candidate", "comparison", "detail", "score", "configuration", "quantity", "order"].forEach((term) => assert(!serialized.includes(term), `${term} state must remain absent`));
});
test("Escape cancels only temporary selection", () => {
    assert(isAnchorSelectionCancelKey("Escape"), "Escape may cancel selecting state");
    assert(!isAnchorSelectionCancelKey("Enter"), "Enter is not a cancel key");
    const active = selectAnchor(beginAnchorSelection(focusCategory(createInitialMenuReadingState(referenceMenu), referenceMenu, sharedCategoryId)), referenceMenu, firstSharedProductId);
    assert(cancelAnchorSelection(active) === active, "cancel helper must not clear an active anchor");
});
test("category scrolling respects reduced motion", () => {
    assert(categoryScrollBehavior(true) === "auto", "reduced motion uses auto");
    assert(categoryScrollBehavior(false) === "smooth", "normal motion may use smooth scrolling");
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
    throw new Error(`${failures} menu reading test(s) failed`);
console.log(`\n${tests.length} menu reading tests passed.`);
