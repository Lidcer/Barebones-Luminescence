import { ClientMessagesRaw, ServerMessagesRaw, SpecialEvents } from "../../../shared/Messages";
import { userClients } from "../../../shared/constants";
import { ClientType } from "../../../shared/interfaces";
import { noop } from "lodash";
import { MessageHandleBase, SocketRaw, Handle } from "../../../shared/messages/messageHandle";
import { Socket, WSEvent } from "../../sharedFiles/http-servers/http-srv-utils";

export class Client {
    private type: ClientType = "unknown";
    private _sendPCM = false;
    public serverMessageHandler: ServerMessageHandle;
    constructor(public socket: Socket, private getToken: (token: string) => ClientType) {
        const ip = this.remoteAddress;
        if (!ip) {
            throw new Error("Missing IP");
        }

        const token = new URL(this.socket.getData().url).searchParams.get("t");

        const clientType = this.getToken(token);
        if (!clientType) {
            throw new Error("Unauthorized");
        }
        this.type = clientType;

        const obj = createServerHandle(buffer => !!socket.send(buffer));
        this.serverMessageHandler = new ServerMessageHandle(obj, this);
        socket.on(WSEvent.Message, buffer => {
            obj.message(buffer);
        });
        socket.on(WSEvent.Disconnect, () => {
            obj.disconnect();
        });
        obj.connect();
    }
    disconnect(code?: number, reason?: string) {
        return this.socket.disconnect();
    }
    setAudioProcessor() {
        if (this.type !== "unknown") {
            throw new Error("client has already been set");
        }
        this.type = "audio-server";
    }
    // get id() {
    //     return this.socket.id;
    // }
    get connected() {
        return this.socket.connected;
    }
    get disconnected() {
        return this.socket.ws;
    }
    get remoteAddress() {
        return (this.socket.ws as any).remoteAddress || "<Unknown>";
    }
    validateAuthentication() {
        if (userClients.includes(this.clientType) || this.clientType === "audio-server") {
            return;
        }
        throw new Error("Unauthenticated");
    }
    get clientType() {
        return this.type;
    }
    set sendPCM(value: boolean) {
        this._sendPCM = value;
    }
    get sendPCM() {
        return this._sendPCM;
    }
}

export class ServerMessageHandle extends MessageHandleBase<
    ServerMessagesRaw | SpecialEvents,
    ClientMessagesRaw | SpecialEvents,
    Client
> {}

export function createServerHandle(
    send: (message: SocketRaw) => boolean,
): Handle<ServerMessagesRaw | SpecialEvents, ClientMessagesRaw | SpecialEvents> {
    return {
        connect: noop,
        disconnect: noop,
        message: noop,
        send,
    };
}
