import { includes, pushUniqToArray, removeFromArray, Stringify } from "../../../shared/utils";
import { Server } from "http";
import { IS_DEV } from "../main/config";
import { Client } from "./client";
import { Logger } from "../../../shared/logger";
import SocketIO from "socket.io";
import { createSocketError } from "../../../shared/socketError";
import { ClientType, Log } from "../../../shared/interfaces";
import { EventEmitter } from "events";
import { userClients } from "../../../shared/constants";

type WebsocketCallback = (client: Client, ...args: any[] | any) => void;
type WebsocketCallbackPromise = (client: Client, ...args: any[] | any) => Promise<any>;

const ignoreEvents = ["connection", "disconnect"];

export class WebSocket {
    private event = new EventEmitter();
    private socketServer: SocketIO.Server;
    private clients: Client[] = [];
    private callbacks = new Map<string, WebsocketCallback[]>();
    private promiseCallback = new Map<string, WebsocketCallbackPromise>();

    constructor(props: { server?: Server; onlyOne?: boolean }) {
        this.socketServer = new SocketIO.Server(props.server);

        process.on("uncaughtException", err => {
            console.error("uncaughtException", err);
            this.broadcastLog("error", err);
        });
        process.on("unhandledRejection", err => {
            const error = new Error("Unhandled promise rejection");
            console.error("unhandledRejection", err, error);
            this.broadcastLog("error", error);
        });
        Logger.setNext((type, value, ...args) => {
            let string = "Unknown error";
            if (args.length === 1 || args.length === 0) {
                string = args[0] ? Stringify.do(args[0]) : "Unknown error";
            } else {
                string = Stringify.do(args);
            }
            switch (type) {
                case "error":
                    this.broadcastLog("error", value, string);
                    break;
                case "fatal":
                    this.broadcastLog("fatal", value, string);
                    break;
                case "info":
                    this.broadcastLog("info", value, string);
                    break;
                case "log":
                    this.broadcastLog("log", value, string);
                    break;
            }
        });
        this.socketServer.on("connection", (c: SocketIO.Socket) => {
            const client = new Client(c);
            if (!client.auth()) {
                return;
            }
            this.clients.push(client);
            Logger.debug("[WebSocket]", "connected", client.id, this.getSocketInfo());

            client.onAny(async (...args) => {
                const value = args[0];
                if (includes(ignoreEvents, value)) {
                    return;
                }
                const len = args.length;
                const callback = args[len - 1];
                const promise = typeof callback === "function";
                if (promise) {
                    const promise = this.promiseCallback.get(value);
                    if (promise === undefined) {
                        Logger.debug("WARNING", `Promise value "${value}" does not exit!`);
                        callback(undefined, createSocketError("Unknown value", IS_DEV ? undefined : null));
                        return;
                    }
                    const filteredArgs = args.slice(1, args.length - 1);
                    try {
                        const result = await promise.apply(this, [client, ...filteredArgs]);
                        callback(result);
                    } catch (error) {
                        const message = (error && error.message) || "Unknown error";
                        const stack = error && error.stack;
                        callback(undefined, createSocketError(message, IS_DEV ? stack : null));
                        Logger.debug("Socket promise error", error);
                    }
                } else {
                    const callbacks = this.callbacks.get(value);
                    if (!callbacks) {
                        Logger.debug("WARNING", `Value "${value}" does not exit!`);
                        return;
                    }
                    const filteredArgs = args.slice(1);

                    for (const callback of callbacks) {
                        callback.apply(this, [client, ...filteredArgs]);
                    }
                }
            });

            client.on("disconnect", () => {
                removeFromArray(this.clients, client);
                Logger.debug("[WebSocket]", "disconnected", client.id, this.getSocketInfo());
                const allowedClients: ClientType[] = ["android-app", "android-app-background", "browser-client"];
                const clients = this.clients.filter(c => allowedClients.includes(c.clientType));
                if (!clients.length) {
                    this.event.emit("all-clients-disconnected");
                }
            });
        });
    }
    private getSocketInfo() {
        const ap = this.clients.filter(e => e.clientType === "android-app").length;
        const apb = this.clients.filter(e => e.clientType === "android-app-background").length;
        const bc = this.clients.filter(e => e.clientType === "browser-client").length;
        return `browser-client: ${bc}, android-app: ${ap}, android-app-background: ${apb}`;
    }

    onSocketEvent(value: "all-clients-disconnected", listener: () => void);
    onSocketEvent(value: string, listener: (...args: any) => void) {
        return this.event.on(value, listener);
    }

    getAudioServer() {
        return this.clients.find(c => c.clientType === "audio-server");
    }

    getAllClients() {
        return this.clients;
    }

    broadcast(message: string, ...args: any) {
        if (!message.length) {
            throw new Error("Cannot broadcast empty message");
        }
        for (const client of this.clients) {
            if (userClients.includes(client.clientType)) {
                client.emit.apply(client, [message, ...args]);
            }
        }
    }

    on<T extends any[]>(value: string, callback: (client: Client, ...args: T) => void | Promise<void>) {
        const callbackFunction = this.callbacks.get(value) || [];
        pushUniqToArray(callbackFunction, callback);
        this.callbacks.set(value, callbackFunction);
    }
    off(value: string, callback: (client: Client, ...args) => void) {
        const callbackFunction = this.callbacks.get(value) || [];
        removeFromArray(callbackFunction, callback);
        this.callbacks.set(value, callbackFunction);
    }

    onPromise<A, T extends any[]>(value: string, callback: (client: Client, ...args: T) => Promise<A>) {
        if (!(callback instanceof (async () => {}).constructor)) {
            const err = new Error("Promise callback expected");
            this.broadcastLog("fatal", err);
            throw err;
        }

        const promiseFn = this.promiseCallback.get(value);
        if (promiseFn) {
            const err = new Error(`Used value: "${value}" Already exist!`);
            this.broadcastLog("fatal", err);
            throw err;
        }
        this.promiseCallback.set(value, callback);
    }

    offPromise(value: string, callback: (client: Client, ...args: any[]) => void) {
        const promiseCallback = this.promiseCallback.get(value);
        if (promiseCallback === callback) {
            this.promiseCallback.delete(value);
        }
    }

    getClients() {
        return this.clients;
    }
    broadcastLog(type: Log["type"], name: string | Error, description?: string) {
        let str = "";
        let des = "";
        if (name instanceof Error) {
            str = name.name;
            des = name.stack;
        } else {
            str = name;
            des = description;
        }

        const socketError: Log = { type, title: str, description: des };
        this.broadcast("socket-log", socketError);
    }
}
