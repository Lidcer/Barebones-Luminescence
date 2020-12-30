import { SECOND } from "../../../shared/constants";
import SocketIO from "socket.io";
import { SocketError } from "../../../shared/socketError";

type ClientType = "unknown" | "client" | "audio-server";
export class Client {
  private type: ClientType = "unknown";
  private _sendPCM = false;

  constructor(private client: SocketIO.Socket) {}

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
  setClient() {
    if (this.type !== "unknown") {
      throw new Error("client has already been set");
    }
    this.type = "client";
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
    if (this.clientType === "client") {
      return;
    } else if (this.clientType === "audio-server") {
      Logger.error("Audio server should never ask for authentication!");
      throw new Error("Audio server cannot be authenticated");
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
