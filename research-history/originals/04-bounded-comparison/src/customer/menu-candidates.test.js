import { referenceMenu } from "../domain/reference-menu.js";
import { addCandidate, candidateCount, createEmptyCandidateState, isCandidate, removeCandidate, toggleCandidate, } from "./menu-candidates.js";
const tests = [];
const test = (name, run) => { tests.push({ name, run }); };
function assert(condition, message) { if (!condition)
    throw new Error(message); }
const availableProducts = referenceMenu.products.filter((product) => product.availability === "available");
const soldOutProduct = referenceMenu.products.find((product) => product.availability === "sold_out");
assert(availableProducts.length >= 2, "fixture must contain at least two available products");
assert(soldOutProduct !== undefined, "fixture must contain a sold-out product");
const first = availableProducts[0];
const second = availableProducts[1];
assert(first !== undefined && second !== undefined, "fixture products must exist");
test("empty Candidate state contains only Product identity membership", () => {
    const state = createEmptyCandidateState();
    assert(JSON.stringify(state) === JSON.stringify({ productIds: [] }), "empty state must contain only productIds");
    const serialized = JSON.stringify(state).toLowerCase();
    ["quantity", "configuration", "selection", "total", "order", "rank"].forEach((term) => assert(!serialized.includes(term), `${term} must remain absent from Candidate state`));
});
test("adding an available Product creates one unique membership", () => {
    const empty = createEmptyCandidateState();
    const added = addCandidate(empty, referenceMenu, first.id);
    assert(isCandidate(added, first.id), "available product must become a Candidate");
    assert(candidateCount(referenceMenu, added) === 1, "one Candidate must be counted");
    const duplicate = addCandidate(added, referenceMenu, first.id);
    assert(duplicate === added, "duplicate add must be a referential no-op");
    assert(candidateCount(referenceMenu, duplicate) === 1, "duplicate add must not duplicate membership");
});
test("sold-out and invalid Products cannot be newly marked", () => {
    const empty = createEmptyCandidateState();
    assert(addCandidate(empty, referenceMenu, soldOutProduct.id) === empty, "sold-out add must be rejected");
    assert(addCandidate(empty, referenceMenu, "missing-product") === empty, "invalid ProductId add must be rejected");
});
test("removal is reversible and non-member removal is a no-op", () => {
    const added = addCandidate(createEmptyCandidateState(), referenceMenu, first.id);
    const removed = removeCandidate(added, first.id);
    assert(!isCandidate(removed, first.id), "removal must clear Candidate membership");
    assert(candidateCount(referenceMenu, removed) === 0, "removal must update count");
    assert(removeCandidate(removed, first.id) === removed, "removing a non-member must be a referential no-op");
});
test("toggle uses the same bounded add and remove rules", () => {
    const empty = createEmptyCandidateState();
    const added = toggleCandidate(empty, referenceMenu, second.id);
    assert(isCandidate(added, second.id), "first toggle must add an available product");
    const removed = toggleCandidate(added, referenceMenu, second.id);
    assert(!isCandidate(removed, second.id), "second toggle must remove membership");
    assert(toggleCandidate(empty, referenceMenu, soldOutProduct.id) === empty, "toggle cannot add a sold-out product");
});
test("count ignores stale or duplicate ids without mutating source state", () => {
    const source = { productIds: ["missing-product", first.id, first.id] };
    assert(candidateCount(referenceMenu, source) === 1, "count must include only unique canonical ProductIds");
    assert(source.productIds[0] === "missing-product", "counting must not mutate source state");
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
    throw new Error(`${failures} Candidate domain test(s) failed`);
console.log(`\n${tests.length} Candidate domain tests passed.`);
