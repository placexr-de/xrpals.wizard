import SockJS from "sockjs-client";
import {Client} from "@stomp/stompjs";
import {buildUploadDetails} from "./scanning.js";
import {setSyncState} from "./review.js";

const sockets = {};

export function initWebSocketClient(store) {
    const socket = new SockJS("http://localhost:8080/ws");
    const client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 2000,

        onConnect: () => {
            console.log("Connected");

            client.subscribe("/topic/upload", (msg) => {
                const data = JSON.parse(msg.body);
                console.log("Upload event:", data);
                const details = buildUploadDetails(data);

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

                if(convertedFile !== null) {
                    setSyncState("success", "Data received", details);
                } else {
                    setSyncState("error", "Data not received", details);
                }
            });

            client.subscribe("/topic/lps/jobs", (msg) => {
                const job = JSON.parse(msg.body);
                store.setState(s => ({
                    ...s,
                    job: {
                        ...s.job,
                        result: job
                    }
                }));
            });
        }
    });

    client.activate();

}

export function connectWebSocket(address = "ws://localhost:8765/", onUpdateAgent, liveBlockIndex, state, options = { alpha: 0.4 }) {
    const existing = sockets[liveBlockIndex];
    if (existing && existing.readyState !== WebSocket.CLOSED) {
        console.log(`WebSocket for block ${liveBlockIndex} is already connected or connecting.`);
        return existing;
    }

    const socket = new WebSocket(address);
    sockets[liveBlockIndex] = socket;

    socket.addEventListener("open", () => {
        console.log(`WebSocket [${liveBlockIndex}] connection established.`);
    });

    socket.addEventListener("close", () => {
        console.warn(`WebSocket [${liveBlockIndex}] connection closed.`);
        delete sockets[liveBlockIndex];
    });

    socket.addEventListener("error", (e) => {
        console.error(`WebSocket [${liveBlockIndex}] error:`, e);
    });

    socket.addEventListener("message", (event) => {
        try {
            const data = JSON.parse(event.data);
            // console.log(data)
            if (data.value) {
                const valueArray = JSON.parse(data.value);
                if (Array.isArray(valueArray) && valueArray.length === 3) {
                    onUpdateAgent(valueArray, liveBlockIndex, state, options);
                }
            }
        } catch (err) {
            console.warn(`Invalid WebSocket data for [${liveBlockIndex}]:`, event.data);
        }
    });

    return socket;
}

export function disconnectAllWebSockets() {
    for (const [index, socket] of Object.entries(sockets)) {
        console.log(`Closing WebSocket [${index}]`);
        socket.close();
        delete sockets[index];
    }
}