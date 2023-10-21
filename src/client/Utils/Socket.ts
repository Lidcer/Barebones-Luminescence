import { BrowserStorage } from "./BrowserStorage";
import { EventEmitter, Emitter } from "../../shared/eventEmitter";
import { ClientSocket } from "../../shared/clientSocket";
import { MINUTE } from "../../shared/constants";
import {
    ControllerMode,
    FetchableServerConfig,
    LoginData,
    RGB,
    ServerSettings,
    SocketAuth,
} from "../../shared/interfaces";
import { noop } from "lodash";
import { ClientMessagesRaw, ServerMessagesRaw, SpecialEvents } from "../../shared/Messages";
import { BinaryBuffer, utf8StringLen } from "../../shared/messages/BinaryBuffer";
import { SocketData } from "../../shared/messages/messageHandle";

interface Queue {
    promise: boolean;
    date: number;
    args: {
        event: ServerMessagesRaw;
        buffer: Uint8Array;
    };
    resolve?: (...args: any) => void;
    reject?: (...args: any) => void;
}

const empty = new Uint8Array();

export type RGBUpdate = (rgb: RGB) => void;

export type ModeUpdate = (mode: ControllerMode) => void;
export class LightSocket {
    private readonly TIMEOUT = MINUTE;
    private eventEmitter = new EventEmitter();
    private _clientSocket: ClientSocket;
    private queue: Queue[] = [];
    private _settings: ServerSettings;
    private _magicHome = false;
    private _activeCamera = false;
    private _doorSensor = false;
    private _mode: ControllerMode = ControllerMode.Manual;
    private STORAGE_KEY = "socket-password";

    constructor(private version: string, private raiseNotification: (title: string, description?: string) => void) {
        this._clientSocket = new ClientSocket();

        this._clientSocket.clientHandle.on(ClientMessagesRaw.ModeUpdate, this.onModeUpdateBin);
        this._clientSocket.clientHandle.on(ClientMessagesRaw.RGBUpdate, this.onRGBUpdate);
        this._clientSocket.clientHandle.on(SpecialEvents.Connect, async msg => {
            this.getSettings();
            this.eventEmitter.emit("connect");
        });
        this._clientSocket.clientHandle.on(SpecialEvents.Disconnect, msg => {
            this.eventEmitter.emit("disconnect");
            this._magicHome = false;
            this.emptyQueue();
        });
        this.authenticate();
    }
    on(type: "rgb-update", listener: RGBUpdate): void;
    on(type: "mode-update", listener: ModeUpdate): void;
    on(value: "auth", listener: Emitter): void;
    on(value: "disconnect", listener: Emitter): void;
    on(value: "connect", listener: Emitter): void;
    on(value: string, listener: Emitter) {
        this.eventEmitter.on(value, listener);
    }
    off(type: "rgb-update", listener: RGBUpdate): void;
    off(type: "mode-update", listener: ModeUpdate): void;
    off(value: "auth", listener: Emitter): void;
    off(value: "disconnect", listener: Emitter): void;
    off(value: "connect", listener: Emitter): void;
    off(value: string, listener: Emitter) {
        this.eventEmitter.off(value, listener);
    }
    private onModeUpdateBin = (data: BinaryBuffer) => {
        this.onModeUpdate(data.getUint8());
    };
    private onRGBUpdate = (data: BinaryBuffer) => {
        const r = data.getUint8();
        const g = data.getUint8();
        const b = data.getUint8();
        this.eventEmitter.emit("rgb-update", { r, g, b });
    };
    private onModeUpdate = (mode: ControllerMode) => {
        this._mode = mode;
        this.eventEmitter.emit("mode-update", this._mode);
    };
    private async getSettings() {
        const settingsBuffer = await this._clientSocket.clientHandle.sendPromise(ServerMessagesRaw.Settings);
        this._settings = JSON.parse(settingsBuffer.getUtf8String());
        try {
            const resultBuffer = await this._clientSocket.clientHandle.sendPromise(ServerMessagesRaw.Config);
            const mode = resultBuffer.getUint8();
            const doorSensor = resultBuffer.getBool();
            const activeCamera = resultBuffer.getBool();
            const magicController = resultBuffer.getBool();
            const version = resultBuffer.getUtf8String();
            console.log(mode,
                doorSensor,
                activeCamera,
                magicController,
                version)
            this._magicHome = magicController;
            this._doorSensor = doorSensor;
            this._activeCamera = activeCamera;
            if (this._mode !== mode) {
                this._mode = mode;
                this.onModeUpdate(this._mode);
            }
            if (this.version !== version) {
                this.raiseNotification("Invalid app version", `Expected ${version}v using ${this.version}v`);
            }
        } catch (_error) {
            console.log(_error);
            this._magicHome = false;
            this._doorSensor = false;
        }
    }

    async authenticate(password?: string) {
        const pass = password || BrowserStorage.getString(this.STORAGE_KEY);
        if (!pass) {
            new Error("No password provided");
            return;
        }

        await this._clientSocket.createSocket(location.href, pass);
        BrowserStorage.setString(this.STORAGE_KEY, pass);
        this.sendQueue();
    }
    setColor(red: number, green: number, blue: number) {
        return this._clientSocket.clientHandle.send(
            ServerMessagesRaw.RGBSet,
            new BinaryBuffer(3).setUint8(red).setUint8(green).setUint8(blue).getBuffer(),
        );
    }
    get socket() {
        return this._clientSocket;
    }
    get clientSocket() {
        return this._clientSocket;
    }
    get mode() {
        return this._mode;
    }
    emitIfPossible<R>(event: ServerMessagesRaw, buffer: Uint8Array = empty) {
        if (this.connected) {
            return this.clientSocket.clientHandle.sendPromise(event, buffer);
        } else {
            this.queue.push({
                promise: false,
                args: {
                    event,
                    buffer,
                },
                date: Date.now(),
            });
        }
    }

    async emitPromiseIfPossible(event: ServerMessagesRaw, buffer: Uint8Array = empty): Promise<SocketData> {
        if (this.socket.connected) {
            return this.clientSocket.clientHandle.sendPromise(event, buffer);
        } else {
            return new Promise((resolve, reject) => {
                this.queue.push({ promise: true, resolve, reject, args: { event, buffer }, date: Date.now() });
            });
        }
    }
    private async sendQueue() {
        if (!this.queue.length) {
            return;
        }
        const item = this.queue.shift();
        const args = item.args;
        const dateNow = Date.now();
        const promise = item.promise;
        if (item.date + MINUTE < dateNow) {
            if (promise) {
                item.reject(new Error("Request timed out"));
            }
            this.sendQueue();
            return;
        }
        if (promise) {
            try {
                const result = await this.clientSocket.clientHandle.sendPromise(args.event, args.buffer);
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
        } else {
            this.clientSocket.clientHandle.send(args.event, args.buffer);
        }
        this.sendQueue();
    }

    private async emptyQueue() {
        if (!this.queue.length) {
            return;
        }
        const item = this.queue.shift();
        if (item.promise) {
            item.reject(new Error("Socket connection lost"));
        }
        this.emptyQueue();
    }
    get isMagicHome() {
        return this._magicHome;
    }
    get hasActiveCamera() {
        return this._activeCamera;
    }
    get doorSensorConnected() {
        return this._doorSensor;
    }
    get connected() {
        return this._clientSocket && this._clientSocket.connected;
    }
    get settings(): ServerSettings {
        return this._settings;
    }
}
