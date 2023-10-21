import { WebSocket } from "./Websocket";
import { default as convert } from "pcm-convert";
import { AudioProcessor } from "../../../shared/audioProcessor";
import { ActiveDevice, RtAudioDeviceInf, AudioUpdate } from "../../../shared/interfaces";
//@ts-ignore
import { RtAudioDeviceInfo } from "audify";
import { userClients } from "../../../shared/constants";
import { ClientMessagesRaw, ServerMessagesRaw } from "../../../shared/Messages";
import { BinaryBuffer } from "../../../shared/messages/BinaryBuffer";

export function setupCommunicationToAudioServer(websocket: WebSocket, audioProcessor: AudioProcessor) {
    websocket.onPromise(ServerMessagesRaw.AudioIsServerConnected, async (_, client) => {
        client.validateAuthentication();
        return new BinaryBuffer(1).setBool(!!websocket.getAudioServer()).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioGetDevices, async (_, client) => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        const result = (
            await audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioGetDevices)
        ).getBuffer();
        return result;
    });
    websocket.on(ServerMessagesRaw.AudioPcm, (pcm, client) => {
        if (client.clientType !== "audio-server") {
            Logger.error("non server is sending pcm");
            return;
        }
        const arrayBuffer = convert(pcm, "arraybuffer stereo") as ArrayBuffer;
        const intArray = new Int16Array(arrayBuffer);

        const clients = websocket.getAllClients();
        for (const client of clients) {
            if (userClients.includes(client.clientType) && client.sendPCM) {
                client.serverMessageHandler.send(ClientMessagesRaw.PCM, new Uint8Array(intArray));
            }
        }
        audioProcessor.pipe(intArray);
    });

    websocket.onPromise(ServerMessagesRaw.AudioPcmReport, async (value, client) => {
        client.validateAuthentication();
        client.sendPCM = !!value;
        return new BinaryBuffer(1).setBool(client.sendPCM).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioActiveDevice, async (_, client) => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        return (await audioServer.serverMessageHandler.sendPromise(ServerMessagesRaw.AudioActiveDevice)).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioAllDevices, async (_, client) => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        return (await audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioAllDevices)).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioSettingsUpdate, async (device, client) => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        return (
            await audioServer.serverMessageHandler.sendPromise(
                ClientMessagesRaw.AudioSettingsUpdate,
                device.getBuffer(),
            )
        ).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioApis, async (_, client) => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }

        return (await audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioApis)).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioIsInternalAudioProcessing, async (_, client) => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }

        return (
            await audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioIsInternalAudioProcessing)
        ).getBuffer();
    });
}
