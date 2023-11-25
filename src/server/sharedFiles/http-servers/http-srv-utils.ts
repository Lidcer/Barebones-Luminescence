import { Emitter, EventEmitter } from "../../../shared/eventEmitter";
import { ServerWebSocket } from "bun";
import { WebSocket } from "uWebSockets.js";
export enum WSEvent {
    Message,
    Connect,
    Disconnect,
}

export const empty = {};

export interface WSData {
    url: string;
    headers: {
        [key: string]: string;
    };
}
export type WSUws = WebSocket<WSData>;
export type WSBun = ServerWebSocket<WSData>;
export interface RequestObject<R = any, S = any> {
    originalRequest: R;
    json<T = any>(): Promise<T> | T;
    server: S;
    params: any;
    query: any;
    ip: string;
}

export interface ResponseMerge {
    status?: number;
    headers: HeadersInit;
    statusText?: string;
    create: (body?: BodyInit, init?: ResponseInit) => Response;
}

export type N = void | null | undefined;
export type Handler<S = any> = (
    request: RequestObject<S>,
    response: ResponseMerge,
) => Response | Promise<Response> | N | Promise<N>;
export interface HttpServer {
    use: (handler: Handler) => void;
    get: (url: string, handler: Handler) => void;
    post: (url: string, handler: Handler) => void;
    socketEmitter: SocketEmitter;
}

export interface EndpointDefinition {
    url: string;
    paramsParser: KeyIndex[];
    match: (str: string) => boolean;
    method: string;
    handler: Handler;
}
export interface KeyIndex {
    key: string;
    index: number;
}

export class SocketEmitter extends EventEmitter {
    on(key: WSEvent.Connect, cb: (ws: Socket) => void): void;
    on(key: WSEvent.Disconnect, cb: (ws: Socket) => void): void;
    on(key: WSEvent.Message, cb: (ws: Socket, message: Uint8Array) => void): void;
    on(key: WSEvent, cb: any) {
        super.on(key, cb);
    }

    off(key: WSEvent.Connect, cb: (ws: Socket) => void): void;
    off(key: WSEvent.Disconnect, cb: (ws: Socket) => void): void;
    off(key: WSEvent.Message, cb: (ws: Socket, message: Uint8Array) => void): void;
    off(key: WSEvent, cb: any) {
        super.off(key, cb);
    }

    emit(key: WSEvent.Connect, ws: Socket): number;
    emit(key: WSEvent.Disconnect, ws: Socket): number;
    emit(key: WSEvent.Message, ws: Socket, message: Uint8Array): number;
    emit(key: WSEvent, ...args: any[]) {
        return super.emit(key, ...args);
    }
}

export class Socket extends EventEmitter {
    private _destroyed = false;
    constructor(public ws: WSBun | WSUws) {
        super();
    }
    on(key: WSEvent, handle: Emitter) {
        super.on(key, handle);
    }
    off(key: WSEvent, handle: Emitter) {
        super.off(key, handle);
    }
    emit(key: WSEvent, ...args: any[]) {
        return super.emit(key, ...args);
    }
    disconnect(code?: number, reason?: string) {
        if (!this._destroyed) {
            this.ws.close(code, reason);
        }
    }
    _destroy(code: number, reason: string) {
        this._destroyed = true;
    }
    getData(): WSData {
        if ("getUserData" in this.ws) {
            return this.ws.getUserData();
        } else {
            return this.ws.data;
        }
    }

    send(u8Array: Uint8Array) {
        if ("sendBinary" in this.ws) {
            return this.ws.sendBinary(u8Array);
        } else {
            return this.ws.send(u8Array, true);
        }
    }
    get connected() {
        return !this._destroyed;
    }
}
