const availabilityValues = new Set(["available", "sold_out"]);
const mealRoleValues = new Set([
    "personal_main",
    "shared_main",
    "side",
    "staple",
    "drink",
    "dessert",
]);
const portionClassValues = new Set([
    "small",
    "one_person",
    "two_to_three",
    "large_shared",
]);
const preparationClassValues = new Set([
    "fast",
    "normal",
    "slow",
]);
const coarseTraitValues = new Set([
    "light",
    "rich",
    "spicy",
    "vegetarian",
]);
const metadataSourceValues = new Set([
    "merchant_confirmed",
    "category_default",
]);
const metadataConfidenceValues = new Set([
    "high",
    "medium",
    "low",
]);
export class MenuValidationError extends Error {
    issues;
    constructor(issues) {
        super(`Menu validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
        this.name = "MenuValidationError";
        this.issues = issues;
    }
}
const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const addIssue = (context, path, message) => {
    context.issues.push(`${path}: ${message}`);
};
const rejectKnownFieldTypos = (object, path, typos, context) => {
    Object.entries(typos).forEach(([typo, expected]) => {
        if (Object.hasOwn(object, typo)) {
            addIssue(context, `${path}.${typo}`, `is not a recognized field; use "${expected}"`);
        }
    });
};
const readObject = (value, path, context) => {
    if (!isObject(value)) {
        addIssue(context, path, "must be an object");
        return undefined;
    }
    return value;
};
const readArray = (value, path, context) => {
    if (!Array.isArray(value)) {
        addIssue(context, path, "must be an array");
        return undefined;
    }
    return value;
};
const readNonEmptyString = (value, path, context) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        addIssue(context, path, "must be a non-empty string");
        return undefined;
    }
    return value;
};
const readBoolean = (value, path, context) => {
    if (typeof value !== "boolean") {
        addIssue(context, path, "must be a boolean");
        return undefined;
    }
    return value;
};
const readFiniteNonNegativeNumber = (value, path, context) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        addIssue(context, path, "must be a finite non-negative number");
        return undefined;
    }
    return value;
};
const readNonNegativeInteger = (value, path, context) => {
    if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
        addIssue(context, path, "must be a non-negative integer");
        return undefined;
    }
    return value;
};
const validateEnum = (value, allowed, path, context) => {
    if (typeof value !== "string" || !allowed.has(value)) {
        addIssue(context, path, `must be one of: ${[...allowed].join(", ")}`);
        return undefined;
    }
    return value;
};
const validateUniqueStrings = (values, path, context) => {
    const array = readArray(values, path, context);
    if (!array) {
        return undefined;
    }
    const result = [];
    const seen = new Set();
    array.forEach((value, index) => {
        const parsed = readNonEmptyString(value, `${path}[${index}]`, context);
        if (!parsed) {
            return;
        }
        if (seen.has(parsed)) {
            addIssue(context, `${path}[${index}]`, `duplicate reference "${parsed}"`);
            return;
        }
        seen.add(parsed);
        result.push(parsed);
    });
    return result;
};
const validateMetadataValue = (value, path, context, validateValue, expectedSource) => {
    const object = readObject(value, path, context);
    if (!object) {
        return;
    }
    validateValue(object.value, `${path}.value`, context);
    const source = validateEnum(object.source, metadataSourceValues, `${path}.source`, context);
    validateEnum(object.confidence, metadataConfidenceValues, `${path}.confidence`, context);
    if (source && expectedSource && source !== expectedSource) {
        addIssue(context, `${path}.source`, `must be "${expectedSource}" in this context`);
    }
};
const validateTraits = (value, path, context) => {
    const array = readArray(value, path, context);
    if (!array) {
        return undefined;
    }
    if (array.length === 0) {
        addIssue(context, path, "must contain at least one trait when provided");
    }
    const seen = new Set();
    const result = [];
    array.forEach((entry, index) => {
        const parsed = validateEnum(entry, coarseTraitValues, `${path}[${index}]`, context);
        if (!parsed) {
            return;
        }
        if (seen.has(parsed)) {
            addIssue(context, `${path}[${index}]`, `duplicate trait "${parsed}"`);
            return;
        }
        seen.add(parsed);
        result.push(parsed);
    });
    return result;
};
const validateSemantics = (value, path, context, expectedSource) => {
    const object = readObject(value, path, context);
    if (!object) {
        return;
    }
    if (object.mealRole !== undefined) {
        validateMetadataValue(object.mealRole, `${path}.mealRole`, context, (entry, entryPath, entryContext) => validateEnum(entry, mealRoleValues, entryPath, entryContext), expectedSource);
    }
    if (object.portionClass !== undefined) {
        validateMetadataValue(object.portionClass, `${path}.portionClass`, context, (entry, entryPath, entryContext) => validateEnum(entry, portionClassValues, entryPath, entryContext), expectedSource);
    }
    if (object.preparationClass !== undefined) {
        validateMetadataValue(object.preparationClass, `${path}.preparationClass`, context, (entry, entryPath, entryContext) => validateEnum(entry, preparationClassValues, entryPath, entryContext), expectedSource);
    }
    if (object.shareable !== undefined) {
        validateMetadataValue(object.shareable, `${path}.shareable`, context, readBoolean, expectedSource);
    }
    if (object.traits !== undefined) {
        validateMetadataValue(object.traits, `${path}.traits`, context, validateTraits, expectedSource);
    }
};
const validateCategory = (value, index, context) => {
    const path = `categories[${index}]`;
    const object = readObject(value, path, context);
    if (!object) {
        return undefined;
    }
    const id = readNonEmptyString(object.id, `${path}.id`, context);
    readNonEmptyString(object.name, `${path}.name`, context);
    if (object.description !== undefined) {
        readNonEmptyString(object.description, `${path}.description`, context);
    }
    if (object.semanticDefaults !== undefined) {
        validateSemantics(object.semanticDefaults, `${path}.semanticDefaults`, context, "category_default");
    }
    return id;
};
const validateModifierGroup = (value, index, context, globalOptionIds) => {
    const path = `modifierGroups[${index}]`;
    const object = readObject(value, path, context);
    if (!object) {
        return undefined;
    }
    rejectKnownFieldTypos(object, path, { minimumSelection: "minimumSelections" }, context);
    const id = readNonEmptyString(object.id, `${path}.id`, context);
    readNonEmptyString(object.name, `${path}.name`, context);
    const required = readBoolean(object.required, `${path}.required`, context);
    const minimumSelections = readNonNegativeInteger(object.minimumSelections, `${path}.minimumSelections`, context);
    const maximumSelections = readNonNegativeInteger(object.maximumSelections, `${path}.maximumSelections`, context);
    const options = readArray(object.options, `${path}.options`, context);
    const localOptionIds = new Set();
    if (options) {
        if (options.length === 0) {
            addIssue(context, `${path}.options`, "must contain at least one selectable option");
        }
        options.forEach((entry, optionIndex) => {
            const optionPath = `${path}.options[${optionIndex}]`;
            const option = readObject(entry, optionPath, context);
            if (!option) {
                return;
            }
            const optionId = readNonEmptyString(option.id, `${optionPath}.id`, context);
            readNonEmptyString(option.name, `${optionPath}.name`, context);
            readFiniteNonNegativeNumber(option.priceDelta, `${optionPath}.priceDelta`, context);
            if (!optionId) {
                return;
            }
            if (localOptionIds.has(optionId)) {
                addIssue(context, `${optionPath}.id`, `duplicate option ID "${optionId}" in group`);
            }
            if (globalOptionIds.has(optionId)) {
                addIssue(context, `${optionPath}.id`, `duplicate modifier option ID "${optionId}"`);
            }
            localOptionIds.add(optionId);
            globalOptionIds.add(optionId);
        });
    }
    if (minimumSelections !== undefined &&
        maximumSelections !== undefined &&
        minimumSelections > maximumSelections) {
        addIssue(context, path, "minimumSelections must not exceed maximumSelections");
    }
    if (maximumSelections !== undefined && options && maximumSelections > options.length) {
        addIssue(context, `${path}.maximumSelections`, "must not exceed the number of options");
    }
    if (required === true && minimumSelections !== undefined && minimumSelections < 1) {
        addIssue(context, `${path}.minimumSelections`, "must be at least 1 for a required group");
    }
    if (required === false && minimumSelections !== undefined && minimumSelections !== 0) {
        addIssue(context, `${path}.minimumSelections`, "must be 0 for an optional group");
    }
    if (object.defaultOptionIds !== undefined) {
        const defaults = validateUniqueStrings(object.defaultOptionIds, `${path}.defaultOptionIds`, context);
        if (defaults) {
            defaults.forEach((defaultId, defaultIndex) => {
                if (!localOptionIds.has(defaultId)) {
                    addIssue(context, `${path}.defaultOptionIds[${defaultIndex}]`, `references unknown option "${defaultId}"`);
                }
            });
            if (minimumSelections !== undefined &&
                defaults.length < minimumSelections) {
                addIssue(context, `${path}.defaultOptionIds`, "default selections must satisfy minimumSelections");
            }
            if (maximumSelections !== undefined &&
                defaults.length > maximumSelections) {
                addIssue(context, `${path}.defaultOptionIds`, "default selections must not exceed maximumSelections");
            }
        }
    }
    return id;
};
const validateProduct = (value, index, context, categoryIds, modifierGroupIds) => {
    const path = `products[${index}]`;
    const object = readObject(value, path, context);
    if (!object) {
        return undefined;
    }
    rejectKnownFieldTypos(object, path, {
        availablity: "availability",
        modifierGroupId: "modifierGroupIds",
        semanticOverride: "semanticOverrides",
    }, context);
    const id = readNonEmptyString(object.id, `${path}.id`, context);
    readNonEmptyString(object.name, `${path}.name`, context);
    readNonEmptyString(object.description, `${path}.description`, context);
    readFiniteNonNegativeNumber(object.price, `${path}.price`, context);
    const categoryId = readNonEmptyString(object.categoryId, `${path}.categoryId`, context);
    if (categoryId && !categoryIds.has(categoryId)) {
        addIssue(context, `${path}.categoryId`, `references unknown category "${categoryId}"`);
    }
    validateEnum(object.availability, availabilityValues, `${path}.availability`, context);
    if (object.modifierGroupIds !== undefined) {
        const references = validateUniqueStrings(object.modifierGroupIds, `${path}.modifierGroupIds`, context);
        references?.forEach((modifierGroupId, referenceIndex) => {
            if (!modifierGroupIds.has(modifierGroupId)) {
                addIssue(context, `${path}.modifierGroupIds[${referenceIndex}]`, `references unknown modifier group "${modifierGroupId}"`);
            }
        });
    }
    if (object.semanticOverrides !== undefined) {
        validateSemantics(object.semanticOverrides, `${path}.semanticOverrides`, context, "merchant_confirmed");
    }
    if (object.featured !== undefined) {
        const featured = readObject(object.featured, `${path}.featured`, context);
        if (featured) {
            readNonEmptyString(featured.note, `${path}.featured.note`, context);
            const source = validateEnum(featured.source, metadataSourceValues, `${path}.featured.source`, context);
            if (source && source !== "merchant_confirmed") {
                addIssue(context, `${path}.featured.source`, 'must be "merchant_confirmed" for editorial features');
            }
        }
    }
    return id;
};
const recordUniqueId = (id, path, label, ids, context) => {
    if (!id) {
        return;
    }
    if (ids.has(id)) {
        addIssue(context, path, `duplicate ${label} ID "${id}"`);
    }
    ids.add(id);
};
export const validateMenu = (input) => {
    const context = { issues: [] };
    const root = readObject(input, "menu", context);
    if (!root) {
        throw new MenuValidationError(context.issues);
    }
    const restaurant = readObject(root.restaurant, "restaurant", context);
    if (restaurant) {
        readNonEmptyString(restaurant.id, "restaurant.id", context);
        readNonEmptyString(restaurant.name, "restaurant.name", context);
        readNonEmptyString(restaurant.description, "restaurant.description", context);
        if (restaurant.currency !== "TWD") {
            addIssue(context, "restaurant.currency", 'must be "TWD"');
        }
    }
    const categoryIds = new Set();
    const categories = readArray(root.categories, "categories", context);
    categories?.forEach((category, index) => {
        const id = validateCategory(category, index, context);
        recordUniqueId(id, `categories[${index}].id`, "category", categoryIds, context);
    });
    const modifierGroupIds = new Set();
    const modifierOptionIds = new Set();
    const modifierGroups = readArray(root.modifierGroups, "modifierGroups", context);
    modifierGroups?.forEach((modifierGroup, index) => {
        const id = validateModifierGroup(modifierGroup, index, context, modifierOptionIds);
        recordUniqueId(id, `modifierGroups[${index}].id`, "modifier group", modifierGroupIds, context);
    });
    const productIds = new Set();
    const products = readArray(root.products, "products", context);
    products?.forEach((product, index) => {
        const id = validateProduct(product, index, context, categoryIds, modifierGroupIds);
        recordUniqueId(id, `products[${index}].id`, "product", productIds, context);
    });
    if (context.issues.length > 0) {
        throw new MenuValidationError(context.issues);
    }
    return input;
};
export const resolveProductSemantics = (menu, product) => {
    const category = menu.categories.find((entry) => entry.id === product.categoryId);
    return {
        ...category?.semanticDefaults,
        ...product.semanticOverrides,
    };
};
export const productRequiresConfiguration = (menu, product) => {
    const referencedGroups = new Set(product.modifierGroupIds ?? []);
    return menu.modifierGroups.some((group) => referencedGroups.has(group.id) && group.required);
};
export const hasCompleteComparisonSemantics = (semantics) => semantics.mealRole !== undefined &&
    semantics.portionClass !== undefined &&
    semantics.preparationClass !== undefined &&
    semantics.shareable !== undefined &&
    semantics.traits !== undefined;
