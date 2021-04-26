/// <reference path="./notify.d.ts" />
import notifier from "node-notifier";
import { DeviceUpdate, RtAudioDeviceInf } from "../../shared/interfaces";
import { getClosest } from "../../shared/utils";
import { AudioCaptureInterface, saveSettings, settings } from "./settings";
//@ts-ignore
import { RtAudio, RtAudioFormat } from "audify";
type ONPCM = (buffer: Buffer) => void;

export class AudioCapture {
    private readonly notificationName = "Audio capture";
    private rtAudio = new RtAudio();
    private active = false;
    private _activeDevice: RtAudioDeviceInf;
    private _activeSamplingRate = -1;
    private _activeFrameSize = -1;
    private streamOpen = false;

    constructor(private onPCM: ONPCM) {
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
        let id = settings.defaultOutputDevice || this.rtAudio.getDefaultOutputDevice();
        let device = this.devices[id];
        if (!device) {
            Logger.error("Audio device not found!");
            id = this.rtAudio.getDefaultOutputDevice();
            device = this.devices[id];
        }

        let samplingRate = settings.samplingRate || device.preferredSampleRate;
        if (!device.sampleRates.includes(samplingRate)) {
            const temp = samplingRate;
            samplingRate = getClosest(device.sampleRates, samplingRate);
            Logger.warn(`Unsupported sampling rate ${temp}! Using the closed one ${samplingRate}`);
        }
        const frameSize = settings.frameSize || 960;
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

    async update(update: DeviceUpdate) {
        if (!this.active) {
            return false;
        }
        this.rtAudio.stop();

        const backupSettings: AudioCaptureInterface = { ...settings };
        settings.defaultOutputDevice = update.id;
        settings.frameSize = update.frameSize;
        settings.samplingRate = update.sampleRate;
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
            settings.defaultOutputDevice = backupSettings.defaultOutputDevice;
            settings.frameSize = backupSettings.frameSize;
            settings.samplingRate = backupSettings.samplingRate;
            Logger.error(error);
            notifier.notify({
                title: this.notificationName,
                message: `Failed to update settings`,
            });
        }
        return false;
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
