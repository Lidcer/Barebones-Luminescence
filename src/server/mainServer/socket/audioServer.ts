import { WebSocket } from "./Websocket";
import { default as convert } from "pcm-convert";
import { AudioProcessor } from "../../../shared/audioProcessor";
import { ActiveDevice, DeviceUpdate, RtAudioDeviceInf } from "../../../shared/interfaces";
//@ts-ignore
import { RtAudioDeviceInfo } from "audify";

export function setupCommunicationToAudioServer(websocket: WebSocket, audioProcessor: AudioProcessor) {
    websocket.onPromise<boolean, []>("is-audio-server-connected", async client => {
        client.validateAuthentication();
        return !!websocket.getAudioServer();
    });
    websocket.onPromise<RtAudioDeviceInfo[], []>("getDevices", async client => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        const result = await audioServer.emitPromise("getDevices");
        return result;
    });
    websocket.on("pcm", (client, pcm: Buffer) => {
        if (client.clientType !== "audio-server") {
            Logger.error("non server is sending pcm");
            return;
        }
        const arrayBuffer = convert(pcm, "arraybuffer stereo") as ArrayBuffer;
        const intArray = new Int16Array(arrayBuffer);

        const clients = websocket.getAllClients();
        for (const client of clients) {
            if (client.clientType === "client" && client.sendPCM) {
                client.emit("pcm", intArray);
            }
        }
        audioProcessor.pipe(intArray);
    });

    websocket.onPromise<boolean, [boolean]>("pcm-report", async (client, value) => {
        client.validateAuthentication();
        client.sendPCM = !!value;
        return client.sendPCM;
    });
    websocket.onPromise<ActiveDevice, []>("active-device", async client => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        const result = await audioServer.emitPromise("active-device");
        return result;
    });
    websocket.onPromise<RtAudioDeviceInf[], []>("all-devices", async client => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        const result = await audioServer.emitPromise("all-devices");
        return result;
    });
    websocket.onPromise<boolean, [DeviceUpdate]>("update-device", async (client, device) => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }

        const result = await audioServer.emitPromise("update-device", device);
        return result;
    });
}
