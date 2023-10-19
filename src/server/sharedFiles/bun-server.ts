import { Server, ServerWebSocket } from "bun";
import { Emitter, EventEmitter } from "../../shared/eventEmitter"; 
import { ServerMessagesRaw, SpecialEvents } from "../../shared/Messages";
import * as ipAddr from "ipaddr.js";
import wcmatch from 'wildcard-match'

//const isMatch = wcmatch('src/**/*.?s')
export enum WSEvent {
    Message,
    Connect,
    Disconnect,
}


const empty = {};

interface WSData {
    headers: {
        [key: string]: string;
    }
}

export type WS = ServerWebSocket<WSData>;
interface RequestObject {
    originalRequest: Request;
    server: Server;
    params: any;
    query: any;
    ip: string;
}

interface ResponseMerge {
    status?: number;
    headers: HeadersInit;
    statusText?: string;
    create: (body?: BodyInit, init?: ResponseInit) => Response;
}

type N = void | null | undefined
type Handler = (request: RequestObject, response: ResponseMerge) => Response | Promise<Response> | N | Promise<N>;
export type BunServer = ReturnType<typeof createServer>; 

interface EndpointDefenition {
    url: string;
    paramsParser: KeyIndex[];
    match: (str: string) => boolean;
    method: string;
    handler: Handler;
}
interface KeyIndex {
    key: string;
    index: number;
}

export function getRemoteAddress(request: Request, server: Server) {
    const exist =  [
        server.requestIP(request).address,
        "::ffff:127.0.0.1"
    ].find(i => i) as string;
    return ipAddr.process(exist).toString();
}

export function getIP(request: Request, server: Server) {
    return request.headers["cf-connecting-ip"] || getRemoteAddress(request, server);
}

function urlToQuery(url: URL) {
    const obj = {};
    url.searchParams.forEach((v,k) => obj[k] = v);
    return obj
}

function urlToParam(url: URL, keyValue: KeyIndex[]) {
    const pathname = url.pathname.split("/").filter(e => e)
    const obj = {};
    for (const { index,key } of keyValue) {
        obj[key] = pathname[index];
    }
    return obj
}

export function createServer(port: number) {
    const endpoints: EndpointDefenition[] = [];
    const sockets = new Map<ServerWebSocket<WSData>, Socket>()
    const socketEmitter = new SocketEmitter(); 
    Bun.serve({
        port,
        fetch: async (request, server) => {
            const success = server.upgrade(request);
            if (success) {
                console.log(request);
                return undefined;
            }

            const url = new URL(request.url);
            
            const cleanedUrl = url.pathname.split("/").filter(e => e).join('/');
            const req: RequestObject = {
                originalRequest: request,
                server,
                params: empty,
                query: urlToQuery(url),
                ip: getRemoteAddress(request, server)
            }
            const resMer: ResponseMerge = {
                headers: {},
                create: (body, init) => {
                    return new Response(body, {...init,
                        status: resMer.status ?? init.status,
                        statusText: resMer.statusText ?? init.statusText,
                        headers: {...init.headers, ...resMer.headers}})
                }
                
            }
            for (const endpoint of endpoints) {
                if ((endpoint.method === "use" || endpoint.method === endpoint.method) && endpoint.match(cleanedUrl)) {
                    const res = await endpoint.handler({...req, params: urlToParam(url, endpoint.paramsParser)}, resMer);
                    
                    if (res) {
                        return res;
                    } else if (endpoint.method === endpoint.method) {
                        return new Response(`Cannot get ${request.url}`, { status: 404 });
                    }
                }
            }
            return new Response(`Cannot get ${request.url}`, { status: 500 });
        },
        websocket: {
            open(ws: WS) {
                ws.data = {
                    headers:{}
                }
                const socket = new Socket(ws);
                sockets.set(ws, socket);
                socketEmitter.emit(WSEvent.Connect, socket);
            },
            message(ws, message) {
                if (typeof message === "string") {
                    ws.close();
                } else {
                    const socket = sockets.get(ws);
                    if (socket) {
                        const u8Arr = new Uint8Array(message.buffer);
                        socket.emit(WSEvent.Message, socket, u8Arr);
                    }
                }
            },
            close(ws, code, reason) {
                const socket = sockets.get(ws);
                if (socket) {
                    socket._destory(code, reason);
                }
                sockets.delete(ws);
            },
        }
    });

    Logger.info(`Listening on ${port}`);
    const addMethod = (method: string, url: string, handler: Handler) => {
        const split = url.split("/").filter(e => e);
        const cleanedUrl = split.join('/');
        const params = cleanedUrl.match(/(:\w*-*\d*)/g)
        let match = cleanedUrl;
        let paramsParser: KeyIndex[] = []
        if (params) {
            for (const param of params) {
                paramsParser.push({key: param.substring(1), index: split.indexOf(param)}),
                match = match.replace(param, "*");
            }
        }

        endpoints.push({
            handler,
            paramsParser,
            match: wcmatch(match),
            method,
            url
        });
    }

    return {
        use: (handler: Handler) => {
            addMethod("use", "**", handler);
        },
        get: (url: string, handler: Handler) => {
            addMethod("get", url, handler);
        },
        post: (url: string, handler: Handler) => {
            addMethod("post", url, handler);
        },
        socketEmitter
    }
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
    constructor(public ws: WS) {
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
    disonnect(code?: number, reason?: string) {
        if (!this._destroyed) {
            this.ws.close(code, reason);
        }
    }
    _destory(code: number, reason: string) {
        this._destroyed = true;
    }
    send(u8Array: Uint8Array) {
        return this.ws.sendBinary(u8Array);
    }
    get connected() {
        return !this._destroyed;
    }
}

