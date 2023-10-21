import { noop } from "lodash";
import { ClientMessagesRaw, SpecialEvents, ServerMessagesRaw } from "./Messages";
import { Logger } from "./logger";
import { MessageHandleBase, SocketRaw, Handle } from "./messages/messageHandle";
import { BinaryBuffer } from "./messages/BinaryBuffer";
import { post } from "../shared/post";

export class ClientSocket {
    private socket?: WebSocket;
    handle = createClientHandle(buffer => false);
    clientHandle = new ClientMessageHandle(this.handle, this);
    constructor() {}

    private onOpen = (_event: Event) => {
        this.handle.connect();
    };
    private onClose = (_event: CloseEvent) => {
        this.handle.disconnect();
    };
    private onMessage = (event: MessageEvent<any>) => {
        const data = event.data as ArrayBuffer | string;
        if (typeof data === "string") {
            console.error("Received string!", data);
        } else {
            const buffer = new BinaryBuffer(new Uint8Array(data));
            this.handle.message(buffer);
        }
    };
    private onError = (event: Event) => {
        console.log(event);
    };

    async createSocket(url: string, password: string) {
        if (this.socket) return;

        const res = await post("/api/v1/request-token", { clientType: "browser-client", password });
        const urlObj = new URL(url);
        const prefix = urlObj.protocol.startsWith("https") ? "wss" : "ws";
        const socketUrl = `${prefix}://${urlObj.host}/?t=${res.data.token}`;

        const socket = new WebSocket(socketUrl);
        socket.binaryType = "arraybuffer";
        socket.addEventListener("open", event => {
            this.socket = socket;
            this.handle.send = message => {
                this.socket.send(message);
                return true;
            };
            this.onOpen(event);
        });
        socket.addEventListener("message", this.onMessage);
        socket.addEventListener("error", this.onError);
        socket.addEventListener("close", event => {
            Logger.info("Socket Closed");
            this.socket = undefined;
            this.onClose(event);
        });
    }
    disconnect(code?: number, reason?: string) {
        if (this.socket) {
            this.socket.close(code, reason);
        }
        this.socket = undefined;
        this.handle = undefined;
        this.clientHandle = undefined;
    }
    get connected() {
        return !!this.socket;
    }
}

export class ClientMessageHandle extends MessageHandleBase<
    ClientMessagesRaw | SpecialEvents,
    ServerMessagesRaw | SpecialEvents,
    ClientSocket
> {}
export function createClientHandle(
    send: (message: SocketRaw) => boolean,
): Handle<ClientMessagesRaw | SpecialEvents, ServerMessagesRaw | SpecialEvents> {
    return {
        connect: noop,
        disconnect: noop,
        message: noop,
        send,
    };
}
