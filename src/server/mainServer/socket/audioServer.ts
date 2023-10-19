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
    websocket.onPromise<boolean, []>(ServerMessagesRaw.AudioIsAudioServerConnected, async client => {
        client.validateAuthentication();
        return new BinaryBuffer(1).setBool(!!websocket.getAudioServer()).getBuffer();
    });
    websocket.onPromise<RtAudioDeviceInfo[], []>(ServerMessagesRaw.AudioGetDevices, async client => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        const result = await audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioGetDevices);
        return result;
    });
    websocket.on(ServerMessagesRaw.AudioPcm, (client, pcm) => {
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

    websocket.onPromise<boolean, [boolean]>(ServerMessagesRaw.AudioPcmReport, async (client, value) => {
        client.validateAuthentication();
        client.sendPCM = !!value;
        return new BinaryBuffer(1).setBool(client.sendPCM).getBuffer();
    });
    websocket.onPromise<ActiveDevice, []>(ServerMessagesRaw.AudioActiveDevice, async client => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        return audioServer.serverMessageHandler.sendPromise(ServerMessagesRaw.AudioActiveDevice);
    });
    websocket.onPromise<RtAudioDeviceInf[], []>(ServerMessagesRaw.AudioAllDevices, async client => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        return audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioAllDevices);
    
    });
    websocket.onPromise<boolean, [AudioUpdate]>(ServerMessagesRaw.AudioAudioSettingsUpdate, async (client, device) => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }
        return audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioSettingsUpdate, device.getBuffer());
    });
    websocket.onPromise<boolean, [{ [key: string]: number }]>(ServerMessagesRaw.AudioApis, async client => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }

        return audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioApis);
    });
    websocket.onPromise<boolean, []>(ServerMessagesRaw.AudioIsInternalAudioProcessing, async client => {
        client.validateAuthentication();
        const audioServer = websocket.getAudioServer();
        if (!audioServer) {
            throw new Error("Audio server does not exist");
        }

        return audioServer.serverMessageHandler.sendPromise(ClientMessagesRaw.AudioIsInternalAudioProcessing);
    });
}
