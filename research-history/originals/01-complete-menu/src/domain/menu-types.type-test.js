const productId = "product-1";
const selection = {
    modifierGroupId: "group-1",
    optionIds: ["option-1"],
};
const candidate = { productId };
void candidate;
const candidateWithQuantityValue = { productId, quantity: 1 };
// @ts-expect-error Candidate cannot carry quantity.
const candidateWithQuantity = candidateWithQuantityValue;
void candidateWithQuantity;
const candidateWithConfigurationValue = {
    productId,
    configuration: { selections: [selection] },
};
// @ts-expect-error Candidate cannot carry completed configuration.
const candidateWithConfiguration = candidateWithConfigurationValue;
void candidateWithConfiguration;
const candidateWithSelectionsValue = { productId, selections: [selection] };
// @ts-expect-error Candidate cannot carry modifier selections.
const candidateWithSelections = candidateWithSelectionsValue;
void candidateWithSelections;
const draft = {
    state: "draft",
    id: "draft-1",
    productId,
    quantity: 1,
};
void draft;
const draftWithSelectionsValue = {
    state: "draft",
    id: "draft-2",
    productId,
    quantity: 1,
    selections: [selection],
};
// @ts-expect-error DraftOrderItem cannot carry modifier selections.
const draftWithSelections = draftWithSelectionsValue;
void draftWithSelections;
const draftWithConfigurationValue = {
    state: "draft",
    id: "draft-3",
    productId,
    quantity: 1,
    configuration: { selections: [selection] },
};
// @ts-expect-error DraftOrderItem cannot carry completed configuration.
const draftWithConfiguration = draftWithConfigurationValue;
void draftWithConfiguration;
const configuredWithoutConfigurationValue = {
    state: "configured",
    id: "configured-1",
    productId,
    quantity: 1,
};
// @ts-expect-error ConfiguredOrderItem requires completed configuration.
const configuredWithoutConfiguration = configuredWithoutConfigurationValue;
void configuredWithoutConfiguration;
const configured = {
    state: "configured",
    id: "configured-2",
    productId,
    quantity: 1,
    configuration: { selections: [selection] },
};
void configured;
const configuredWithInvalidSelectionValue = {
    state: "configured",
    id: "configured-3",
    productId,
    quantity: 1,
    configuration: {
        selections: [
            { modifierGroupId: "group-1", selectedOptionIds: ["option-1"] },
        ],
    },
};
// @ts-expect-error Configuration selections must use ModifierSelection.
const configuredWithInvalidSelection = configuredWithInvalidSelectionValue;
void configuredWithInvalidSelection;
const submitted = {
    state: "submitted",
    id: "round-1",
    submittedAt: "2026-07-23T12:00:00+08:00",
    items: [configured],
};
void submitted;
const submittedWithDraftValue = {
    state: "submitted",
    id: "round-2",
    submittedAt: "2026-07-23T12:00:00+08:00",
    items: [draft],
};
// @ts-expect-error SubmittedOrderRound can only contain configured items.
const submittedWithDraft = submittedWithDraftValue;
void submittedWithDraft;
export {};
