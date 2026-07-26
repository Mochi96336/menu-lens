import { referenceMenu } from "../domain/reference-menu.js";
import { createCandidateWorkspaceModel } from "./candidate-workspace.js";
const tests = [];
const test = (name, run) => { tests.push({ name, run }); };
function assert(condition, message) { if (!condition)
    throw new Error(message); }
const availableProducts = referenceMenu.products.filter((product) => product.availability === "available");
const first = availableProducts[0];
const crossCategory = availableProducts.find((product) => product.categoryId !== first?.categoryId);
const laterSameCategory = availableProducts.find((product) => product.categoryId === first?.categoryId && product.id !== first.id);
const soldOut = referenceMenu.products.find((product) => product.availability === "sold_out");
assert(first !== undefined, "fixture must contain an available Product");
assert(crossCategory !== undefined, "fixture must contain an available Product in another category");
assert(laterSameCategory !== undefined, "fixture must contain two available Products in one category");
assert(soldOut !== undefined, "fixture must contain a sold-out Product");
const state = (...productIds) => ({ productIds });
const flattenedIds = (candidateState) => createCandidateWorkspaceModel(referenceMenu, candidateState).groups.flatMap((group) => group.products.map((product) => product.id));
test("workspace derives canonical category and Product order rather than Candidate insertion order", () => {
    const model = createCandidateWorkspaceModel(referenceMenu, state(crossCategory.id, laterSameCategory.id, first.id));
    const expected = referenceMenu.products
        .filter((product) => [crossCategory.id, laterSameCategory.id, first.id].includes(product.id))
        .map((product) => product.id);
    assert(JSON.stringify(flattenedIds(state(crossCategory.id, laterSameCategory.id, first.id))) === JSON.stringify(expected), "derived Products must follow canonical menu order");
    const representedCategoryIds = model.groups.map((group) => group.category.id);
    const expectedCategoryIds = referenceMenu.categories
        .filter((category) => expected.some((productId) => referenceMenu.products.find((product) => product.id === productId)?.categoryId === category.id))
        .map((category) => category.id);
    assert(JSON.stringify(representedCategoryIds) === JSON.stringify(expectedCategoryIds), "derived groups must follow canonical category order");
});
test("workspace reuses canonical Category and Product references without storing copies", () => {
    const model = createCandidateWorkspaceModel(referenceMenu, state(first.id, crossCategory.id));
    model.groups.forEach((group) => {
        assert(referenceMenu.categories.includes(group.category), "group must reuse the canonical Category object");
        group.products.forEach((product) => assert(referenceMenu.products.includes(product), "row must reuse the canonical Product object"));
    });
});
test("workspace ignores stale and duplicate ProductIds and omits empty categories", () => {
    const model = createCandidateWorkspaceModel(referenceMenu, state("missing-product", first.id, first.id));
    assert(model.count === 1, "count must include one unique canonical Product");
    assert(model.groups.length === 1, "empty category groups must be omitted");
    assert(model.groups[0]?.products[0] === first, "the remaining row must be the canonical Product");
});
test("an existing Candidate remains visible when its canonical Product is sold out", () => {
    const model = createCandidateWorkspaceModel(referenceMenu, state(soldOut.id));
    assert(model.count === 1, "sold-out Candidate must remain reviewable");
    assert(model.groups[0]?.products[0] === soldOut, "sold-out row must reuse the canonical Product");
    assert(model.groups[0]?.products[0]?.availability === "sold_out", "current canonical availability must remain visible");
});
test("workspace model adds no comparison, ranking, quantity, configuration, total, or order state", () => {
    const model = createCandidateWorkspaceModel(referenceMenu, state(first.id));
    assert(JSON.stringify(Object.keys(model).sort()) === JSON.stringify(["count", "groups"]), "model must contain only groups and count");
    const serialized = JSON.stringify({
        modelKeys: Object.keys(model),
        groupKeys: Object.keys(model.groups[0] ?? {}).sort(),
    }).toLowerCase();
    ["comparison", "rank", "score", "quantity", "configuration", "total", "order", "selection"].forEach((term) => assert(!serialized.includes(term), `${term} must remain absent from the workspace model`));
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
    throw new Error(`${failures} Candidate workspace test(s) failed`);
console.log(`\n${tests.length} Candidate workspace tests passed.`);
