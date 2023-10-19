import { ClientMessagesRaw, ServerMessagesRaw, SpecialEvents } from "../../../shared/Messages";
import { MINUTE, userClients } from "../../../shared/constants";
import { ClientType } from "../../../shared/interfaces";
import { Socket, WSEvent } from "../../sharedFiles/bun-server";
import { noop } from "lodash";
import { MessageHandleBase, SocketRaw, Handle } from "../../../shared/messages/messageHandle";
import { PASSWORD } from "../main/config";
import { BinaryBuffer, utf8StringLen } from "../../../shared/messages/BinaryBuffer";

const wrongPass = new Map<string, number>();


export class Client {
    private type: ClientType = "unknown";
    private _sendPCM = false;
    public serverMessageHandler: ServerMessageHandle
    constructor(public socket: Socket) {
        const obj = createServerHandle(buffer => !!socket.ws.sendBinary(buffer));
        this.serverMessageHandler = new ServerMessageHandle(obj, this);
        socket.on(WSEvent.Message, (_ws, buffer) => {
            obj.message(buffer);
        });
        socket.on(WSEvent.Disconnect, (_ws, buffer) => {
            obj.disconnect();
        });
        obj.connect()
    }

    auth() {
        
        const ip = this.remoteAddress;
        if (!ip) {
            this.socket.ws.close();
            return;
        }
        const auth = this.socket.ws.data.headers.authentication;
        const clientType = this.socket.ws.data.headers['client-type'];

        if (auth !== PASSWORD) {
            let count = wrongPass.get(ip) || 0;
            count++;
            if (count > 10) {
                count = 10;
            }
            if (count > 3) {
                const message = "Too many attempts. Self defending mode activated";
                const binary = new BinaryBuffer(2 + utf8StringLen(message))
                                .setUint8(ClientMessagesRaw.Login)
                                .setBool(false)
                                .setUtf8String(message)
                                .getBuffer();
                this.socket.send(binary)
   
            } else {
                const message = "Wrong password"
                const binary = new BinaryBuffer(2 + utf8StringLen(message))
                .setUint8(ClientMessagesRaw.Login)
                .setBool(false)
                .setUtf8String(message)
                .getBuffer();
                this.socket.send(binary)
            }
            this.socket.ws.close();
            wrongPass.set(ip, count);
            Logger.warn(ip, "Failed to connect!");
            return false;
        } else {
            this.type = clientType as any;
            const message = "Succeful";
            const binary = new BinaryBuffer(2 + utf8StringLen(message))
            .setUint8(ClientMessagesRaw.Login)
            .setBool(true)
            .setUtf8String(message)
            .getBuffer();
            this.socket.send(binary)
            Logger.log(ip, "Connected");
        }

        return true;
    }

    disconnect() {
        return this.socket.disonnect();
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
        return this.socket.ws.remoteAddress;
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

setTimeout(() => {
    wrongPass.forEach((value, key) => {
        value--;
        if (value === 0) {
            wrongPass.delete(key);
        }
    });
}, MINUTE);



export class ServerMessageHandle extends MessageHandleBase<ServerMessagesRaw | SpecialEvents, ClientMessagesRaw | SpecialEvents, Client> {

}

export function createServerHandle(send: (message: SocketRaw) => boolean): Handle<ServerMessagesRaw | SpecialEvents, ClientMessagesRaw | SpecialEvents> {
    return {
        connect: noop,
        disconnect: noop,
        message: noop,
        send,
    }
}
