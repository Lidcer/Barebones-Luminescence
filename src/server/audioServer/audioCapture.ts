/// <reference path="./notify.d.ts" />
import notifier from "node-notifier";
import { AudioApiUpdate, AudioDeviceUpdate, RtAudioDeviceInf } from "../../shared/interfaces";
import { getClosest } from "../../shared/utils";
import { AudioCaptureInterface, saveSettings, settings } from "./settings";
//@ts-ignore
import { RtAudio, RtAudioFormat, RtAudioApi } from "audify";
import { cloneDeep } from "lodash";
type ONPCM = (buffer: Buffer) => void;

export class AudioCapture {
    private readonly notificationName = "Audio capture";
    private rtAudio: RtAudio;
    private active = false;
    private _activeDevice: RtAudioDeviceInf;
    private _activeSamplingRate = -1;
    private _activeFrameSize = -1;
    private streamOpen = false;
    constructor(private onPCM: ONPCM) {
        this.rtAudio = new RtAudio(settings.audioApi);
        this.openSteam();
    }
    closeSteam() {
        if (this.streamOpen) {
            this.rtAudio.closeStream();
            this.streamOpen = false;
        }
    }

    openSteam() {
        this.closeSteam();
        const { device, frameSize, samplingRate, id } = this.getValidSettings();
        Logger.info("id frameSize, samplingRate", id, frameSize, samplingRate);

        this._activeDevice = device;
        this._activeSamplingRate = samplingRate;
        this._activeFrameSize = frameSize;

        this.rtAudio.openStream(
            null,
            { deviceId: id, nChannels: 2, firstChannel: 0 },
            RtAudioFormat.RTAUDIO_SINT16,
            samplingRate,
            frameSize,
            "NodeLightAudioCapture", // The name of the stream (used for JACK Api)
            this.pipePCM, // Input callback function, write every input pcm data to the output buffer
            undefined,
        );
        this.streamOpen = true;
    }

    getValidSettings() {
        let id = settings.device.defaultOutputDevice || this.rtAudio.getDefaultOutputDevice();
        let device = this.devices[id];
        if (!device) {
            Logger.error("Audio device not found!");
            id = this.rtAudio.getDefaultOutputDevice();
            device = this.devices[id];
        }

        let samplingRate = settings.device.samplingRate || device.preferredSampleRate;
        if (!device.sampleRates.includes(samplingRate)) {
            const temp = samplingRate;
            samplingRate = getClosest(device.sampleRates, samplingRate);
            Logger.warn(`Unsupported sampling rate ${temp}! Using the closed one ${samplingRate}`);
        }
        const frameSize = settings.device.frameSize || 960;
        if (frameSize < 100) {
            Logger.warn("Frame could too low");
        } else if (frameSize < 100000) {
            Logger.warn("Frame could too hight");
        }
        return { frameSize, device, samplingRate, id };
    }

    private pipePCM = (buffer: Buffer) => {
        this.onPCM(buffer);
    };

    get devices(): RtAudioDeviceInf[] {
        //@ts-ignore
        return this.rtAudio.getDevices();
    }

    get activeDevice() {
        return this._activeDevice;
    }
    get activeSamplingRate() {
        return this._activeSamplingRate;
    }
    get activeFrameSize() {
        return this._activeFrameSize;
    }

    async apiUpdate(apiUpdate: AudioApiUpdate) {
        const copy = cloneDeep(settings);
        try {
            this.closeSteam();
            settings.device.defaultInputDevice = null;
            settings.device.defaultOutputDevice = null;
            const initAudio = new RtAudio(apiUpdate.data);
            this.rtAudio = initAudio;
            settings.audioApi = apiUpdate.data;
            this.openSteam();
            await saveSettings();
            return true;
        } catch (error) {
            settings.device = copy.device;
            this.openSteam();
            throw new Error(error);
        }
    }

    async update(update: AudioDeviceUpdate) {
        if (!this.active) {
            return false;
        }
        this.rtAudio.stop();

        const backupSettings: AudioCaptureInterface = { ...settings };
        settings.device.defaultOutputDevice = update.data.id;
        settings.device.frameSize = update.data.frameSize;
        settings.device.samplingRate = update.data.sampleRate;
        try {
            this.openSteam();
            this.rtAudio.start();

            notifier.notify({
                title: this.notificationName,
                message: `Setting updated`,
            });
            await saveSettings();
            return true;
        } catch (error) {
            settings.device.defaultOutputDevice = backupSettings.device.defaultOutputDevice;
            settings.device.frameSize = backupSettings.device.frameSize;
            settings.device.samplingRate = backupSettings.device.samplingRate;
            Logger.error(error);
            notifier.notify({
                title: this.notificationName,
                message: `Failed to update settings`,
            });
        }
        return false;
    }
    async setInternalProcessing(value: boolean) {
        settings.internalProcessing = value;
        await saveSettings();
        return settings.internalProcessing;
    }
    get internalProcessing() {
        return settings.internalProcessing;
    }
    get audioApis() {
        return {
            LINUX_ALSA: RtAudioApi.LINUX_ALSA,
            LINUX_OSS: RtAudioApi.LINUX_OSS,
            LINUX_PULSE: RtAudioApi.LINUX_PULSE,
            MACOSX_CORE: RtAudioApi.MACOSX_CORE,
            RTAUDIO_DUMMY: RtAudioApi.RTAUDIO_DUMMY,
            UNIX_JACK: RtAudioApi.UNIX_JACK,
            UNSPECIFIED: RtAudioApi.UNSPECIFIED,
            WINDOWS_ASIO: RtAudioApi.WINDOWS_ASIO,
            WINDOWS_DS: RtAudioApi.WINDOWS_DS,
            WINDOWS_WASAPI: RtAudioApi.WINDOWS_WASAPI,
        };
    }

    start() {
        if (!this.active) {
            this.active = true;
            this.rtAudio.start();

            notifier.notify(
                {
                    title: this.notificationName,
                    message: "Audio broadcast has been activated",
                    actions: ["Stop", "Exit"],
                },
                (_, c) => {
                    switch (c) {
                        case "exit":
                            process.exit(0);
                            break;
                        case "stop":
                            this.stop();
                            break;

                        default:
                            break;
                    }
                },
            );
        }
    }
    stop() {
        if (this.active) {
            this.active = false;
            this.rtAudio.stop();
            notifier.notify({
                title: this.notificationName,
                message: "Audio broadcast has been stopped",
            });
        }
    }
}
