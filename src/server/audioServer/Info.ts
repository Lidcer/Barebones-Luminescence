import { ClientSocket } from "../../shared/clientSocket";
import { ActiveDevice, RtAudioDeviceInf, AudioUpdate } from "../../shared/interfaces";
import { AudioCapture } from "./audioCapture";
import * as os from "os";

export function setupInfo(clientSocket: ClientSocket, audioCapture: AudioCapture) {
    clientSocket.onPromise<ActiveDevice, []>("active-device", async () => {
        const result: ActiveDevice = {
            computerName: `${os.userInfo().username} (${os.hostname()})`,
            device: audioCapture.activeDevice,
            frameSize: audioCapture.activeFrameSize,
            samplingRate: audioCapture.activeSamplingRate,
        };
        return result;
    });
    clientSocket.onPromise<RtAudioDeviceInf[], []>("all-devices", async () => {
        return audioCapture.devices;
    });
    clientSocket.onPromise<boolean, []>("is-internal-audio-processing", async () => {
        return audioCapture.internalProcessing;
    });
    clientSocket.onPromise<{ [key: string]: number }, []>("audio-apis", async () => {
        return audioCapture.audioApis;
    });

    clientSocket.onPromise<boolean, [AudioUpdate]>("audio-settings-update", async update => {
        switch (update.type) {
            case "audio-device-update":
                return audioCapture.update(update);
            case "audi-internal-processing":
                return audioCapture.setInternalProcessing(update.data);
            case "audio-api-update":
                return audioCapture.apiUpdate(update);
        }
        throw new Error(`Invalid update${typeof update === "object" ? ` ${(update as any).type}` || "" : ""}`);
    });
}
