const freezeState = (state) => state
  ? Object.freeze({
      ...state,
      map: state.map ? Object.freeze({ ...state.map }) : undefined,
      activeSelectors: state.activeSelectors ? Object.freeze([...state.activeSelectors]) : undefined,
      attributes: state.attributes ? Object.freeze([...state.attributes]) : undefined,
    })
  : null;

const freezeMutation = (mutation) => Object.freeze({
  ...mutation,
  attributes: mutation.attributes ? Object.freeze({ ...mutation.attributes }) : undefined,
});

const basePresentationCss = (profile) => `
  [data-model-live-presentation="${profile}"] .phone-status {
    display: none !important;
  }
`;

const freezePresentation = (presentation) => Object.freeze({
  ...presentation,
  state: freezeState(presentation.state),
  mutations: Object.freeze((presentation.mutations ?? []).map(freezeMutation)),
  css: `${basePresentationCss(presentation.id)}\n${presentation.css ?? ""}`,
});

const compactReturnCss = ({ profile, toolbar, returnSelector }) => `
  [data-model-live-presentation="${profile}"] ${toolbar} {
    display: none !important;
    min-height: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
  }
  [data-model-live-presentation="${profile}"][data-model-live-presentation-state="focus"] ${toolbar} {
    position: relative !important;
    inset: auto !important;
    z-index: 40 !important;
    display: flex !important;
    width: 100% !important;
    min-height: 3.15rem !important;
    align-items: center !important;
    margin: 0 !important;
    padding: .45rem .55rem !important;
    border-bottom: 1px solid var(--line) !important;
    background: var(--surface-strong) !important;
  }
  [data-model-live-presentation="${profile}"] ${toolbar} > * {
    display: none !important;
  }
  [data-model-live-presentation="${profile}"] ${returnSelector} {
    display: inline-flex !important;
    min-width: 2.25rem !important;
    min-height: 2.25rem !important;
    align-items: center !important;
    justify-content: center !important;
    padding: .35rem .62rem !important;
    border: 1px solid var(--line-strong) !important;
    background: var(--surface-strong) !important;
    color: var(--ink) !important;
    font-size: .74rem !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    writing-mode: horizontal-tb !important;
    white-space: nowrap !important;
  }
`;

const compactNavigatorCss = ({ profile, phone, toolbar, hiddenSelector }) => `
  [data-model-live-presentation="${profile}"] ${phone} {
    position: relative !important;
  }
  [data-model-live-presentation="${profile}"] ${toolbar} {
    position: absolute !important;
    top: .55rem !important;
    right: .55rem !important;
    z-index: 40 !important;
    display: grid !important;
    grid-auto-flow: column !important;
    grid-auto-columns: auto !important;
    width: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: .2rem !important;
    gap: .2rem !important;
    border: 1px solid var(--line) !important;
    background: rgb(255 253 248 / 94%) !important;
    box-shadow: 0 .2rem .7rem rgb(38 31 24 / 12%) !important;
    backdrop-filter: blur(8px);
  }
  [data-model-live-presentation="${profile}"] ${toolbar} button {
    display: block !important;
    min-width: 2rem !important;
    min-height: 2rem !important;
    padding: .25rem .4rem !important;
  }
  [data-model-live-presentation="${profile}"] ${hiddenSelector} {
    display: none !important;
  }
`;

const overviewOnlyRestaurantCss = ({ profile, restaurant }) => `
  [data-model-live-presentation="${profile}"][data-model-live-presentation-state="focus"] ${restaurant} {
    display: none !important;
  }
`;

const returnMutation = (selector, text) => ({
  selector,
  text,
  attributes: { "aria-label": text.replace(/^←\s*/, "") },
});

const presentations = Object.freeze({
  multiscale: freezePresentation({
    id: "multiscale",
    state: {
      selector: ".multiscale-screen",
      attribute: "data-focused",
      fallback: "false",
      map: { false: "overview", true: "focus" },
    },
    mutations: [
      returnMutation("#collapse-all", "← 返回全部分類"),
      { selector: ".workspace-topbar", attributes: { "aria-label": "返回全部分類" } },
    ],
    css: `
      [data-model-live-presentation="multiscale"] .multiscale-screen {
        position: relative !important;
      }
      [data-model-live-presentation="multiscale"][data-model-live-presentation-state="focus"] .multiscale-screen > header {
        display: none !important;
      }
      ${compactReturnCss({
        profile: "multiscale",
        toolbar: ".workspace-topbar",
        returnSelector: "#collapse-all",
      })}
      [data-model-live-presentation="multiscale"] #scale-label {
        display: none !important;
      }
    `,
  }),
  spread: freezePresentation({
    id: "spread",
    state: {
      selector: ".spread-map",
      attribute: "data-mode",
      fallback: "overview",
    },
    mutations: [
      returnMutation("#spread-overview", "← 返回全部分類"),
      { selector: ".spread-toolbar", attributes: { "aria-label": "返回全部分類" } },
    ],
    css: `
      ${compactReturnCss({
        profile: "spread",
        toolbar: ".spread-toolbar",
        returnSelector: "#spread-overview",
      })}
      [data-model-live-presentation="spread"] .spread-hint {
        display: none !important;
      }
      ${overviewOnlyRestaurantCss({ profile: "spread", restaurant: ".spread-restaurant" })}
    `,
  }),
  ribbon: freezePresentation({
    id: "ribbon",
    state: {
      selector: ".ribbon-viewport",
      attribute: "data-scale",
      fallback: "overview",
      map: { overview: "overview", reading: "focus" },
    },
    mutations: [returnMutation("#ribbon-overview", "← 返回全部料理")],
    css: `
      ${compactReturnCss({
        profile: "ribbon",
        toolbar: ".ribbon-scale-bar",
        returnSelector: "#ribbon-overview",
      })}
      ${overviewOnlyRestaurantCss({ profile: "ribbon", restaurant: ".ribbon-restaurant" })}
    `,
  }),
  fisheye: freezePresentation({
    id: "fisheye",
    state: {
      selector: ".fisheye-stage",
      attribute: "data-lens",
      fallback: "category",
      map: { category: "overview", product: "focus" },
    },
    mutations: [
      returnMutation("#fisheye-category-lens", "← 返回分類"),
      { selector: ".fisheye-lens-switch", attributes: { "aria-label": "返回分類" } },
    ],
    css: `
      [data-model-live-presentation="fisheye"] .fisheye-toolbar,
      [data-model-live-presentation="fisheye"] .fisheye-hint {
        display: none !important;
      }
      ${compactReturnCss({
        profile: "fisheye",
        toolbar: ".fisheye-lens-switch",
        returnSelector: "#fisheye-category-lens",
      })}
      ${overviewOnlyRestaurantCss({ profile: "fisheye", restaurant: ".fisheye-restaurant" })}
    `,
  }),
  matrix: freezePresentation({
    id: "matrix",
    state: {
      selector: ".matrix-board",
      attribute: "data-mode",
      fallback: "overview",
    },
    mutations: [returnMutation("#matrix-overview", "← 返回矩陣")],
    css: `
      ${compactReturnCss({
        profile: "matrix",
        toolbar: ".matrix-toolbar",
        returnSelector: "#matrix-overview",
      })}
      ${overviewOnlyRestaurantCss({ profile: "matrix", restaurant: ".matrix-restaurant" })}
    `,
  }),
  paper: freezePresentation({
    id: "paper",
    state: {
      selector: ".paper-viewport",
      attribute: "data-scale",
      fallback: "overview",
    },
    mutations: [returnMutation(".paper-toolbar > button:first-child", "← 返回全覽")],
    css: `
      ${compactReturnCss({
        profile: "paper",
        toolbar: ".paper-toolbar",
        returnSelector: ".paper-toolbar > button:first-child",
      })}
      [data-model-live-presentation="paper"] .paper-hint {
        display: none !important;
      }
      ${overviewOnlyRestaurantCss({ profile: "paper", restaurant: ".paper-restaurant" })}
    `,
  }),
  loupe: freezePresentation({
    id: "loupe",
    state: null,
    css: `
      ${compactNavigatorCss({
        profile: "loupe",
        phone: ".paper-phone",
        toolbar: ".paper-toolbar",
        hiddenSelector: ".paper-restaurant, .paper-location",
      })}
    `,
  }),
  landscapeCamera: freezePresentation({
    id: "landscape-camera",
    state: {
      selector: ".landscape-viewport",
      attribute: "data-scale",
      fallback: "overview",
      map: { overview: "overview", reading: "focus", focus: "focus" },
    },
    mutations: [returnMutation(".paper-toolbar > button:first-child", "← 返回全覽")],
    css: `
      ${compactReturnCss({
        profile: "landscape-camera",
        toolbar: ".paper-toolbar",
        returnSelector: ".paper-toolbar > button:first-child",
      })}
      [data-model-live-presentation="landscape-camera"] .paper-hint {
        display: none !important;
      }
      ${overviewOnlyRestaurantCss({ profile: "landscape-camera", restaurant: ".paper-restaurant" })}
    `,
  }),
  landscapeContinuous: freezePresentation({
    id: "landscape-continuous",
    state: null,
    css: `
      ${compactNavigatorCss({
        profile: "landscape-continuous",
        phone: ".paper-phone",
        toolbar: ".paper-toolbar",
        hiddenSelector: ".paper-restaurant, .paper-location",
      })}
    `,
  }),
  landscapeFocus: freezePresentation({
    id: "landscape-focus",
    state: {
      activeSelectors: [
        ".paper-category[data-focused=\"true\"]",
        ".landscape-column[data-active=\"true\"]",
      ],
      attributes: ["data-focused", "data-active"],
    },
    mutations: [returnMutation(".paper-toolbar > button:first-child", "← 返回全覽")],
    css: `
      ${compactReturnCss({
        profile: "landscape-focus",
        toolbar: ".paper-toolbar",
        returnSelector: ".paper-toolbar > button:first-child",
      })}
      [data-model-live-presentation="landscape-focus"] .paper-hint {
        display: none !important;
      }
      ${overviewOnlyRestaurantCss({ profile: "landscape-focus", restaurant: ".paper-restaurant" })}
    `,
  }),
  rigidSheet: freezePresentation({
    id: "rigid-sheet",
    state: {
      selector: "#rigid-stage",
      attribute: "data-mode",
      fallback: "overview",
      map: { overview: "overview", reading: "focus" },
    },
    mutations: [returnMutation("#rigid-overview", "← 返回全覽")],
    css: `
      ${compactReturnCss({
        profile: "rigid-sheet",
        toolbar: ".paper-toolbar",
        returnSelector: "#rigid-overview",
      })}
      [data-model-live-presentation="rigid-sheet"] .paper-hint {
        display: none !important;
      }
      ${overviewOnlyRestaurantCss({ profile: "rigid-sheet", restaurant: ".paper-restaurant" })}
    `,
  }),
  trifold: freezePresentation({
    id: "trifold",
    state: {
      selector: "#trifold-stage",
      attribute: "data-mode",
      fallback: "overview",
      map: { overview: "overview", focus: "focus" },
    },
    mutations: [returnMutation("#trifold-overview", "← 返回全覽")],
    css: `
      ${compactReturnCss({
        profile: "trifold",
        toolbar: ".paper-toolbar",
        returnSelector: "#trifold-overview",
      })}
      [data-model-live-presentation="trifold"] .paper-hint {
        display: none !important;
      }
      ${overviewOnlyRestaurantCss({ profile: "trifold", restaurant: ".paper-restaurant" })}
    `,
  }),
  twoColumn: freezePresentation({
    id: "two-column",
    state: {
      selector: "#window-stage",
      attribute: "data-mode",
      fallback: "overview",
      map: { overview: "overview", reading: "focus" },
    },
    mutations: [returnMutation("#window-overview", "← 返回全覽")],
    css: `
      ${compactReturnCss({
        profile: "two-column",
        toolbar: ".paper-toolbar",
        returnSelector: "#window-overview",
      })}
      [data-model-live-presentation="two-column"] .paper-hint {
        display: none !important;
      }
      ${overviewOnlyRestaurantCss({ profile: "two-column", restaurant: ".paper-restaurant" })}
    `,
  }),
  volume: freezePresentation({
    id: "volume",
    state: {
      selector: "#volume-stack",
      attribute: "data-mode",
      fallback: "overview",
      map: { overview: "overview", layer: "focus" },
    },
    mutations: [returnMutation("#volume-overview", "← 返回全覽")],
    css: `
      ${compactReturnCss({
        profile: "volume",
        toolbar: ".depth-toolbar",
        returnSelector: "#volume-overview",
      })}
      ${overviewOnlyRestaurantCss({ profile: "volume", restaurant: ".depth-restaurant" })}
    `,
  }),
  projection: freezePresentation({
    id: "projection",
    state: null,
    css: `
      [data-model-live-presentation="projection"] .projection-restaurant {
        display: none !important;
      }
    `,
  }),
  parallax: freezePresentation({
    id: "parallax",
    state: null,
    css: `
      [data-model-live-presentation="parallax"] .parallax-restaurant {
        display: none !important;
      }
    `,
  }),
});

const profileByObjectId = new Map();
const presentationEntries = [];
const assign = (profileId, objectIds) => {
  const presentation = presentations[profileId];
  objectIds.forEach((objectId) => {
    profileByObjectId.set(objectId, presentation);
    presentationEntries.push(Object.freeze({ objectId, profileId: presentation.id }));
  });
};

assign("multiscale", ["06"]);
assign("spread", ["08", "08A"]);
assign("ribbon", ["09", "09A"]);
assign("fisheye", ["10", "10A"]);
assign("matrix", ["11"]);
assign("paper", ["12", "12A", "14", "15", "15A", "16", "16A", "17", "17A"]);
assign("loupe", ["13"]);
assign("landscapeCamera", [
  "18", "18B", "18C", "18D",
  "24", "24A", "24B", "24C",
]);
assign("landscapeContinuous", ["18A"]);
assign("landscapeFocus", ["22", "22A", "22B", "22C", "22D", "22E", "22F", "22G", "23"]);
assign("rigidSheet", ["19"]);
assign("trifold", ["20"]);
assign("twoColumn", ["21"]);
assign("volume", ["25B"]);
assign("projection", ["25P"]);
assign("parallax", ["26", "26A", "26C"]);

export const modelLivePresentationFor = (objectId) =>
  profileByObjectId.get(String(objectId)) ?? null;

export const modelLivePresentationEntries = Object.freeze([...presentationEntries]);
export const modelLivePresentationProfiles = presentations;
