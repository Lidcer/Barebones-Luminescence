//mport { Socket } from "socket.io-client";
import { noop } from "lodash";
import { ClientMessagesRaw, SpecialEvents, ServerMessagesRaw } from "./Messages";
import { SECOND } from "./constants";
import { Logger } from "./logger";
import { MessageHandleBase, SocketRaw, Handle } from "./messages/messageHandle";
import { createSocketError, SocketError } from "./socketError";
import { pushUniqToArray, removeFromArray } from "./utils";
import { BinaryBuffer } from "./messages/BinaryBuffer";

type EventCallbackFunction = (...args: any[]) => void;
type EventPromiseCallbackFunction = (...args: [any]) => Promise<any>;

export class ClientSocket {
    private socket?: WebSocket;
    handle = createClientHandle(buffer => false)
    clientHandle = new ClientMessageHandle(this.handle, this);
    constructor() {


    }


    private onOpen = (_event: Event) => {
        this.handle.connect();
    };
    private onClose = (_event: CloseEvent) => {
        this.handle.disconnect();
    };
    private onMessage = (event: MessageEvent<any>) => {
        const data = event.data as ArrayBuffer | string;
        if (typeof data === "string") {
            console.error("Recived string!", data);
        } else {
            const buffer = new BinaryBuffer(new Uint8Array(data));
            this.handle.message(buffer);
        }
    };
    private onError = (event: Event) => {
        console.log(event)
    };

    createSocket(url: string) {
        const urlObj = new URL(url);
        const prefix = urlObj.protocol.startsWith("https") ? "wss" : "ws";
        const socketUrl = `${prefix}://${urlObj.host}/`;
    
        const socket = new WebSocket(socketUrl);
        socket.binaryType = "arraybuffer";
        socket.addEventListener("open", (event) => {
            this.socket = socket;
            this.handle.send = (message) => {
                this.socket.send(message);
                return true;
            }
            this.handle.connect();
    
        });
        socket.addEventListener("message", this.onMessage);
        socket.addEventListener("error", this.onError);
        socket.addEventListener("close", event => {
            this.handle.disconnect();
            this.socket = undefined;
        });
    }
    disconnect() {
        if(this.socket) {
            this.socket.close();
        }
        this.socket = undefined;
        this.handle = undefined;
        this.clientHandle = undefined;
    }
    get connected() {
        console.log(!!this.socket)
        return !!this.socket;
    }

}



export class ClientMessageHandle extends MessageHandleBase<ClientMessagesRaw | SpecialEvents, ServerMessagesRaw | SpecialEvents, ClientSocket> {


}
export function createClientHandle(send: (message: SocketRaw) => boolean): Handle<ClientMessagesRaw | SpecialEvents, ServerMessagesRaw | SpecialEvents> {
    return {
        connect: noop,
        disconnect: noop,
        message: noop,
        send,
    }
}

