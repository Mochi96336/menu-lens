import { closeCandidateComparison, createInitialMenuAppState, openCandidateComparison, openCandidateWorkspace, removeAppCandidate, toggleAppCandidate, toggleAppComparison, } from "./menu-app-state.js";
import { createCandidateComparisonModel, createEmptyCandidateComparisonState, isComparisonSelected, sanitizeCandidateComparison, toggleCandidateComparison, } from "./candidate-comparison.js";
const tests = [];
const test = (name, run) => { tests.push({ name, run }); };
function assert(condition, message) { if (!condition)
    throw new Error(message); }
const menu = {
    restaurant: { id: "cmp", name: "比較測試", description: "CMP1 fixture", currency: "TWD" },
    categories: [
        {
            id: "mains",
            name: "主餐",
            semanticDefaults: {
                mealRole: { value: "personal_main", source: "category_default", confidence: "medium" },
                preparationClass: { value: "normal", source: "category_default", confidence: "medium" },
                shareable: { value: false, source: "category_default", confidence: "medium" },
            },
        },
        { id: "shared", name: "分享料理" },
    ],
    modifierGroups: [
        {
            id: "required-size",
            name: "份量",
            required: true,
            minimumSelections: 1,
            maximumSelections: 1,
            options: [{ id: "regular", name: "一般", priceDelta: 0 }],
        },
    ],
    products: [
        {
            id: "p1",
            name: "炙烤雞腿",
            description: "",
            price: 320,
            categoryId: "mains",
            availability: "available",
            semanticOverrides: {
                portionClass: { value: "one_person", source: "merchant_confirmed", confidence: "high" },
                traits: { value: ["rich"], source: "merchant_confirmed", confidence: "high" },
            },
        },
        {
            id: "p2",
            name: "山椒烤雞",
            description: "",
            price: 520,
            categoryId: "shared",
            availability: "available",
            modifierGroupIds: ["required-size"],
            semanticOverrides: {
                mealRole: { value: "shared_main", source: "merchant_confirmed", confidence: "high" },
                portionClass: { value: "large_shared", source: "merchant_confirmed", confidence: "high" },
                preparationClass: { value: "slow", source: "merchant_confirmed", confidence: "high" },
                shareable: { value: true, source: "merchant_confirmed", confidence: "high" },
                traits: { value: ["spicy", "rich"], source: "merchant_confirmed", confidence: "high" },
            },
        },
        {
            id: "p3",
            name: "奶油蝦",
            description: "",
            price: 480,
            categoryId: "shared",
            availability: "available",
            semanticOverrides: {
                mealRole: { value: "shared_main", source: "merchant_confirmed", confidence: "high" },
                preparationClass: { value: "normal", source: "merchant_confirmed", confidence: "high" },
                shareable: { value: true, source: "merchant_confirmed", confidence: "high" },
                traits: { value: ["rich"], source: "merchant_confirmed", confidence: "high" },
            },
        },
        {
            id: "p4",
            name: "停售拼盤",
            description: "",
            price: 520,
            categoryId: "shared",
            availability: "sold_out",
            semanticOverrides: {
                portionClass: { value: "two_to_three", source: "merchant_confirmed", confidence: "low" },
            },
        },
    ],
};
const candidates = { productIds: ["p3", "stale", "p1", "p2", "p4", "p2"] };
test("comparison state begins empty and identity-only", () => {
    const state = createEmptyCandidateComparisonState();
    assert(state.productIds.length === 0, "comparison must begin empty");
    ["quantity", "configuration", "winner", "score", "rank", "order"].forEach((term) => assert(!JSON.stringify(state).toLowerCase().includes(term), `${term} must not enter comparison state`));
});
test("selection accepts only current Candidates, preserves canonical order, and caps at three", () => {
    let state = createEmptyCandidateComparisonState();
    state = toggleCandidateComparison(state, menu, candidates, "p3");
    state = toggleCandidateComparison(state, menu, candidates, "p1");
    state = toggleCandidateComparison(state, menu, candidates, "p2");
    assert(state.productIds.join(",") === "p1,p2,p3", "selection must use canonical Product order rather than click order");
    const capped = toggleCandidateComparison(state, menu, candidates, "p4");
    assert(capped === state, "selecting a fourth Candidate must be a referential no-op");
    assert(toggleCandidateComparison(state, menu, candidates, "missing") === state, "unknown Product must be rejected");
    assert(toggleCandidateComparison(state, menu, { productIds: ["p1"] }, "p2") === state, "non-Candidate Product must be rejected");
    const deselected = toggleCandidateComparison(state, menu, candidates, "p2");
    assert(deselected.productIds.join(",") === "p1,p3", "selected Product must remain removable at the limit");
    assert(isComparisonSelected(deselected, "p1"), "remaining selection must be preserved");
});
test("sanitize removes stale, duplicate, and removed Candidates without auto-selecting", () => {
    const dirty = { productIds: ["p4", "p2", "p2", "missing", "p1", "p3"] };
    const clean = sanitizeCandidateComparison(dirty, menu, candidates);
    assert(clean.productIds.join(",") === "p1,p2,p3", "sanitize must keep at most three valid IDs in canonical order");
    const empty = sanitizeCandidateComparison(createEmptyCandidateComparisonState(), menu, candidates);
    assert(empty.productIds.length === 0, "an intentionally empty selection must stay empty");
});
test("projection reuses canonical Products and emits bounded truthful differences", () => {
    const selection = { productIds: ["p1", "p2", "p3"] };
    const model = createCandidateComparisonModel(menu, candidates, selection);
    assert(model.candidates.map((product) => product.id).join(",") === "p1,p2,p3,p4", "selector list must follow canonical Candidate order");
    assert(model.selectedProducts[0] === menu.products[0], "projection must reuse canonical Product references");
    assert(model.selectedProducts.length === 3, "three selected Products must be supported");
    assert(model.dimensions[0]?.key === "price", "price must always be the first dimension");
    assert(model.dimensions.some((dimension) => dimension.key === "portion"), "differing and missing portions must be shown");
    assert(model.dimensions.some((dimension) => dimension.key === "meal_role"), "differing meal roles must be shown");
    assert(model.dimensions.some((dimension) => dimension.key === "required_customization"), "required customization difference must be shown");
    const portion = model.dimensions.find((dimension) => dimension.key === "portion");
    assert(portion?.values.find((value) => value.product.id === "p3")?.evidence.status === "missing", "missing semantic data must remain explicit");
    assert(portion?.values.find((value) => value.product.id === "p3")?.evidence.valueLabel === null, "missing data must not become a negative label");
    assert(!JSON.stringify(model).toLowerCase().includes("winner"), "projection must not emit winner state");
    assert(!JSON.stringify(model).toLowerCase().includes("best"), "projection must not emit best-value state");
});
test("low-confidence evidence stays visible and distinct from confirmed evidence", () => {
    const model = createCandidateComparisonModel(menu, candidates, { productIds: ["p2", "p4"] });
    const portion = model.dimensions.find((dimension) => dimension.key === "portion");
    const low = portion?.values.find((value) => value.product.id === "p4")?.evidence;
    assert(low?.status === "low_confidence", "low-confidence value must retain a distinct status");
    assert(low?.valueLabel === "約 2–3 人", "low-confidence value must retain its coarse label");
    assert(low?.confidence === "low", "low-confidence metadata must remain inspectable");
    assert(model.selectedProducts.find((product) => product.id === "p4")?.availability === "sold_out", "sold-out Candidate must remain comparable");
});
test("zero or one selected Product produces guidance but no evidence", () => {
    const empty = createCandidateComparisonModel(menu, candidates, createEmptyCandidateComparisonState());
    assert(empty.dimensions.length === 0 && empty.guidance === "選擇 2–3 道考慮項目開始比較。", "empty selection needs bounded guidance");
    const one = createCandidateComparisonModel(menu, candidates, { productIds: ["p1"] });
    assert(one.dimensions.length === 0 && one.guidance === "再選 1 道即可比較。", "one selection needs bounded guidance");
});
test("app surface opens only from Candidate workspace and preserves explicit empty selection", () => {
    let app = createInitialMenuAppState(menu);
    app = toggleAppCandidate(app, menu, "p1");
    assert(openCandidateComparison(app, menu) === app, "comparison must not open with one Candidate");
    app = toggleAppCandidate(app, menu, "p2");
    assert(openCandidateComparison(app, menu) === app, "comparison must not bypass the Candidate workspace");
    const workspace = openCandidateWorkspace(app, menu);
    const opened = openCandidateComparison(workspace, menu);
    assert(opened.surface.kind === "comparison", "comparison surface must open with two Candidates");
    assert(opened.comparison.productIds.length === 0, "first open must remain explicitly empty");
    assert(opened.reading === workspace.reading && opened.candidates === workspace.candidates, "open must preserve reading and Candidate references");
    const selected = toggleAppComparison(opened, menu, "p2");
    assert(selected.comparison.productIds.join(",") === "p2", "app comparison toggle must update only comparison state");
    assert(selected.candidates === opened.candidates, "comparison toggle must preserve Candidate membership");
    const closed = closeCandidateComparison(selected);
    assert(closed.surface.kind === "candidates", "comparison Back must restore Candidate workspace surface");
    assert(closed.comparison === selected.comparison, "comparison Back must preserve selection reference");
});
test("removing a Candidate sanitizes only its comparison selection", () => {
    let app = createInitialMenuAppState(menu);
    app = toggleAppCandidate(app, menu, "p1");
    app = toggleAppCandidate(app, menu, "p2");
    app = openCandidateWorkspace(app, menu);
    app = openCandidateComparison(app, menu);
    app = toggleAppComparison(app, menu, "p1");
    app = toggleAppComparison(app, menu, "p2");
    const removed = removeAppCandidate(app, "p1");
    assert(removed.comparison.productIds.join(",") === "p2", "removed Candidate must leave comparison selection");
    assert(removed.surface.kind === "comparison", "external Candidate reduction must not silently close comparison");
    const readded = toggleAppCandidate(removed, menu, "p1");
    assert(!isComparisonSelected(readded.comparison, "p1"), "re-adding Candidate must not silently reselect it");
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
    throw new Error(`${failures} Candidate comparison test(s) failed`);
console.log(`\n${tests.length} Candidate comparison tests passed.`);
