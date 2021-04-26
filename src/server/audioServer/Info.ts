import { ClientSocket } from "../../shared/clientSocket";
import { ActiveDevice, DeviceUpdate, RtAudioDeviceInf } from "../../shared/interfaces";
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

    clientSocket.onPromise<boolean, [DeviceUpdate]>("update-device", async device => {
        return audioCapture.update(device);
    });
}
