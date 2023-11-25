import { Server } from "bun";
import * as ipAddr from "ipaddr.js";
import wcmatch from "wildcard-match";
import { BinaryBuffer } from "../../../shared/messages/BinaryBuffer";
import {
    EndpointDefinition,
    Handler,
    KeyIndex,
    RequestObject,
    ResponseMerge,
    Socket,
    SocketEmitter,
    WSData,
    WSEvent,
    WSUws,
    empty,
} from "./http-srv-utils";
import { App, HttpResponse, HttpRequest, TemplatedApp, DISABLED } from "uWebSockets.js";

function getRemoteAddress(res: HttpResponse) {
    const exist = [
        Buffer.from(res.getProxiedRemoteAddressAsText()).toString(),
        Buffer.from(res.getRemoteAddressAsText()).toString(),
        "::ffff:127.0.0.1",
    ].find(i => i) as string;
    return ipAddr.process(exist).toString();
}

export function getIP(res: HttpResponse, req: HttpRequest) {
    return req.getHeader("cf-connecting-ip") || getRemoteAddress(res);
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

type RequestUws = RequestObject<HttpRequest, TemplatedApp>;
function getFullUrl(request: HttpRequest) {
    return `http://localhost/${request.getUrl()}/?${request.getQuery()}`;
}
export function createUWSServer(port: number) {
    const endpoints: EndpointDefinition[] = [];
    const sockets = new Map<WSUws, Socket>();
    const socketEmitter = new SocketEmitter();
    const app = App();

    app.ws("/", {
        compression: DISABLED,
        upgrade(res, req, context) {
            const headers = {};
            req.forEach((key, value) => {
                headers[key.toLowerCase()] = value;
            });
            const updateRequest = {
                url: getFullUrl(req),
                headers,
            };
            res.upgrade(
                updateRequest,
                req.getHeader("sec-websocket-key"),
                req.getHeader("sec-websocket-protocol"),
                req.getHeader("sec-websocket-extensions"),
                context,
            );
        },
        open(ws: WSUws) {
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
                    const buffer = new BinaryBuffer(new Uint8Array(message));
                    socket.emit(WSEvent.Message, buffer, socket);
                }
            }
        },
        close(ws, code, reason) {
            Logger.debug("Socket closed", code, reason);
            const socket = sockets.get(ws);
            if (socket) {
                const text = new TextDecoder();
                socket._destroy(code, text.decode(reason));
                socket.emit(WSEvent.Disconnect, socket);
            }
            sockets.delete(ws);
            socketEmitter.emit(WSEvent.Disconnect, socket);
        },
    });

    app.any("/*", async (res, request) => {
        const url = new URL(getFullUrl(request));

        const cleanedUrl = url.pathname
            .split("/")
            .filter(e => e)
            .join("/");

        let textRequestReading: string | undefined;
        let readingRequest: Buffer | undefined;
        let live = true;
        res.onAborted(() => {
            live = false;
        });
        const readText = (): Promise<string> => {
            if (readingRequest) throw new Error("readText is not allowed to be called more than once!");
            return new Promise((resolve, reject) => {
                if (live) {
                    res.onData((arrayBuffer, isLast) => {
                        const chunk = Buffer.from(arrayBuffer);
                        if (isLast) {
                            if (readingRequest) {
                                readingRequest = Buffer.concat([readingRequest, chunk]);
                            } else {
                                readingRequest = Buffer.concat([chunk]);
                            }
                            textRequestReading = readingRequest.toString();
                            resolve(textRequestReading);
                        } else {
                            if (readingRequest) {
                                readingRequest = Buffer.concat([readingRequest, chunk]);
                            } else {
                                readingRequest = Buffer.concat([chunk]);
                            }
                        }
                    });
                } else {
                    throw new Error("Cannot read data on dead request");
                }
            });
        };
        const readJson = async <R>() => {
            if (textRequestReading) {
                return JSON.parse(textRequestReading) as R;
            } else {
                const data = await readText();
                return JSON.parse(data) as R;
            }
        };

        const req: RequestUws = {
            originalRequest: request,
            json: readJson,
            server: app,
            params: empty,
            query: urlToQuery(url),
            ip: getRemoteAddress(res),
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
        let ret: Response;
        for (const endpoint of endpoints) {
            if ((endpoint.method === "use" || endpoint.method === endpoint.method) && endpoint.match(cleanedUrl)) {
                const res = await endpoint.handler({ ...req, params: urlToParam(url, endpoint.paramsParser) }, resMer);

                if (res) {
                    ret = res;
                    break;
                } else if (endpoint.method === endpoint.method) {
                    ret = new Response(`Cannot get ${getFullUrl(request)}`, { status: 404 });
                    break;
                }
            }
        }
        ret = ret || new Response(`Cannot get ${getFullUrl(request)}`, { status: 500 });
        for (const [name, value] of ret.headers) {
            res.writeHeader(name, value);
        }
        res.writeStatus(ret.status.toString());

        const responseText = await ret.arrayBuffer();
        res.end(responseText, true);
    });
    app.listen(port, token => {
        if (token) {
            Logger.info(`Listening on ${port}`);
        } else {
            Logger.info(`Failed to listen to ${port}`);
        }
    });

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
