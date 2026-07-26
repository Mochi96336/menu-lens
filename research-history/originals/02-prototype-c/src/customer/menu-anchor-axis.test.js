import { referenceMenu } from "../domain/reference-menu.js";
import { anchorAxisRelationFor, availableSemanticAxesFor, semanticAxisValueFor, } from "./menu-anchor-axis.js";
import { formatPrice } from "./menu-reading.js";
const tests = [];
const test = (name, run) => { tests.push({ name, run }); };
function assert(condition, message) { if (!condition)
    throw new Error(message); }
const productsFor = (categoryId) => referenceMenu.products.filter((product) => product.categoryId === categoryId);
const product = (id) => {
    const match = referenceMenu.products.find((entry) => entry.id === id);
    if (!match)
        throw new Error(`Missing product fixture: ${id}`);
    return match;
};
const shared = productsFor("shared-dishes");
const anchor = product("sansho-roast-half-chicken");
const prawns = product("shaoxing-butter-prawns");
const crab = product("garlic-salt-pepper-soft-shell-crab");
const seabass = product("black-bean-steamed-seabass");
test("category-level semantic axes are stable and bounded", () => {
    assert(JSON.stringify(availableSemanticAxesFor(referenceMenu, productsFor("personal-mains"))) === JSON.stringify(["preparation"]), "personal mains expose preparation only");
    assert(JSON.stringify(availableSemanticAxesFor(referenceMenu, productsFor("rice-noodles"))) === JSON.stringify(["preparation"]), "rice and noodles expose preparation only");
    assert(JSON.stringify(availableSemanticAxesFor(referenceMenu, shared)) === JSON.stringify(["portion", "preparation"]), "shared dishes expose portion and preparation");
    assert(JSON.stringify(availableSemanticAxesFor(referenceMenu, productsFor("small-plates"))) === JSON.stringify(["preparation"]), "small plates expose preparation only");
    assert(availableSemanticAxesFor(referenceMenu, productsFor("drinks")).length === 0, "drinks do not offer Prototype C");
    assert(availableSemanticAxesFor(referenceMenu, productsFor("desserts")).length === 0, "two-product desserts do not offer Prototype C");
});
test("portion projection is complete, absolute, and explicit about unknown", () => {
    const visible = shared.map((entry) => semanticAxisValueFor(referenceMenu, entry, "portion"));
    assert(visible.every((value) => value.label.length > 0), "every row must have one portion state");
    assert(semanticAxisValueFor(referenceMenu, anchor, "portion").label === "多人", "anchor uses the short formal portion class");
    assert(semanticAxisValueFor(referenceMenu, prawns, "portion").label === "2–3 人", "trusted shared portion stays absolute");
    const unknown = semanticAxisValueFor(referenceMenu, seabass, "portion");
    assert(unknown.label === "未提供" && unknown.status === "unknown", "low-confidence portion remains explicit unknown");
});
test("preparation projection exposes every faster shared dish without row-level selection", () => {
    assert(semanticAxisValueFor(referenceMenu, anchor, "preparation").label === "慢", "anchor is slow");
    assert(semanticAxisValueFor(referenceMenu, prawns, "preparation").label === "一般", "prawns remain visibly faster than slow anchor by absolute class");
    assert(semanticAxisValueFor(referenceMenu, crab, "preparation").label === "快", "crab exposes the strongest faster class");
    const visible = shared.map((entry) => semanticAxisValueFor(referenceMenu, entry, "preparation"));
    assert(visible.every((value) => value.axis === "preparation"), "one active axis must apply to every row");
    assert(visible.every((value) => value.label.length > 0), "no active preparation cell may be blank");
});
test("anchor-axis relation keeps exact price delta and one shared absolute value", () => {
    const portion = anchorAxisRelationFor(referenceMenu, anchor, prawns, "portion", formatPrice);
    assert(portion.kind === "relative", "alternative row remains relative to one anchor");
    assert(portion.priceLabel === `少 ${formatPrice(40)}`, "exact price delta remains persistent");
    assert(portion.semantic.axis === "portion" && portion.semantic.label === "2–3 人", "portion mode cannot substitute preparation");
    assert(portion.label === `少 ${formatPrice(40)} · 2–3 人`, "visible relation stays bounded and complete");
    const preparation = anchorAxisRelationFor(referenceMenu, anchor, prawns, "preparation", formatPrice);
    assert(preparation.kind === "relative", "preparation remains relative to the same anchor");
    assert(preparation.priceLabel === portion.priceLabel, "switching axis must not remove or recalculate the price delta");
    assert(preparation.semantic.axis === "preparation" && preparation.semantic.label === "一般", "all rows answer the selected preparation question");
});
test("anchor row includes its own absolute semantic value", () => {
    const portion = anchorAxisRelationFor(referenceMenu, anchor, anchor, "portion", formatPrice);
    const preparation = anchorAxisRelationFor(referenceMenu, anchor, anchor, "preparation", formatPrice);
    assert(portion.kind === "anchor" && portion.label === "基準 · 多人", "anchor portion must remain visible");
    assert(preparation.kind === "anchor" && preparation.label === "基準 · 慢", "anchor preparation must remain visible");
});
test("projection never emits recommendation, score, or automatic closeness language", () => {
    const visible = JSON.stringify(shared.flatMap((target) => [
        anchorAxisRelationFor(referenceMenu, anchor, target, "portion", formatPrice),
        anchorAxisRelationFor(referenceMenu, anchor, target, "preparation", formatPrice),
    ]));
    ["比較好", "更適合", "最接近", "推薦", "最佳", "最划算", "CP 值", "分數", "排名", "替代方案"].forEach((phrase) => assert(!visible.includes(phrase), `Prototype C projection must not emit ${phrase}`));
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
    throw new Error(`${failures} anchor-axis test(s) failed`);
console.log(`\n${tests.length} anchor-axis tests passed.`);
