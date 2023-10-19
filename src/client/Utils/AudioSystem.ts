import { AudioProcessor } from "../../shared/audioProcessor";
import { LightSocket } from "./Socket";
import { EventEmitter } from "events";
import { AudioAnalyser } from "../../shared/audioAnalyser";
import { PatternService } from "./Patterns";
import { ScheduleService } from "./ScheduleService";
import { Log } from "../../shared/interfaces";
import { Listener } from "events";
import { ClientMessagesRaw, SpecialEvents } from "../../shared/Messages";
import { BinaryBuffer } from "../../shared/messages/BinaryBuffer";

export interface AudioUpdateResult {
    leftBuffer: Int16Array;
    rightBuffer: Int16Array;
    mergedBuffer: Int16Array;
    rgbBuffer: Int16Array;
}

export type LogUpdate = (log: Log) => void;
export type AudioUpdate = (AudioUpdate: AudioUpdateResult) => void;

export class AudioLightSystem {
    private eventEmitter = new EventEmitter();
    private _audioProcessor = new AudioProcessor();
    private _audioAnalyser = new AudioAnalyser(this._audioProcessor);
    private _lightSocket: LightSocket;
    private _scheduleService: ScheduleService;
    private _pattern: PatternService;
    private version = "Unknown";
    constructor() {
        const script = document.getElementById("version") as HTMLScriptElement;
        this.version = script.textContent.trim();
        this._lightSocket = new LightSocket(this.version, this.raiseNotification);
        //this._lightSocket.clientSocket.clientHandle.on("pcm", this.onPCM);
        this._lightSocket.clientSocket.clientHandle.on(ClientMessagesRaw.SocketLog, this._raiseNotificationBin);
        this._pattern = new PatternService(this._lightSocket);
        this._scheduleService = new ScheduleService(this._lightSocket, this._pattern);
    }
    on(type: "audioUpdate", listener: AudioUpdate): void;
    on(type: "log", listener: LogUpdate): void;
    on(type: string, listener: Listener) {
        return this.eventEmitter.on(type, listener);
    }

    off(type: "audioUpdate", listener: AudioUpdate): void;
    off(type: "log", listener: LogUpdate): void;
    off(type: string, listener: Listener) {
        return this.eventEmitter.off(type, listener);
    }
    destroy() {
        this.eventEmitter.removeAllListeners();
        this._lightSocket.socket.handle.disconnect();
    }
    get connected() {
        return this._lightSocket.socket.connected;
    }
    private onPCM = (arrayBuffer: ArrayBuffer) => {
        const intArray = new Int16Array(arrayBuffer);
        this._audioProcessor.pipe(intArray);
        const leftBuffer = this._audioProcessor.leftBuffer;
        const rightBuffer = this._audioProcessor.rightBuffer;
        const mergedBuffer = this._audioProcessor.mergedBuffer;
        const rgbBuffer = this._audioProcessor.rgbBuffer;
        //this._audioAnalyser.update();
        this.eventEmitter.emit("audioUpdate", { leftBuffer, rightBuffer, mergedBuffer, rgbBuffer });
    };
    private _raiseNotificationBin = (client, binary: BinaryBuffer) => {
        const type = binary.getUtf8String() as any;
        const str = binary.getUtf8String();
        const des = binary.getUtf8String();
        const log: Log = { title: str, type, description:des };
        this._raiseNotification(log);
    };
    private _raiseNotification = (log: Log) => {
        this.eventEmitter.emit("log", log);
    };
    get lightSocket() {
        return this._lightSocket;
    }
    get audioProcessor() {
        return this._audioProcessor;
    }
    get audioAnalyser() {
        return this._audioAnalyser;
    }
    get patternService() {
        return this._pattern;
    }
    get scheduleService() {
        return this._scheduleService;
    }
    raiseError(error: Error) {
        const title = error.name || "Unknown error";
        const stack = error.stack || new Error().stack || "Unknown error has occurred";
        this._raiseNotification({ type: "error", title, description: stack });
    }
    raiseNotification(title: string, description?: string) {
        this._raiseNotification({ type: "info", title, description });
    }
}
