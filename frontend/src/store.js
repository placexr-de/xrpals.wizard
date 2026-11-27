import {renderAnchorPreview} from "./previewScene.js";
import {
    buildSyncDetails,
    confirmSyncBtn,
    renderAnchorsTable,
    reviewBackBtn,
    setSyncState
} from "./review.js";

const STORAGE_KEY = "xr-pals-wizard-state";

export const initialState = {
    anchors: {
        0: {x: 0.0, y: 0.0, z: 0.0}
    },
    upload: {
        tmpFile: "_default.yaml"
    },
    scene: {
        blockWorld: null,
        liveBlock: [],
        liveBlockLabels: []
    },
    job: {
        currentId: null,
        ack: null,
        result: null
    }
};

export const store = createStore(initialState);

let lastRenderedAnchors = store.getState().anchors;
store.subscribe((state) => {
    if (state.anchors !== lastRenderedAnchors) {
        lastRenderedAnchors = state.anchors;
        renderAnchorsTable(state.anchors ?? {});
        renderAnchorPreview(state.anchors ?? {});
    }
});

store.subscribe((state) => {
    const job = state.job;
    if (!job) return;

    if (job.result === null && job.ack !== null) {
        if (confirmSyncBtn) confirmSyncBtn.disabled = true;
        if (reviewBackBtn) reviewBackBtn.disabled = true;
        setSyncState("running", "Synchronization running", `Job ${job.currentId ?? job.ack?.jobId ?? "-"} accepted. Waiting for updates ...`);
        return;
    }

    if (job.result?.status === "RUNNING" || job.result?.status === "QUEUED") {
        if (confirmSyncBtn) confirmSyncBtn.disabled = true;
        if (reviewBackBtn) reviewBackBtn.disabled = true;
        setSyncState("running", "Synchronization running", buildSyncDetails(job.result));
        return;
    }

    if (job.result?.status === "SUCCESS") {
        setSyncState("success", "Synchronization complete", buildSyncDetails(job.result));
    } else if (["FAILED", "EXCEPTION", "TIMEOUT"].includes(job.result?.status)) {
        setSyncState("error", "Synchronization failed", buildSyncDetails(job.result));
    }

    if (confirmSyncBtn) confirmSyncBtn.disabled = false;
    if (reviewBackBtn) reviewBackBtn.disabled = false;
});

export function createStore(defaultState) {
    const loaded = loadState();
    let state = loaded ? mergeState(defaultState, loaded) : structuredClone(defaultState);
    const listeners = new Set();

    function mergeState(base, saved) {
        return {
            ...structuredClone(base),
            ...saved,
            anchors: saved.anchors ?? structuredClone(base.anchors),
            upload: {...base.upload, ...(saved.upload ?? {})},
            scene: {...base.scene, ...(saved.scene ?? {}), blockWorld: null, liveBlock: [], liveBlockLabels: []},
            job: {...base.job, ...(saved.job ?? {})}
        };
    }

    function loadState() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn("Could not load wizard state from sessionStorage:", error);
            return null;
        }
    }

    function createPersistenceSnapshot(currentState) {
        const scene = currentState.scene ?? {};
        return {
            ...currentState,
            scene: {
                ...scene,
                blockWorld: null,
                liveBlock: [],
                liveBlockLabels: []
            }
        };
    }

    function saveState() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(createPersistenceSnapshot(state)));
        } catch (error) {
            console.warn("Could not persist wizard state:", error);
        }
    }

    function notifyListeners() {
        for (const listener of listeners) listener(state);
    }

    return {
        getState: () => state,

        setState: (patch) => {
            const next = typeof patch === "function" ? patch(state) : {...state, ...patch};
            state = next;
            saveState();
            notifyListeners();
        },

        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        reset: () => {
            state = structuredClone(defaultState);
            saveState();
            notifyListeners();
        }
    };
}