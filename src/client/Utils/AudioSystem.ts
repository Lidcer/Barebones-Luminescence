import { AudioProcessor } from "../../shared/audioProcessor";
import { LightSocket } from "./Socket";
import { EventEmitter, Listener } from "events";
import { AudioAnalyser } from "../../shared/audioAnalyser";
import { PatternService } from "./Patterns";
import { ScheduleService } from "./ScheduleService";
import { ControllerMode } from "../../shared/interfaces";

export interface AudioUpdateResult {
  leftBuffer: Int16Array;
  rightBuffer: Int16Array;
  mergedBuffer: Int16Array;
  rgbBuffer: Int16Array;
}

export type AudioUpdate = (AudioUpdate: AudioUpdateResult) => void;
export type ModeUpdate = (mode: ControllerMode) => void;

export class AudioLightSystem {
  private eventEmitter = new EventEmitter();
  private _audioProcessor = new AudioProcessor();
  private _audioAnalyser = new AudioAnalyser(this._audioProcessor);
  private _lightSocket: LightSocket;
  private _scheduleService: ScheduleService;
  private _pattern: PatternService;
  private _mode: ControllerMode = "Manual"; 

  constructor() {
    this._lightSocket = new LightSocket();
    this._lightSocket.clientSocket.on("pcm", this.onPCM);
    this._lightSocket.clientSocket.on("mode-update", this.onModeUpdate);
    this._pattern = new PatternService(this._lightSocket);
    this._scheduleService = new ScheduleService(this._lightSocket, this._pattern);
  }
  on(type: "mode-update", listener: ModeUpdate): void;
  on(type: "audioUpdate", listener: AudioUpdate): void;
  on(type: string, listener: Listener) {
    return this.eventEmitter.on(type, listener);
  }

  off(type: "mode-update", listener: ModeUpdate): void;
  off(type: "audioUpdate", listener: AudioUpdate): void;
  off(type: string, listener: Listener) {
    return this.eventEmitter.off(type, listener);
  }
  destroy() {
    this.eventEmitter.removeAllListeners();
    this._lightSocket.socket.disconnect();
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
  private onModeUpdate = (mode:ControllerMode) => {
    this._mode = mode;
    this.eventEmitter.emit("mode-update", this._mode);
  }

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
  get mode() {
    return this._mode;
  }
}
