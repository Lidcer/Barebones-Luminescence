import { Server } from "bun";
import * as ipAddr from "ipaddr.js";
import wcmatch from "wildcard-match";
import {
    Socket,
    WSBun,
    WSEvent,
    SocketEmitter,
    EndpointDefinition,
    WSData,
    KeyIndex,
    ResponseMerge,
    empty,
    Handler,
    RequestObject,
} from "./http-srv-utils";
import { BinaryBuffer } from "../../../shared/messages/BinaryBuffer";

//const isMatch = wcmatch('src/**/*.?s')

export function getRemoteAddress(request: Request, server: Server) {
    const exist = [server.requestIP(request).address, "::ffff:127.0.0.1"].find(i => i) as string;
    return ipAddr.process(exist).toString();
}

export function getIP(request: Request, server: Server) {
    return request.headers["cf-connecting-ip"] || getRemoteAddress(request, server);
}

function urlToQuery(url: URL) {
    const obj = {};
    url.searchParams.forEach((v, k) => (obj[k] = v));
    return obj;
}

function urlToParam(url: URL, keyValue: KeyIndex[]) {
    const pathname = url.pathname.split("/").filter(e => e);
    const obj = {};
    for (const { index, key } of keyValue) {
        obj[key] = pathname[index];
    }
    return obj;
}

export function createBunServer(port: number) {
    const endpoints: EndpointDefinition[] = [];
    const sockets = new Map<WSBun, Socket>();
    const socketEmitter = new SocketEmitter();
    let updateRequest: WSData;
    Bun.serve({
        port,
        fetch: async (request, server) => {
            const upgrade =
                request.headers.get("Upgrade") === "websocket" || request.headers.get("upgrade") === "websocket";

            if (upgrade) {
                const headers = {};
                Array.from(request.headers).forEach(e => (headers[e[0]] = e[1]));
                updateRequest = {
                    url: request.url,
                    headers,
                };
                const success = server.upgrade(request);
                if (!success) {
                    Logger.error("Websocket upgrade failed");
                }
                return undefined;
            }

            const url = new URL(request.url);

            const cleanedUrl = url.pathname
                .split("/")
                .filter(e => e)
                .join("/");
            const req: RequestObject<Request, Server> = {
                originalRequest: request,
                server,
                json: request.json,
                params: empty,
                query: urlToQuery(url),
                ip: getRemoteAddress(request, server),
            };
            const resMer: ResponseMerge = {
                headers: {},
                create: (body, init) => {
                    return new Response(body, {
                        ...init,
                        status: resMer.status ?? init.status,
                        statusText: resMer.statusText ?? init.statusText,
                        headers: { ...init.headers, ...resMer.headers },
                    });
                },
            };
            for (const endpoint of endpoints) {
                if ((endpoint.method === "use" || endpoint.method === endpoint.method) && endpoint.match(cleanedUrl)) {
                    const res = await endpoint.handler(
                        { ...req, params: urlToParam(url, endpoint.paramsParser) },
                        resMer,
                    );

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
            open(ws: WSBun) {
                if (!updateRequest) {
                    Logger.warn("Update request missing");
                    ws.close();
                    return;
                }
                ws.data = updateRequest;
                updateRequest = undefined;
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
                        const buffer = new BinaryBuffer(new Uint8Array(message.buffer));
                        socket.emit(WSEvent.Message, buffer, socket);
                    }
                }
            },
            close(ws, code, reason) {
                Logger.debug("Socket closed", code, reason);
                const socket = sockets.get(ws);
                if (socket) {
                    socket._destroy(code, reason);
                    socket.emit(WSEvent.Disconnect, socket);
                }
                sockets.delete(ws);
                socketEmitter.emit(WSEvent.Disconnect, socket);
            },
        },
    });

    Logger.info(`Listening on ${port}`);
    const addMethod = (method: string, url: string, handler: Handler) => {
        const split = url.split("/").filter(e => e);
        const cleanedUrl = split.join("/");
        const params = cleanedUrl.match(/(:\w*-*\d*)/g);
        let match = cleanedUrl;
        const paramsParser: KeyIndex[] = [];
        if (params) {
            for (const param of params) {
                paramsParser.push({ key: param.substring(1), index: split.indexOf(param) }),
                    (match = match.replace(param, "*"));
            }
        }

        endpoints.push({
            handler,
            paramsParser,
            match: wcmatch(match),
            method,
            url,
        });
    };

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
        socketEmitter,
    };
}
