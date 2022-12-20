import { EventEmitter, Listener } from "events";
import { io, Socket } from "socket.io-client";
import { BrowserStorage } from "./BrowserStorage";
import { ClientSocket } from "../../shared/clientSocket";
import { MINUTE } from "../../shared/constants";
import { ControllerMode, FetchableServerConfig, LoginData, ServerSettings, SocketAuth } from "../../shared/interfaces";
import { noop } from "lodash";

interface Queue {
    promise: boolean;
    date: number;
    args: any[];
    resolve?: (...args: any) => void;
    reject?: (...args: any) => void;
}

export type ModeUpdate = (mode: ControllerMode) => void;
export class LightSocket {
    private readonly TIMEOUT = MINUTE;
    private eventEmitter = new EventEmitter();
    private _socket: Socket;
    private _clientSocket: ClientSocket;
    private _authenticated = false;
    private queue: Queue[] = [];
    private _settings: ServerSettings;
    private _magicHome = false;
    private _activeCamera = false;
    private _doorSensor = false;
    private _mode: ControllerMode = "Manual";

    constructor(private version: string, private raiseNotification: (title: string, description?: string) => void) {
        this._clientSocket = new ClientSocket();
        this._clientSocket.on("mode-update", this.onModeUpdate);
        this._clientSocket.on("connect", async msg => {
            this.getSettings();
            this.eventEmitter.emit("connect");
        });
        this._clientSocket.on("disconnect", msg => {
            this.eventEmitter.emit("disconnect");
            this._authenticated = false;
            this._magicHome = false;
            this.emptyQueue();
        });
        this.authenticate().catch(noop);
    }

    on(type: "mode-update", listener: ModeUpdate): void;
    on(value: "auth", listener: Listener): void;
    on(value: "disconnect", listener: Listener): void;
    on(value: "connect", listener: Listener): void;
    on(value: string, listener: Listener) {
        this.eventEmitter.on(value, listener);
    }
    off(type: "mode-update", listener: ModeUpdate): void;
    off(value: "auth", listener: Listener): void;
    off(value: "disconnect", listener: Listener): void;
    off(value: "connect", listener: Listener): void;
    off(value: string, listener: Listener) {
        this.eventEmitter.off(value, listener);
    }
    private onModeUpdate = (mode: ControllerMode) => {
        this._mode = mode;
        this.eventEmitter.emit("mode-update", this._mode);
    };
    private async getSettings() {
        this._settings = await this._clientSocket.emitPromise<ServerSettings, []>("server-settings-get");
        try {
            const result = await this._clientSocket.emitPromise<FetchableServerConfig, []>("server-config-get");
            this._magicHome = result.magicController;
            this._doorSensor = result.doorSensor;
            this._activeCamera = result.activeCamera;
            if (this._mode !== result.mode) {
                this._mode = result.mode;
                this.onModeUpdate(this._mode);
            }

            if (this.version !== result.version) {
                this.raiseNotification("Invalid app version", `Expected ${result.version}v using ${this.version}v`);
            }
        } catch (_error) {
            this._magicHome = false;
            this._doorSensor = false;
        }
    }

    async authenticate(password?: string) {
        return new Promise<void>((resolve, reject) => {
            const storageKey = "socket-password";

            if (this.socket) {
                resolve();
            } else {
                const pass = password || BrowserStorage.getString(storageKey);

                if (!pass) {
                    reject(new Error("No password provided"));
                    return;
                }
                const socket = io({
                    auth: {
                        password: pass,
                        clientType: "browser-client",
                    } as SocketAuth,
                });
                socket.on("connection-login", (data: LoginData) => {
                    if (data.status === "ok") {
                        this._socket = socket;
                        this._authenticated = true;
                        this.clientSocket.setSocket(socket);
                        BrowserStorage.setString(storageKey, pass);
                        resolve();
                    } else {
                        if (data.message) {
                            reject(new Error(data.message));
                        } else {
                            reject(new Error("Unknown error"));
                        }
                    }
                });
                this.sendQueue();
            }
        });
    }
    setColor(red: number, green: number, blue: number) {
        return this._clientSocket.emitPromise("rgb", red, green, blue);
    }
    get socket() {
        return this._socket;
    }
    get authenticated() {
        return this._authenticated;
    }
    get clientSocket() {
        return this._clientSocket;
    }
    get mode() {
        return this._mode;
    }
    emitIfPossible<T extends any[]>(event: string, ...args: T) {
        if (this.authenticated) {
            this.clientSocket.emit.apply(this.clientSocket, [event, ...args]);
        } else {
            const mergedArgs = [event, ...args];
            this.queue.push({ promise: false, args: mergedArgs, date: Date.now() });
        }
    }

    async emitPromiseIfPossible<R, T extends any[]>(event: string, ...args: T): Promise<R> {
        if (this.authenticated) {
            return this.clientSocket.emitPromise.apply(this.clientSocket, [event, ...args]);
        } else {
            const mergedArgs = [event, ...args];
            return new Promise((resolve, reject) => {
                this.queue.push({ promise: true, resolve, reject, args: mergedArgs, date: Date.now() });
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
                const result = await this.clientSocket.emitPromise.apply(this.clientSocket, args);
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
        } else {
            this.clientSocket.emit.apply(null, args);
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
        return this._clientSocket && this._clientSocket.connected && this.authenticated;
    }
    get settings(): ServerSettings {
        return this._settings;
    }
}
