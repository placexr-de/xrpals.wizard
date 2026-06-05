import {renderAnchorPreview} from "./previewScene.js";
import {
    buildSyncDetails, confirmSyncBtn,
    renderAnchorsTable, reviewBackBtn,
    setSyncState,
} from "./review.js";

const STORAGE_KEY = "xr-pals-wizard-state";
export const initialState = {
    anchors: {
        0: {x: 0.0, y: 0.0, z: 0.0}
    },
    upload: {
        tmpFile: "_default.yaml",
    },
    scene: {
        blockWorld: null,
        liveBlock: [],
        liveBlockLabels: [],
    },
    job: {
        currentId: null,
        ack: null,
        result: null
    },
}

export const store = createStore(initialState);
console.log("store", store.getState())

store.subscribe((state) => {
    renderAnchorsTable(state.anchors);
    renderAnchorPreview(state.anchors);
});

store.subscribe((state) => {

    const job = state.job;
    if (job === null) {
        return;
    }

    if (job.result === null && job.ack !== null) {
        setSyncState("running", "Synchronization is running");
        return;
    }

    if (job.result !== null && job.result.status === "SUCCESS") {
        const details = buildSyncDetails(job.result);
        setSyncState("success", "Synchronization complete", details);
    }
    const errorStates = ["FAILED", "EXCEPTION", "TIMEOUT"];
    if (job.result !== null && errorStates.includes(job.result.status)) {
        const details = buildSyncDetails(job.result);
        setSyncState("error", "Synchronization failed", details);
    }

    if(confirmSyncBtn !== null) {
        confirmSyncBtn.disabled = false;
    }
    if(reviewBackBtn!==null) {
        reviewBackBtn.disabled = false;
    }
});

export function createStore(initialState) {
    let state = loadState() ?? structuredClone(initialState);
    const listeners = new Set();

    function saveState() {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadState() {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    return {
        getState: () => state,

        setState: (patch) => {
            const next =
                typeof patch === "function"
                    ? patch(state)
                    : {...state, ...patch};

            state = next;

            saveState();

            for (const fn of listeners) fn(state);
        },

        subscribe: (fn) => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },

        reset: () => {
            state = structuredClone(initialState);
            saveState();
        }
    };
}