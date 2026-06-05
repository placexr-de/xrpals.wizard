import {attachListenerToControl, formatTime} from "./main.js";
import {store} from "./store.js";
import {initAnchorPreview, initLiveBlock, renderAnchorPreview, updateLiveAgentPosition} from "./previewScene.js";
import {connectWebSocket} from "./wsbridge.js";

const uploadScreen = document.getElementById("uploadScreen");
const reviewScreen = document.getElementById("reviewScreen");

const anchorsTableBody = document.getElementById("anchorsTableBody");
const summaryAnchorCount = document.getElementById("summaryAnchorCount");
const summarySourceFile = document.getElementById("summarySourceFile");
const summaryReceivedAt = document.getElementById("summaryReceivedAt");

const btnConnectAgentURI = document.getElementById("btnConnectAgentURI");
const radioUriInput = document.getElementById("radioUri");
const syncTimeoutInput = document.getElementById("syncTimeout");

const agentCommandPreview = document.getElementById("agentCommandPreview");
const copyAgentCommandBtn = document.getElementById("copyAgentCommandBtn");

const syncIndicator = document.getElementById("syncIndicator");
const syncStatusText = document.getElementById("syncStatusText");
const syncDetails = document.getElementById("syncDetails");
export const confirmSyncBtn = document.getElementById("confirmSyncBtn");
export const reviewBackBtn = document.getElementById("reviewBackBtn");

const reviewState = {
    anchors: [],
    uploadEvent: null,
    currentJobId: null
};

export function renderAnchorsTable(anchors) {
    if (anchors === undefined) {
        return;
    }
    const tbody = document.getElementById("anchorsTableBody");
    if (tbody === null) {
        return;
    }
    tbody.innerHTML = "";

    if (summaryAnchorCount !== null) {
        summaryAnchorCount.innerHTML = Object.entries(anchors).length
    }

    Object.entries(anchors).forEach(([id, pos]) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${id}</td>
            <td>
                <input
                    id="anchor_${id}_x"
                    class="anchor-input"
                    type="number"
                    step="0.01"
                    value="${pos.x}"
                />
            </td>
            <td>
                <input
                    id="anchor_${id}_y"
                    class="anchor-input"
                    type="number"
                    step="0.01"
                    value="${pos.y}"
                />
            </td>
            <td>
                <input
                    id="anchor_${id}_z"
                    class="anchor-input"
                    type="number"
                    step="0.01"
                    value="${pos.z}"
                />
            </td>
        `;

        tbody.appendChild(tr);

        const inputX = tr.querySelector(`#anchor_${id}_x`);
        const inputY = tr.querySelector(`#anchor_${id}_y`);
        const inputZ = tr.querySelector(`#anchor_${id}_z`);

        attachListenerToControl(
            store,
            inputX,
            "input",
            ["anchors", String(id), "x"],
            (v) => Number.isFinite(v) ? v : 0,
            false
        );

        attachListenerToControl(
            store,
            inputY,
            "input",
            ["anchors", String(id), "y"],
            (v) => Number.isFinite(v) ? v : 0,
            false
        );

        attachListenerToControl(
            store,
            inputZ,
            "input",
            ["anchors", String(id), "z"],
            (v) => Number.isFinite(v) ? v : 0,
            false
        );
    });
}

/**
 *
 * @param type idle | running | success | error
 * @param text
 * @param details
 */
export function setSyncState(type, text, details = "") {
    syncIndicator.className = `sync-indicator ${type}`;
    syncStatusText.textContent = text;
    syncDetails.textContent = details;
}

export function setSyncRunning(jobId) {
    if (confirmSyncBtn !== null) {
        confirmSyncBtn.disabled = true;
    }

    if (reviewBackBtn !== null) {
        reviewBackBtn.disabled = true;
    }

    setSyncState(
        "running",
        "Synchronization running",
        `Job ${jobId} submitted.\nWaiting for update ...`
    );
}

export function setSyncSuccess(job) {
    if (confirmSyncBtn !== null) {
        confirmSyncBtn.disabled = false;
    }

    if (reviewBackBtn !== null) {
        reviewBackBtn.disabled = false;
    }

    setSyncState(
        "success",
        "Synchronization complete",
        `Job ${job.jobId} completed successfully.\nExit code: ${job.exitCode ?? 0}`
    );
}

export function setSyncError(job) {
    if (confirmSyncBtn !== null) {
        confirmSyncBtn.disabled = false;
    }

    if (reviewBackBtn !== null) {
        reviewBackBtn.disabled = false;
    }

    const errors = Array.isArray(job.errors) ? job.errors.join("\n") : "";
    setSyncState(
        "error",
        "Synchronization failed",
        `Job ${job.jobId} failed.\nStatus: ${job.status}\nExit code: ${job.exitCode ?? "-"}\n${errors}`
    );
}

export function resetSyncPanel() {
    if (confirmSyncBtn !== null) {
        confirmSyncBtn.disabled = false;
    }

    if (reviewBackBtn !== null) {
        reviewBackBtn.disabled = false;
    }
    setSyncState("idle", "Ready to sync", "No job started yet.");
}

export function buildLpsSyncJobRequest(store) {
    const state = store.getState();

    const uri = document.getElementById("radioUri").value.trim();
    const timeoutMs = Number(document.getElementById("syncTimeout").value || 60000);

    const tmpFile = state.upload?.tmpFile;
    console.log("state.upload", state.upload)
    console.log("tmpFile", tmpFile)
    if (!tmpFile) {
        throw new Error("There was no YAML file uploaded with the anchor positions.");
    }
    const file = tmpFile.split("/").pop();

    const anchors = state.anchors ?? {};
    const anchorCount = Object.keys(anchors).length;

    if (anchorCount === 0) {
        throw new Error("No anchor positions available.");
    }

    if (!uri) {
        throw new Error("Radio URI must not be empty.");
    }

    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error("Timeout must be a positive number.");
    }

    return {
        file,
        uri,
        timeoutMs,
        anchors
    };
}

export async function submitLpsSyncJob(store) {
    const payload = buildLpsSyncJobRequest(store);
    console.log("payload", payload)

    const res = await fetch("/api/lps/anchors", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        let msg = `Job submit failed: HTTP ${res.status}`
        if (res.status === 500) {
            msg += ". Backend not reachable."
        }
        throw new Error(msg);
    }

    // data is LpsSyncJobAck
    const data = await res.json();
    
    store.setState(state => ({
        ...state,
        job: {
            ...state.job,
            currentId: data.jobId,
            ack: data,
            result: null
        }
    }));

    return data;
}

export function buildSyncDetails(payload) {
    if (!payload) return "No payload received.";

    return [
        `Status: ${payload.status ?? "-"}`,
        `Exit Code: ${payload.exitCode ?? "-"}`,
        `message: ${payload.message ?? "-"}`,
        `Output: ${payload.output ?? "-"}`,
        `Errors: ${payload.errors ?? "-"}`,
    ].join("\n");
}


function buildAgentStartupCommand() {
    const uri = (radioUriInput?.value || "").trim();
    return `./cfpyctrl.sh --uri ${uri} --wsendpoint --wsport 8765`;
}

function updateAgentCommandPreview() {
    if (!agentCommandPreview) return;
    agentCommandPreview.value = buildAgentStartupCommand();
}

document.addEventListener("DOMContentLoaded", () => {
    renderAnchorsTable(store.getState().anchors);
    initAnchorPreview(store);
    renderAnchorPreview(store.getState().anchors);

    const anchorCount = Object.keys(store.getState().anchors ?? {}).length;
    if (store.getState().anchors !== null && store.getState().anchors !== undefined && anchorCount > 0) {
        resetSyncPanel();
    }

    if (reviewBackBtn !== null) {
        reviewBackBtn?.addEventListener("click", () => {
            resetSyncPanel()
            store.setState(state => ({
                ...state,
                job: {
                    ...state.job,
                    currentId: null,
                    ack: null,
                    result: null,
                }
            }));
            window.location = 'scanning.html'
        });
    }

    if (confirmSyncBtn !== null) {
        confirmSyncBtn?.addEventListener("click", async () => {
            try {
                const ack = await submitLpsSyncJob(store);
                if (ack === undefined || ack === null) {
                    setSyncState("error", "Failed to submit job", "There is no response with the backend.");
                    return;
                }
                store.setState(state => ({
                    ...state,
                    job: {
                        ...state.job,
                        currentId: ack.jobId,
                    }
                }));
                setSyncRunning(ack.jobId);
            } catch (err) {
                setSyncState("error", "Failed to submit sync job", err.message);
            }
        });
    }

    radioUriInput?.addEventListener("input", updateAgentCommandPreview);
    updateAgentCommandPreview()

    copyAgentCommandBtn?.addEventListener("click", async () => {
        const cmd = buildAgentStartupCommand();

        try {
            await navigator.clipboard.writeText(cmd);
            copyAgentCommandBtn.textContent = "Copied";
            setTimeout(() => {
                copyAgentCommandBtn.textContent = "Copy";
            }, 1200);
        } catch {
            agentCommandPreview?.select();
            document.execCommand("copy");
            copyAgentCommandBtn.textContent = "Copied";
            setTimeout(() => {
                copyAgentCommandBtn.textContent = "Copy";
            }, 1200);
        }
    });

    if (btnConnectAgentURI !== null) {
        btnConnectAgentURI.addEventListener("click", () => {
            const url = "ws://localhost:8765/"

            // console.log(`Attempting to reconnect WebSocket: ${url}`);
            // console.log("store.getState()", store.getState())

            initLiveBlock(store.getState())

            connectWebSocket(
                url,
                updateLiveAgentPosition,
                0,
                store.getState()
            );
        });
    }
});
