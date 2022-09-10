import { SECOND, userClients } from "../../../shared/constants";
import SocketIO from "socket.io";
import { SocketError } from "../../../shared/socketError";
import { ClientType, LoginData, SocketAuth } from "../../../shared/interfaces";
import { PASSWORD } from "../main/config";

export class Client {
    private type: ClientType = "unknown";
    private _sendPCM = false;

    constructor(private client: SocketIO.Socket) {}

    auth() {
        const auth = this.client.handshake.auth as SocketAuth;
        if (auth.password !== PASSWORD) {
            console.error("wrong pass rejecting");
            this.client.emit("connection-login", { status: "failed", message: "wrong password" } as LoginData);
            this.client.disconnect();
            return false;
        } else {
            this.type = auth.clientType;
            this.client.emit("connection-login", { status: "ok" } as LoginData);
        }

        return true;
    }

    onAny(listener: (...args: any[]) => void) {
        this.client.onAny(listener);
        return this;
    }

    on(event: string, listener: (...args: any[]) => void) {
        this.client.on(event, listener);
        return this;
    }
    emit(event: string, ...args: any[]) {
        return this.client.emit.apply(this.client, [event, ...args]);
    }
    emitPromise<R = any>(value: string, ...args: any[]) {
        return new Promise<R>(async (resolve, reject) => {
            const rejectTimeout = setTimeout(() => {
                reject(new Error("Connection timed out"));
            }, SECOND * 5);

            const fun = (value?: R, error?: SocketError) => {
                clearTimeout(rejectTimeout);
                if (error) {
                    const objectError = new Error(error.message);
                    if (error.stack) {
                        objectError.stack = error.stack;
                    }
                    return reject(objectError);
                } else {
                    resolve(value);
                }
            };
            const emitArgs = [value, ...args, fun];
            this.client.emit.apply(this.client, emitArgs);
        });
    }
    disconnect() {
        return this.client.disconnect();
    }
    setAudioProcessor() {
        if (this.type !== "unknown") {
            throw new Error("client has already been set");
        }
        this.type = "audio-server";
    }
    get id() {
        return this.client.id;
    }
    get connected() {
        return this.client.connected;
    }
    get disconnected() {
        return this.client.disconnected;
    }
    get remoteAddress() {
        return this.client.conn.remoteAddress;
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
