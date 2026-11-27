import {formatTime} from "./main.js";
import {store} from "./store.js";
import {
    initAnchorPreview,
    initLiveBlock,
    renderAnchorPreview,
    setXrHeadPose,
    setXrHeadPoseVisible,
    updateLiveAgentPosition
} from "./previewScene.js";
import {connectWebSocket} from "./wsbridge.js";
import {createMqttPoseBridge} from "./mqttBridge.js";

const anchorsTableBody = document.getElementById("anchorsTableBody");
const summaryAnchorCount = document.getElementById("summaryAnchorCount");

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

const mqttBrokerUrlInput = document.getElementById("mqttBrokerUrl");
const mqttTopicInput = document.getElementById("mqttTopic");
const mqttUsernameInput = document.getElementById("mqttUsername");
const mqttPasswordInput = document.getElementById("mqttPassword");
const mqttConnectBtn = document.getElementById("mqttConnectBtn");
const mqttDisconnectBtn = document.getElementById("mqttDisconnectBtn");
const mqttConnectionBadge = document.getElementById("mqttConnectionBadge");
const mqttConnectionStatus = document.getElementById("mqttConnectionStatus");
const mqttConnectionMessage = document.getElementById("mqttConnectionMessage");
const mqttPoseMessageStatus = document.getElementById("mqttPoseMessageStatus");
const mqttPositionX = document.getElementById("mqttPositionX");
const mqttPositionY = document.getElementById("mqttPositionY");
const mqttPositionZ = document.getElementById("mqttPositionZ");
const mqttPoseTimestamp = document.getElementById("mqttPoseTimestamp");
const mqttMessageCount = document.getElementById("mqttMessageCount");
const mqttRotationValue = document.getElementById("mqttRotationValue");
const mqttRawPayload = document.getElementById("mqttRawPayload");

let mqttBridge = null;
let poseMessageCount = 0;

function createAnchorInput(id, axis, value) {
    const input = document.createElement("input");
    input.id = `anchor_${id}_${axis}`;
    input.className = "anchor-input";
    input.type = "number";
    input.step = "0.01";
    input.value = Number.isFinite(Number(value)) ? String(value) : "0";
    input.setAttribute("aria-label", `Anchor ${id}, ${axis.toUpperCase()} coordinate in metres`);

    input.addEventListener("input", () => {
        const nextValue = input.valueAsNumber;
        // Do not commit incomplete values such as an empty string or a lone minus sign.
        if (!Number.isFinite(nextValue)) return;

        store.setState(state => ({
            ...state,
            anchors: {
                ...(state.anchors ?? {}),
                [String(id)]: {
                    ...(state.anchors?.[String(id)] ?? {}),
                    [axis]: nextValue
                }
            }
        }));
    });

    input.addEventListener("change", () => {
        const currentValue = store.getState().anchors?.[String(id)]?.[axis];
        input.value = Number.isFinite(Number(currentValue)) ? String(currentValue) : "0";
    });

    return input;
}

export function renderAnchorsTable(anchors) {
    if (!anchorsTableBody || anchors === undefined || anchors === null) return;

    const entries = Object.entries(anchors).sort((a, b) => Number(a[0]) - Number(b[0]));
    if (summaryAnchorCount) summaryAnchorCount.textContent = String(entries.length);

    const existingRows = [...anchorsTableBody.querySelectorAll("tr")];
    const sameRows = existingRows.length === entries.length && entries.every(([id], index) => {
        return existingRows[index]?.dataset.anchorId === String(id);
    });

    if (!sameRows) {
        anchorsTableBody.replaceChildren();

        for (const [id, position] of entries) {
            const row = document.createElement("tr");
            row.dataset.anchorId = String(id);

            const idCell = document.createElement("td");
            idCell.textContent = String(id);
            row.appendChild(idCell);

            for (const axis of ["x", "y", "z"]) {
                const cell = document.createElement("td");
                cell.appendChild(createAnchorInput(id, axis, position?.[axis]));
                row.appendChild(cell);
            }
            anchorsTableBody.appendChild(row);
        }
        return;
    }

    for (const [id, position] of entries) {
        for (const axis of ["x", "y", "z"]) {
            const input = document.getElementById(`anchor_${id}_${axis}`);
            if (!input || input === document.activeElement) continue;
            const nextValue = Number(position?.[axis]);
            if (Number.isFinite(nextValue) && Number(input.value) !== nextValue) {
                input.value = String(position[axis]);
            }
        }
    }
}

/** @param {"idle"|"running"|"success"|"error"} type */
export function setSyncState(type, text, details = "") {
    if (syncIndicator) syncIndicator.className = `sync-indicator ${type}`;
    if (syncStatusText) syncStatusText.textContent = text;
    if (syncDetails) syncDetails.textContent = details;
}

export function setSyncRunning(jobId) {
    if (confirmSyncBtn) confirmSyncBtn.disabled = true;
    if (reviewBackBtn) reviewBackBtn.disabled = true;
    setSyncState("running", "Synchronization running", `Job ${jobId} submitted.\nWaiting for update ...`);
}

export function setSyncSuccess(job) {
    if (confirmSyncBtn) confirmSyncBtn.disabled = false;
    if (reviewBackBtn) reviewBackBtn.disabled = false;
    setSyncState(
        "success",
        "Synchronization complete",
        `Job ${job?.jobId ?? "-"} completed successfully.\nExit code: ${job?.exitCode ?? 0}`
    );
}

export function setSyncError(job) {
    if (confirmSyncBtn) confirmSyncBtn.disabled = false;
    if (reviewBackBtn) reviewBackBtn.disabled = false;
    const errors = Array.isArray(job?.errors) ? job.errors.join("\n") : String(job?.errors ?? "");
    setSyncState(
        "error",
        "Synchronization failed",
        `Job ${job?.jobId ?? "-"} failed.\nStatus: ${job?.status ?? "-"}\nExit code: ${job?.exitCode ?? "-"}\n${errors}`
    );
}

export function resetSyncPanel() {
    if (confirmSyncBtn) confirmSyncBtn.disabled = false;
    if (reviewBackBtn) reviewBackBtn.disabled = false;
    setSyncState("idle", "Ready to sync", "No job started yet.");
}

export function buildLpsSyncJobRequest(activeStore) {
    const state = activeStore.getState();
    const uri = radioUriInput?.value.trim() ?? "";
    const timeoutMs = Number(syncTimeoutInput?.value || 60000);
    const tmpFile = state.upload?.tmpFile;

    if (!tmpFile) {
        throw new Error("There was no YAML file uploaded with the anchor positions.");
    }

    const file = String(tmpFile).split(/[\\/]/).pop();
    const anchors = state.anchors ?? {};
    if (Object.keys(anchors).length === 0) {
        throw new Error("No anchor positions available.");
    }
    if (!uri) throw new Error("Crazyflie URI must not be empty.");
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error("Timeout must be a positive number.");
    }

    return {file, uri, timeoutMs, anchors};
}

export async function submitLpsSyncJob(activeStore) {
    const payload = buildLpsSyncJobRequest(activeStore);
    const response = await fetch("/api/lps/anchors", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let message = `Job submission failed: HTTP ${response.status}`;
        try {
            const body = await response.json();
            if (body?.message) message += ` — ${body.message}`;
        } catch {
            // The server may not return JSON on errors.
        }
        throw new Error(message);
    }

    const acknowledgement = await response.json();
    activeStore.setState(state => ({
        ...state,
        job: {
            ...state.job,
            currentId: acknowledgement.jobId,
            ack: acknowledgement,
            result: null
        }
    }));
    return acknowledgement;
}

export function buildSyncDetails(payload) {
    if (!payload) return "No job result received.";
    const asText = value => Array.isArray(value) ? (value.length ? value.join("\n") : "-") : String(value ?? "-");
    return [
        `Job: ${payload.jobId ?? "-"}`,
        `Status: ${payload.status ?? "-"}`,
        `Exit code: ${payload.exitCode ?? "-"}`,
        `Message: ${payload.message ?? "-"}`,
        `Output:\n${asText(payload.output)}`,
        `Errors:\n${asText(payload.errors)}`
    ].join("\n\n");
}

function buildAgentStartupCommand() {
    const uri = (radioUriInput?.value || "").trim();
    return `./cfpyctrl.sh --uri ${uri} --wsendpoint --wsport 8765`;
}

function updateAgentCommandPreview() {
    if (agentCommandPreview) agentCommandPreview.value = buildAgentStartupCommand();
}

function updateMqttConnectionUi({state, label, detail}) {
    if (mqttConnectionBadge) mqttConnectionBadge.className = `mqtt-status-badge ${state}`;
    if (mqttConnectionStatus) mqttConnectionStatus.textContent = label ?? state;
    if (mqttConnectionMessage && detail) mqttConnectionMessage.textContent = detail;

    const busy = ["connecting", "subscribing", "connected", "reconnecting"].includes(state);
    if (mqttConnectBtn) mqttConnectBtn.disabled = busy;
    if (mqttDisconnectBtn) mqttDisconnectBtn.hidden = state === "disconnected";
    for (const input of [mqttBrokerUrlInput, mqttTopicInput, mqttUsernameInput, mqttPasswordInput]) {
        if (input) input.disabled = busy;
    }

    if (state !== "connected") setXrHeadPoseVisible(false);
}

function renderMqttPose(pose, meta) {
    poseMessageCount += 1;
    setXrHeadPose(pose.position, pose.rotation);

    if (mqttPositionX) mqttPositionX.textContent = pose.position.x.toFixed(4);
    if (mqttPositionY) mqttPositionY.textContent = pose.position.y.toFixed(4);
    if (mqttPositionZ) mqttPositionZ.textContent = pose.position.z.toFixed(4);
    if (mqttPoseTimestamp) mqttPoseTimestamp.textContent = formatTime(pose.timestamp);
    if (mqttMessageCount) mqttMessageCount.textContent = String(poseMessageCount);
    if (mqttRotationValue) {
        const r = pose.rotation;
        mqttRotationValue.textContent = `${r.x.toFixed(4)}, ${r.y.toFixed(4)}, ${r.z.toFixed(4)}, ${r.w.toFixed(4)}`;
    }
    if (mqttRawPayload) mqttRawPayload.textContent = meta.rawText || JSON.stringify(pose.raw, null, 2);
    if (mqttPoseMessageStatus) {
        mqttPoseMessageStatus.textContent = `Receiving ${meta.topic}; latest pose updated at ${formatTime(pose.timestamp)}.`;
    }
}

function initializeMqttPoseControls() {
    if (!mqttConnectBtn || !mqttDisconnectBtn || !mqttBrokerUrlInput || !mqttTopicInput) return;

    mqttBridge = createMqttPoseBridge({
        onStatus: updateMqttConnectionUi,
        onPose: renderMqttPose,
        onInvalidMessage: (error, meta) => {
            if (mqttPoseMessageStatus) mqttPoseMessageStatus.textContent = `Message ignored: ${error.message}`;
            if (mqttRawPayload) mqttRawPayload.textContent = meta.rawText || "(empty payload)";
        }
    });

    mqttConnectBtn.addEventListener("click", () => {
        try {
            mqttBridge.connect({
                brokerUrl: mqttBrokerUrlInput.value,
                topic: mqttTopicInput.value,
                username: mqttUsernameInput?.value ?? "",
                password: mqttPasswordInput?.value ?? ""
            });
            if (mqttPoseMessageStatus) mqttPoseMessageStatus.textContent = "Connected to the broker; waiting for the first valid pose message.";
        } catch (error) {
            updateMqttConnectionUi({
                state: "error",
                label: "Invalid configuration",
                detail: error.message
            });
        }
    });

    mqttDisconnectBtn.addEventListener("click", () => {
        mqttBridge?.disconnect();
        if (mqttPoseMessageStatus) mqttPoseMessageStatus.textContent = "Disconnected.";
    });

    window.addEventListener("beforeunload", () => mqttBridge?.disconnect({notify: false}));
}

document.addEventListener("DOMContentLoaded", () => {
    renderAnchorsTable(store.getState().anchors ?? {});
    initAnchorPreview(store);
    renderAnchorPreview(store.getState().anchors ?? {});

    const anchorCount = Object.keys(store.getState().anchors ?? {}).length;
    if (anchorCount > 0) resetSyncPanel();

    reviewBackBtn?.addEventListener("click", () => {
        resetSyncPanel();
        store.setState(state => ({
            ...state,
            job: {
                ...state.job,
                currentId: null,
                ack: null,
                result: null
            }
        }));
        window.location.href = "scanning.html";
    });

    confirmSyncBtn?.addEventListener("click", async () => {
        try {
            const acknowledgement = await submitLpsSyncJob(store);
            if (!acknowledgement?.jobId) {
                setSyncState("error", "Failed to submit sync job", "The backend returned no job ID.");
                return;
            }
            store.setState(state => ({
                ...state,
                job: {...state.job, currentId: acknowledgement.jobId}
            }));
            setSyncRunning(acknowledgement.jobId);
        } catch (error) {
            setSyncState("error", "Failed to submit sync job", error?.message ?? String(error));
        }
    });

    radioUriInput?.addEventListener("input", updateAgentCommandPreview);
    updateAgentCommandPreview();

    copyAgentCommandBtn?.addEventListener("click", async () => {
        const command = buildAgentStartupCommand();
        try {
            await navigator.clipboard.writeText(command);
        } catch {
            if (agentCommandPreview) {
                agentCommandPreview.select();
                document.execCommand("copy");
            }
        }
        if (copyAgentCommandBtn) {
            copyAgentCommandBtn.textContent = "Copied";
            window.setTimeout(() => { copyAgentCommandBtn.textContent = "Copy"; }, 1200);
        }
    });

    btnConnectAgentURI?.addEventListener("click", () => {
        const url = "ws://localhost:8765/";
        initLiveBlock(store.getState());
        connectWebSocket(url, updateLiveAgentPosition, 0, store.getState());
    });

    initializeMqttPoseControls();
});
