import { referenceMenu } from "../domain/reference-menu.js";
import { availableReadingAxesFor, axisValueFor, pricePositionFor, } from "./menu-relations.js";
const tests = [];
const test = (name, run) => { tests.push({ name, run }); };
function assert(condition, message) { if (!condition)
    throw new Error(message); }
const category = referenceMenu.categories[0];
assert(category !== undefined, "fixture must include a category");
const categoryProducts = referenceMenu.products.filter((product) => product.categoryId === category.id);
assert(categoryProducts.length >= 2, "fixture category must include products");
const minimumProduct = categoryProducts.reduce((minimum, product) => product.price < minimum.price ? product : minimum);
const maximumProduct = categoryProducts.reduce((maximum, product) => product.price > maximum.price ? product : maximum);
const productsFor = (categoryId) => referenceMenu.products.filter((product) => product.categoryId === categoryId);
test("price position uses one category min–max scale", () => {
    assert(pricePositionFor(minimumProduct, categoryProducts).position === 0, "minimum price must start the scale");
    assert(pricePositionFor(maximumProduct, categoryProducts).position === 1, "maximum price must end the scale");
});
test("single-price categories degrade to a centered marker", () => {
    const samePrice = categoryProducts.map((product, index) => ({ ...product, id: `same-${index}`, price: 180 }));
    const projection = pricePositionFor(samePrice[0], samePrice);
    assert(projection.scale === "single", "same-price category must expose a single scale");
    assert(projection.position === 0.5, "same-price marker must remain safely centered");
});
test("portion, role, and preparation use formal labels", () => {
    const product = categoryProducts[0];
    assert(product !== undefined, "fixture must include a product");
    const portion = axisValueFor(referenceMenu, product, categoryProducts, "portion");
    const role = axisValueFor(referenceMenu, product, categoryProducts, "role");
    const preparation = axisValueFor(referenceMenu, product, categoryProducts, "preparation");
    assert(portion.kind === "text" && portion.label === "一人份", "portion label must use the domain enum");
    assert(role.kind === "text" && role.label === "個人主餐", "role label must use the domain enum");
    assert(preparation.kind === "text" && preparation.label === "一般準備", "preparation label must use the domain enum");
});
const emptyCategory = { id: "unknown", name: "未標註" };
const missingProduct = {
    id: "missing",
    name: "未標註商品",
    description: "測試",
    price: 100,
    categoryId: emptyCategory.id,
    availability: "available",
};
const lowConfidenceProduct = {
    ...missingProduct,
    id: "low-confidence",
    semanticOverrides: {
        portionClass: {
            value: "large_shared",
            source: "merchant_confirmed",
            confidence: "low",
        },
    },
};
const incompleteMenu = {
    restaurant: referenceMenu.restaurant,
    categories: [emptyCategory],
    modifierGroups: [],
    products: [missingProduct, lowConfidenceProduct],
};
test("missing and low-confidence metadata remain unknown", () => {
    [missingProduct, lowConfidenceProduct].forEach((product) => {
        const value = axisValueFor(incompleteMenu, product, incompleteMenu.products, "portion");
        assert(value.kind === "text" && value.label === "未提供", "unsupported metadata must not be guessed");
        assert(value.status === "unknown", "unknown metadata must stay explicit");
    });
});
test("the deployed reference menu contains executable unknown-axis evidence", () => {
    const fish = referenceMenu.products.find((product) => product.id === "black-bean-steamed-seabass");
    assert(fish !== undefined, "reference fixture must include the steamed seabass");
    const peers = productsFor(fish.categoryId);
    const value = axisValueFor(referenceMenu, fish, peers, "portion");
    assert(value.kind === "text" && value.label === "未提供", "the live portion axis must expose one unknown product");
    assert(value.status === "unknown", "the live unknown example must remain explicitly unknown");
});
test("only axes with category-local relational evidence are offered", () => {
    const personal = productsFor("personal-mains");
    const personalAxes = availableReadingAxesFor(referenceMenu, personal);
    assert(personalAxes.includes("price"), "personal mains must expose price differences");
    assert(personalAxes.includes("preparation"), "personal mains must expose preparation differences");
    assert(!personalAxes.includes("portion"), "uniform one-person portions must not become a repeated row mode");
    assert(!personalAxes.includes("role"), "a category label repeated in every row is not relational evidence");
    const shared = productsFor("shared-dishes");
    const sharedAxes = availableReadingAxesFor(referenceMenu, shared);
    assert(sharedAxes.includes("price"), "shared dishes must expose price differences");
    assert(sharedAxes.includes("portion"), "shared dishes must expose known and unknown portion differences");
    assert(sharedAxes.includes("preparation"), "shared dishes must expose preparation differences");
    assert(!sharedAxes.includes("role"), "uniform shared-main roles must not be offered as a row mode");
    const desserts = productsFor("desserts");
    assert(JSON.stringify(availableReadingAxesFor(referenceMenu, desserts)) === JSON.stringify(["default"]), "a two-product category cannot satisfy the three-product relational gate");
});
test("sold-out products retain axis evidence and canonical position", () => {
    const soldOutIndex = referenceMenu.products.findIndex((product) => product.availability === "sold_out");
    assert(soldOutIndex >= 0, "fixture must include a sold-out product");
    const soldOut = referenceMenu.products[soldOutIndex];
    assert(soldOut !== undefined, "sold-out product must exist");
    const peers = referenceMenu.products.filter((product) => product.categoryId === soldOut.categoryId);
    const value = axisValueFor(referenceMenu, soldOut, peers, "preparation");
    assert(value.kind === "text", "sold-out product must retain axis projection");
    assert(referenceMenu.products[soldOutIndex]?.id === soldOut.id, "projection must not move the product");
});
test("axis projections never emit recommendation language", () => {
    const visible = JSON.stringify(referenceMenu.products.flatMap((product) => {
        const peers = referenceMenu.products.filter((entry) => entry.categoryId === product.categoryId);
        return ["price", "portion", "role", "preparation"].map((axis) => axisValueFor(referenceMenu, product, peers, axis));
    }));
    ["推薦", "最佳", "較適合", "CP 值", "recommended", "best value"].forEach((phrase) => assert(!visible.includes(phrase), `projection must not emit ${phrase}`));
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
    throw new Error(`${failures} menu relation test(s) failed`);
console.log(`\n${tests.length} menu relation tests passed.`);
