import { referenceMenu } from "../domain/reference-menu.js";
import { categoryScrollBehavior, closeProduct, createCompleteMenuModel, createInitialMenuReadingState, createProductDetailModel, isDetailCloseKey, openProduct, } from "./menu-reading.js";
const tests = [];
const test = (name, run) => {
    tests.push({ name, run });
};
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
test("complete menu model contains all 30 canonical products", () => {
    const model = createCompleteMenuModel(referenceMenu);
    assert(model.productCount === 30, "overview count must be 30");
    assert(model.categories.flatMap((category) => category.products).length === 30, "all products must remain in one complete menu");
});
test("directory and menu use the same ordered category collection", () => {
    const model = createCompleteMenuModel(referenceMenu);
    const expectedCounts = [8, 6, 6, 4, 4, 2];
    assert(model.categories.length === referenceMenu.categories.length, "all categories must appear");
    model.categories.forEach((category, index) => {
        assert(category.id === referenceMenu.categories[index]?.id, "category order must stay canonical");
        assert(category.productCount === expectedCounts[index], "category count must be correct");
    });
});
test("sold-out products remain at their canonical positions", () => {
    const model = createCompleteMenuModel(referenceMenu);
    const products = model.categories.flatMap((category) => category.products);
    const mapoIndex = products.findIndex((product) => product.id === "sichuan-mapo-tofu-pot");
    assert(mapoIndex === 4, "sold-out mapo tofu must keep its original position");
    assert(products[mapoIndex]?.isSoldOut === true, "sold-out state must be explicit");
});
test("incomplete metadata products remain readable and openable", () => {
    const detail = createProductDetailModel(referenceMenu, "black-garlic-beef-short-rib");
    assert(detail.title === "黑蒜胡椒牛小排", "detail must resolve by stable ProductId");
    assert(detail.metadataNotice !== null, "partial metadata must be explained without guessing");
    assert(detail.facts.length > 0, "category defaults may still provide supported facts");
});
test("opening another product replaces the prior detail state", () => {
    const initial = createInitialMenuReadingState(referenceMenu);
    const first = openProduct(initial, "miso-grilled-chicken-set");
    const second = openProduct(first, "lemon-koji-salmon-set");
    assert(second.expandedProductId === "lemon-koji-salmon-set", "only the newest detail stays open");
    const closed = closeProduct(second);
    assert(closed.state.expandedProductId === null, "close must clear the expanded product");
    assert(closed.focusProductId === "lemon-koji-salmon-set", "close must identify the original focus-return target");
});
test("display transformations never expose domain enum strings", () => {
    const detail = createProductDetailModel(referenceMenu, "sansho-roast-half-chicken");
    const visibleText = JSON.stringify(detail);
    ["personal_main", "shared_main", "two_to_three", "large_shared", "merchant_confirmed", "category_default"].forEach((rawValue) => assert(!visibleText.includes(rawValue), `must not expose ${rawValue}`));
});
test("category scrolling uses auto for reduced motion", () => {
    assert(categoryScrollBehavior(true) === "auto", "reduced motion must disable smooth category scrolling");
});
test("category scrolling uses smooth for normal motion", () => {
    assert(categoryScrollBehavior(false) === "smooth", "normal motion may use smooth category scrolling");
});
test("Escape is the keyboard close command", () => {
    assert(isDetailCloseKey("Escape"), "Escape must close detail");
    assert(!isDetailCloseKey("Enter"), "Enter must not be treated as close");
});
test("the first slice contains no ordering workspace state", () => {
    const state = createInitialMenuReadingState(referenceMenu);
    const serialized = JSON.stringify(state);
    assert(!serialized.includes("candidate"), "Candidate state must not start in this slice");
    assert(!serialized.includes("order"), "Current order state must not start in this slice");
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
