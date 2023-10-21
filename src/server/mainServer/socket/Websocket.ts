import { pushUniqToArray, removeFromArray, Stringify } from "../../../shared/utils";
import { Client } from "./client";
import { Logger } from "../../../shared/logger";
import { ClientType, Log } from "../../../shared/interfaces";
import { EventEmitter } from "events";
import { MINUTE, userClients } from "../../../shared/constants";
import { BunServer, WSEvent } from "../../sharedFiles/bun-server";
import { ClientMessagesRaw, ServerMessagesRaw, SpecialEvents } from "../../../shared/Messages";
import { SocketData, SocketRaw } from "../../../shared/messages/messageHandle";
import { BinaryBuffer, utf8StringLen } from "../../../shared/messages/BinaryBuffer";
import { Cache } from "../../../shared/cache";
import { randomBytes } from "crypto";

type WebsocketCallback = (buffer: SocketData, client: Client) => void;
type WebsocketCallbackPromise = (buffer: SocketData, client: Client) => Promise<SocketRaw>;

export class WebSocket {
    private event = new EventEmitter();
    private clients: Client[] = [];
    private callbacks = new Map<ServerMessagesRaw, WebsocketCallback[]>();
    private promiseCallback = new Map<ServerMessagesRaw, WebsocketCallbackPromise>();
    private tokens = new Cache<string, string>(MINUTE);

    constructor(private server?: BunServer) {
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
        this.server.socketEmitter.on(WSEvent.Connect, c => {
            try {
                const client = new Client(c, token => {
                    const data = this.tokens.get(token);
                    this.tokens.delete(token);
                    return data as any;
                });
                this.clients.push(client);

                const methods = Array.from(this.callbacks);
                for (const [methodName, arr] of methods) {
                    for (const method of arr) {
                        client.serverMessageHandler.on(methodName, method);
                    }
                }

                const promiseMethods = Array.from(this.promiseCallback);
                for (const [methodName, fn] of promiseMethods) {
                    client.serverMessageHandler.onPromise(methodName, fn);
                }

                client.serverMessageHandler.on(SpecialEvents.Disconnect, () => {
                    removeFromArray(this.clients, client);
                    Logger.log("[WebSocket]", "disconnected", this.getSocketInfo());
                    const allowedClients: ClientType[] = ["android-app", "android-app-background", "browser-client"];
                    const clients = this.clients.filter(c => allowedClients.includes(c.clientType));
                    if (!clients.length) {
                        this.event.emit("all-clients-disconnected");
                    }
                });
                Logger.log("[WebSocket]", "connected", this.getSocketInfo());
            } catch (error) {
                c.ws.close(4000, error.message);
            }
        });
    }

    generateToken(clientType: string) {
        while (true) {
            const id = randomBytes(8).toString("hex");
            if (!this.tokens.get(id)) {
                this.tokens.set(id, clientType);
                return id;
            }
        }
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

    broadcast(type: ClientMessagesRaw, buffer: SocketRaw) {
        if (this.clients.length) {
            const binaryBuffer = new BinaryBuffer(buffer.byteLength + 1);
            binaryBuffer.setUint8(type);
            binaryBuffer.setBytes(buffer);
            const raw = binaryBuffer.getBuffer();

            for (const client of this.clients) {
                if (userClients.includes(client.clientType)) {
                    client.socket.send(raw);
                }
            }
        }
    }

    on(value: ServerMessagesRaw, callback: (buffer: SocketData, client: Client) => void | Promise<void>) {
        const callbackFunction = this.callbacks.get(value) || [];
        pushUniqToArray(callbackFunction, callback);
        for (const client of this.clients) {
            client.serverMessageHandler.on(value, callback);
        }
        this.callbacks.set(value, callbackFunction);
    }
    off(value: ServerMessagesRaw, callback: (buffer: SocketData, client: Client) => void) {
        const callbackFunction = this.callbacks.get(value) || [];
        removeFromArray(callbackFunction, callback);
        for (const client of this.clients) {
            client.serverMessageHandler.off(value, callback);
        }

        this.callbacks.set(value, callbackFunction);
    }

    onPromise(value: ServerMessagesRaw, callback: (buffer: SocketData, client: Client) => Promise<SocketRaw>) {
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

    offPromise(value: ServerMessagesRaw, callback: (client: Client, buffer: SocketData) => SocketRaw) {
        const promiseCallback = this.promiseCallback.get(value);
        //@ts-ignore
        if (promiseCallback === callback) {
            this.promiseCallback.delete(value);
        }
    }

    getClients() {
        return this.clients;
    }
    broadcastLog(type: Log["type"], name: string | Error, description?: string) {
        if (this.clients.length) {
            let str = "";
            let des = "";
            if (name instanceof Error) {
                str = name.name;
                des = name.stack;
            } else {
                str = name;
                des = description;
            }

            des = des ?? "";

            const binary = new BinaryBuffer(1 + utf8StringLen(type) + utf8StringLen(str) + utf8StringLen(des));
            binary.setUint8(ClientMessagesRaw.SocketLog);
            binary.setUtf8String(type);
            binary.setUtf8String(str);
            binary.setUtf8String(des);
            const raw = binary.getBuffer();
            for (const client of this.clients) {
                if (client.clientType === "browser-client") {
                    client.socket.send(raw);
                }
            }
        }
    }
}
