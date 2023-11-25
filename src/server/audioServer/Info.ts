import { ActiveDevice } from "../../shared/interfaces";
import { AudioCapture } from "./audioCapture";
import * as os from "os";
import { WebSocket } from "../mainServer/socket/Websocket";
import { BinaryBuffer, utf8StringLen } from "../../shared/messages/BinaryBuffer";
import { ServerMessagesRaw } from "../../shared/Messages";

export function setupInfo(websocket: WebSocket, audioCapture: AudioCapture) {
    websocket.onPromise(ServerMessagesRaw.AudioActiveDevice, async () => {
        const result: ActiveDevice = {
            computerName: `${os.userInfo().username} (${os.hostname()})`,
            device: audioCapture.activeDevice,
            frameSize: audioCapture.activeFrameSize,
            samplingRate: audioCapture.activeSamplingRate,
        };
        const json = JSON.stringify(result);
        return new BinaryBuffer(utf8StringLen(json)).setUtf8String(json).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioAllDevices, async () => {
        const json = JSON.stringify(audioCapture.devices);
        return new BinaryBuffer(utf8StringLen(json)).setUtf8String(json).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioIsInternalAudioProcessing, async () => {
        const json = JSON.stringify(audioCapture.internalProcessing);
        return new BinaryBuffer(utf8StringLen(json)).setUtf8String(json).getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.AudioApis, async () => {
        const json = JSON.stringify(audioCapture.audioApis);
        return new BinaryBuffer(utf8StringLen(json)).setUtf8String(json).getBuffer();
    });

    websocket.onPromise(ServerMessagesRaw.AudioSettingsUpdate, async update => {
        // switch (update.type) {
        //     case "audio-device-update":
        //         return audioCapture.update(update);
        //     case "audi-internal-processing":
        //         return audioCapture.setInternalProcessing(update.data);
        //     case "audio-api-update":
        //         return audioCapture.apiUpdate(update);
        // }
        throw new Error(`Invalid update${typeof update === "object" ? ` ${(update as any).type}` || "" : ""}`);
    });
}
