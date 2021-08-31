import { cloneDeep } from "../../shared/utils";
import { getStorage, setStorage } from "../sharedFiles/settingsStore";
import { RtAudioApi } from "audify";

const fileName = "audioServerSettings.json";

export interface AudioCaptureInterface {
    device: {
        defaultInputDevice: number | null;
        defaultOutputDevice: number | null;
        samplingRate: number;
        frameSize: number;
    };
    internalProcessing: boolean;
    audioApi: number;
}

const defaultSettings: AudioCaptureInterface = {
    device: {
        defaultInputDevice: null,
        defaultOutputDevice: null,
        samplingRate: 48000, // Sampling rate is 48kHz
        frameSize: 960, //(20)
    },
    internalProcessing: false,
    audioApi: RtAudioApi.WINDOWS_WASAPI,
};

export let settings = cloneDeep(defaultSettings);

export async function initStorage() {
    const result = await getStorage(fileName, defaultSettings);
    settings = result;
}

export async function saveSettings() {
    await setStorage(fileName, settings);
}
