import mqtt from "mqtt";

/**
 * Normalize an address entered as either "ws://host:port", "wss://host:port",
 * or just "host:port". The port must expose MQTT over WebSockets.
 */
export function normalizeMqttWebSocketUrl(value) {
    const input = String(value ?? "").trim();
    if (!input) {
        throw new Error("Enter the MQTT broker WebSocket address.");
    }

    let urlText = input;
    if (/^https:\/\//i.test(urlText)) {
        urlText = urlText.replace(/^https:/i, "wss:");
    } else if (/^http:\/\//i.test(urlText)) {
        urlText = urlText.replace(/^http:/i, "ws:");
    } else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(urlText)) {
        urlText = `ws://${urlText}`;
    }

    let parsed;
    try {
        parsed = new URL(urlText);
    } catch {
        throw new Error("Invalid broker address. Use ws://host:port or wss://host:port.");
    }

    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
        throw new Error("A browser MQTT client requires a WebSocket URL beginning with ws:// or wss://.");
    }

    if (window.location.protocol === "https:" && parsed.protocol === "ws:") {
        throw new Error("This page uses HTTPS, so the broker must use secure WebSockets (wss://).");
    }

    return parsed.toString();
}

function decodePayload(payload) {
    if (typeof payload === "string") return payload;
    if (payload instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(payload));
    if (ArrayBuffer.isView(payload)) {
        return new TextDecoder().decode(new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength));
    }
    return String(payload ?? "");
}

function finiteNumber(value, fieldName) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        throw new Error(`The MQTT message has a missing or invalid ${fieldName} value.`);
    }
    return number;
}

function parseHeadPose(rawText) {
    let message;
    try {
        message = JSON.parse(rawText);
    } catch {
        throw new Error("The MQTT payload is not valid JSON.");
    }

    if (!message || typeof message !== "object" || !message.position || typeof message.position !== "object") {
        throw new Error("Expected a JSON object containing position {x, y, z}.");
    }

    const position = {
        x: finiteNumber(message.position.x, "position.x"),
        y: finiteNumber(message.position.y, "position.y"),
        z: finiteNumber(message.position.z, "position.z")
    };

    let rotation = {x: 0, y: 0, z: 0, w: 1};
    if (message.rotation !== undefined && message.rotation !== null) {
        if (typeof message.rotation !== "object") {
            throw new Error("The MQTT message rotation must be a quaternion object.");
        }
        rotation = {
            x: finiteNumber(message.rotation.x, "rotation.x"),
            y: finiteNumber(message.rotation.y, "rotation.y"),
            z: finiteNumber(message.rotation.z, "rotation.z"),
            w: finiteNumber(message.rotation.w, "rotation.w")
        };
    }

    const rawTimestamp = message.timestamp;
    const timestamp = rawTimestamp === undefined || rawTimestamp === null
        ? Date.now()
        : finiteNumber(rawTimestamp, "timestamp");

    return {timestamp, position, rotation, raw: message};
}

/**
 * Browser MQTT bridge for XR pose messages.
 * MQTT.js in a browser supports MQTT over WebSockets (ws/wss), not raw MQTT/TCP.
 */
export function createMqttPoseBridge({onStatus = () => {}, onPose = () => {}, onInvalidMessage = () => {}} = {}) {
    let client = null;
    let generation = 0;

    function disconnect({notify = true} = {}) {
        generation += 1;
        const existing = client;
        client = null;

        if (existing) {
            try {
                existing.end(true);
            } catch (error) {
                console.warn("Error while closing MQTT connection:", error);
            }
        }

        if (notify) {
            onStatus({
                state: "disconnected",
                label: "Disconnected",
                detail: "MQTT connection closed."
            });
        }
    }

    function connect({brokerUrl, topic, username = "", password = ""}) {
        disconnect({notify: false});

        const url = normalizeMqttWebSocketUrl(brokerUrl);
        const topicName = String(topic ?? "").trim();
        if (!topicName) {
            throw new Error("Enter the MQTT topic to subscribe to.");
        }

        const connectionGeneration = ++generation;
        onStatus({
            state: "connecting",
            label: "Connecting",
            detail: `Connecting to ${url} ...`
        });

        const options = {
            clientId: `xrpals-review-${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            connectTimeout: 10000,
            reconnectPeriod: 2000,
            keepalive: 30
        };
        if (String(username).trim()) options.username = String(username).trim();
        if (String(password)) options.password = String(password);

        const activeClient = mqtt.connect(url, options);
        client = activeClient;

        activeClient.on("connect", () => {
            if (connectionGeneration !== generation) return;

            onStatus({
                state: "subscribing",
                label: "Subscribing",
                detail: `Broker connected; subscribing to ${topicName} ...`
            });

            activeClient.subscribe(topicName, {qos: 0}, (error) => {
                if (connectionGeneration !== generation) return;
                if (error) {
                    onStatus({
                        state: "error",
                        label: "Subscription failed",
                        detail: `Could not subscribe to ${topicName}: ${error.message || error}`
                    });
                    return;
                }

                onStatus({
                    state: "connected",
                    label: "Connected",
                    detail: `Subscribed to ${topicName} at ${url}. Waiting for a pose message.`
                });
            });
        });

        activeClient.on("message", (receivedTopic, payload) => {
            if (connectionGeneration !== generation) return;

            let rawText = "";
            try {
                rawText = decodePayload(payload);
                const pose = parseHeadPose(rawText);
                onPose(pose, {topic: receivedTopic, brokerUrl: url, rawText});
            } catch (error) {
                onInvalidMessage(error, {topic: receivedTopic, brokerUrl: url, rawText});
            }
        });

        activeClient.on("reconnect", () => {
            if (connectionGeneration !== generation) return;
            onStatus({
                state: "reconnecting",
                label: "Reconnecting",
                detail: `Connection interrupted. Retrying ${url} ...`
            });
        });

        activeClient.on("offline", () => {
            if (connectionGeneration !== generation) return;
            onStatus({
                state: "reconnecting",
                label: "Offline",
                detail: "The broker connection is offline; the client will retry automatically."
            });
        });

        activeClient.on("close", () => {
            if (connectionGeneration !== generation) return;
            onStatus({
                state: "reconnecting",
                label: "Connection lost",
                detail: "The socket closed. Waiting for MQTT.js to reconnect ..."
            });
        });

        activeClient.on("error", (error) => {
            if (connectionGeneration !== generation) return;
            onStatus({
                state: "error",
                label: "Connection error",
                detail: error?.message || "The browser could not connect to the broker. Verify the WebSocket URL and broker configuration."
            });
        });

        return {url, topic: topicName};
    }

    return {
        connect,
        disconnect,
        isActive: () => client !== null
    };
}
