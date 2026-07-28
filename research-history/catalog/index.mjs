const OBJECT_TYPES = Object.freeze([
  "historical",
  "prototype",
  "correction",
  "study",
  "synthesis",
]);

const DISPOSITIONS = Object.freeze([
  "substrate",
  "reference",
  "keep-controlled",
  "provisional",
  "negative-evidence",
  "study-only",
  "superseded",
  "rejected",
]);

const EVIDENCE_STATES = Object.freeze([
  "implementation-only",
  "browser-verified",
  "direct-review-pending",
  "participant-study-ready",
  "participant-evidence-complete",
]);

const STATUS_TO_DISPOSITION = Object.freeze({
  "accepted-substrate": "substrate",
  "current-substrate": "substrate",
  "baseline-recorded": "reference",
  "reference-variant": "reference",
  preserved: "keep-controlled",
  "active-variant": "keep-controlled",
  "active-hypothesis": "keep-controlled",
  "unresolved-revisit": "provisional",
  "reviewed-stop": "negative-evidence",
  "product-invalid": "rejected",
  "rejected-main-flow": "rejected",
  "rejected-default-flow": "rejected",
});

const KIND_TO_OBJECT_TYPE = Object.freeze({
  "historical-node": "historical",
  reconstruction: "prototype",
  revisit: "prototype",
  baseline: "prototype",
  "spatial-prototype": "prototype",
  "prototype-family": "prototype",
});

const DEFAULT_METADATA = Object.freeze({
  objectType: "prototype",
  disposition: "provisional",
  evidenceState: "implementation-only",
  dependsOn: Object.freeze([]),
  evidenceFor: Object.freeze([]),
  mechanismsFrom: Object.freeze([]),
  nextGate: null,
  reviewDocument: null,
  evidencePath: null,
  sourcePr: null,
  sourceCommit: null,
});

const CURRENT_OVERRIDES = Object.freeze({
  "01": { evidenceState: "browser-verified" },
  "04": { objectType: "historical" },
  "07": { evidenceState: "implementation-only" },
  "18": { evidenceState: "browser-verified" },
  "25": { objectType: "prototype" },
});

const freezeArray = (value) => Object.freeze([...(value ?? [])]);

const normalizeLegacyObject = (legacyObject) => {
  const override = CURRENT_OVERRIDES[legacyObject.id] ?? {};
  const objectType = override.objectType
    ?? KIND_TO_OBJECT_TYPE[legacyObject.kind]
    ?? DEFAULT_METADATA.objectType;
  const disposition = override.disposition
    ?? STATUS_TO_DISPOSITION[legacyObject.status]
    ?? DEFAULT_METADATA.disposition;

  return Object.freeze({
    id: legacyObject.id,
    slug: legacyObject.slug,
    title: legacyObject.title,
    family: legacyObject.family,
    objectType,
    researchParentId: legacyObject.parentId ?? null,
    dependsOn: freezeArray(override.dependsOn ?? DEFAULT_METADATA.dependsOn),
    evidenceFor: freezeArray(override.evidenceFor ?? DEFAULT_METADATA.evidenceFor),
    mechanismsFrom: freezeArray(override.mechanismsFrom ?? DEFAULT_METADATA.mechanismsFrom),
    disposition,
    evidenceState: override.evidenceState ?? DEFAULT_METADATA.evidenceState,
    entrypoint: legacyObject.path ?? null,
    validationProfile: legacyObject.validationProfile ?? null,
    summary: legacyObject.summary,
    assets: Object.freeze({
      styles: freezeArray(legacyObject.assets?.styles),
      scripts: freezeArray(legacyObject.assets?.scripts),
    }),
    nextGate: override.nextGate ?? DEFAULT_METADATA.nextGate,
    reviewDocument: override.reviewDocument ?? DEFAULT_METADATA.reviewDocument,
    evidencePath: override.evidencePath ?? DEFAULT_METADATA.evidencePath,
    sourcePr: override.sourcePr ?? DEFAULT_METADATA.sourcePr,
    sourceCommit: override.sourceCommit ?? DEFAULT_METADATA.sourceCommit,
    legacy: Object.freeze({
      kind: legacyObject.kind,
      status: legacyObject.status,
      statusLabel: legacyObject.statusLabel,
    }),
  });
};

const normalizeExtension = (extension) => Object.freeze({
  ...DEFAULT_METADATA,
  ...extension,
  researchParentId: extension.researchParentId ?? null,
  dependsOn: freezeArray(extension.dependsOn),
  evidenceFor: freezeArray(extension.evidenceFor),
  mechanismsFrom: freezeArray(extension.mechanismsFrom),
  assets: Object.freeze({
    styles: freezeArray(extension.assets?.styles),
    scripts: freezeArray(extension.assets?.scripts),
  }),
  legacy: extension.legacy ? Object.freeze({ ...extension.legacy }) : null,
});

export function buildArchiveCatalog(legacyRegistry, extensions = []) {
  if (!legacyRegistry || !Array.isArray(legacyRegistry.families) || !Array.isArray(legacyRegistry.prototypes)) {
    throw new TypeError("Archive catalog requires the legacy prototype registry during migration.");
  }

  const objects = [
    ...legacyRegistry.prototypes.map(normalizeLegacyObject),
    ...extensions.map(normalizeExtension),
  ];

  return Object.freeze({
    schemaVersion: 2,
    migrationSourceSchemaVersion: legacyRegistry.schemaVersion ?? null,
    objectTypes: OBJECT_TYPES,
    dispositions: DISPOSITIONS,
    evidenceStates: EVIDENCE_STATES,
    families: Object.freeze(legacyRegistry.families.map((family) => Object.freeze({ ...family }))),
    objects: Object.freeze(objects),
  });
}
