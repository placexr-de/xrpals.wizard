import {formatTime} from "./main.js";
import {store} from "./store.js";
import {initWebSocketClient} from "./wsbridge.js";
import {setSyncState} from "./review.js";

const nextButton = document.getElementById("nextButton");
const cancelBtn = document.getElementById("cancelBtn");

const yamlFile = document.getElementById("yamlFile");
const fileName = document.getElementById("fileName");
const uploadBtn = document.getElementById("uploadBtn");
const uploadForm = document.getElementById("uploadForm");

const commandPreview = document.getElementById("commandPreview");
const copyCommandBtn = document.getElementById("copyCommandBtn");

export function buildUploadDetails(payload) {
    if (!payload) return "No payload received.";

    const anchorCount = Object.keys(payload.msg?.anchors ?? {}).length;

    return [
        `Status: ${payload.status ?? "-"}`,
        `Received: ${formatTime(payload.receivedAt)}`,
        `File size: ${payload.fileSize ?? 0} bytes`,
        `Converted file: ${payload.convertedFile ?? "-"}`,
        `Anchors: ${anchorCount}`,
        `Output: ${payload.output ?? "-"}`,
    ].join("\n");
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.message || `Upload failed: HTTP ${res.status}`);
    }

    const anchorsObj = data.msg?.anchors ?? {};
    const convertedFile = data.convertedFile ?? null;

    store.setState(state => ({
        ...state,
        anchors: anchorsObj,
        upload: {
            ...state.upload,
            tmpFile: convertedFile
        }
    }));
    return data;
}

function showIntroScreen() {
    window.location.href = 'start.html';
    store.reset();
}

document.addEventListener("DOMContentLoaded", () => {

    initWebSocketClient(store)
    if (commandPreview !== null) {
        commandPreview.value =
            `0: {x: 0, y: 0, z: 0}
1: {x: 0, y: 0, z: 0}
2: {x: 0, y: 0, z: 0}
3: {x: 0, y: 0, z: 0}
4: {x: 0, y: 0, z: 0}
5: {x: 0, y: 0, z: 0}
6: {x: 0, y: 0, z: 0}
7: {x: 0, y: 0, z: 0}`;
    }

    copyCommandBtn?.addEventListener("click", async () => {
        if (commandPreview === null) { return; }
        try {
            await navigator.clipboard.writeText(commandPreview.value);
            copyCommandBtn.textContent = "Copied";
            setTimeout(() => {
                copyCommandBtn.textContent = "Copy";
            }, 1200);
        } catch {
            commandPreview?.select();
            document.execCommand("copy");
            copyCommandBtn.textContent = "Copied";
            setTimeout(() => {
                copyCommandBtn.textContent = "Copy";
            }, 1200);
        }
    });

    cancelBtn?.addEventListener("click", () => {
        // later: call backend "cancel session"
        showIntroScreen();
    });
    nextButton?.addEventListener("click", () => {
        window.location = 'review.html'
    });

    yamlFile?.addEventListener("change", () => {
        const file = yamlFile.files?.[0];
        fileName.textContent = file ? file.name : "No file selected";
        uploadBtn.disabled = !file;
    });

    uploadForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const file = yamlFile.files?.[0];
        if (!file) return;

        uploadBtn.disabled = true;
        uploadBtn.textContent = "Uploading…";

        try {
            const payload = await uploadFile(file);
            const details = buildUploadDetails(payload);
            setSyncState("success", "Data received", details);
        } catch (err) {
            setSyncState("error", "Upload failed", err.message);
        } finally {
            uploadBtn.textContent = "Upload";
            uploadBtn.disabled = !yamlFile.files?.[0];
        }
    });
});