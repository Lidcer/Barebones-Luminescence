import { cloneDeep } from "../../shared/utils";
import { getStorage, setStorage } from "../sharedFiles/settingsStore";

const fileName = "audioServerSettings.json";

export interface AudioCaptureInterface {
  defaultInputDevice: number | null;
  defaultOutputDevice: number | null;
  samplingRate: number;
  frameSize: number;
}

const defaultSettings: AudioCaptureInterface = {
  defaultInputDevice: null,
  defaultOutputDevice: null,
  samplingRate: 48000, // Sampling rate is 48kHz
  frameSize: 960, //(20)
};

export let settings = cloneDeep(defaultSettings);

export async function initStorage() {
  const result = await getStorage(fileName, defaultSettings);
  settings = result;
}

export async function saveSettings() {
  await setStorage(fileName, settings);
}
