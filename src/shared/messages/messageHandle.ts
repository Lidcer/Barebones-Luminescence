import { SpecialEvents } from "../Messages";
import { EventEmitter, EventEmitterSingle } from "../eventEmitter";
import { Deffered } from "../interfaces";
import { Logger } from "../logger";
import { deffer } from "../utils";
import { BinaryBuffer, getLength, utf8StringLen } from "./BinaryBuffer";

export type SocketData = BinaryBuffer;
export type SocketRaw = Uint8Array;

const emptyMessage = new Uint8Array();

export class Handle<A, B> {
    send: (message: SocketRaw) => boolean;
    message: (message: SocketData) => void;
    connect: () => void;
    disconnect: () => void;
}

export class MessageHandleBase<A, B, C> {
    protected events = new EventEmitter();
    protected promiseEvents = new EventEmitterSingle();
    protected deffered = new Map<number, Deffered>();
    protected messageId = 0;

    constructor(private handle: Handle<A, B>, public client: C) {
        handle.connect = this.onConnect;
        handle.disconnect = this.onDisconnect;
        handle.message = this.onMessage;
    }
    on(key: A, cb: (data: SocketData, ref: C) => void) {
        this.events.on(key, cb);
    }
    onPromise(key: A, cb: (buffer: SocketData, ref: C) => void) {
        this.promiseEvents.on(key, cb);
    }
    off(key: A, cb: (buffer: SocketData, ref: C) => void) {
        this.events.off(key, cb);
    }
    offPromise(key: A) {
        this.promiseEvents.off(key);
    }

    protected onConnect = () => {
        return this.events.emit(SpecialEvents.Connect, null, this.client);
    };
    protected onDisconnect = () => {
        this.deffered.forEach(value => value.reject(new Error("Disconnected")));
        this.deffered.clear();
        return this.events.emit(SpecialEvents.Disconnect, null, this.client);
    };
    protected onMessage = async (reader: SocketData) => {
        const type = reader.getUint8();

        switch (type) {
            case SpecialEvents.Promise: {
                const promiseType = reader.getUint8();
                const messageId = reader.getUint32LE();
                const bufferObj = new BinaryBuffer(reader.getRestOfTheBuffer());
                try {
                    const data = (await this.promiseEvents.emit(promiseType, bufferObj, this.client)) as Uint8Array;
                    const buff = new Uint8Array(5 + data.byteLength);
                    const buffer = new BinaryBuffer(buff);
                    buffer.setUint32LE(messageId);
                    buffer.setBytes(data);
                    this.send(SpecialEvents.PromiseResolve as any, buffer.getBuffer());
                } catch (error) {
                    Logger.debug(error);
                    const errorEncoded = new SocketError(error.message).toBuffer();
                    const buff = new Uint8Array(5 + errorEncoded.byteLength);
                    const buffer = new BinaryBuffer(buff);
                    buffer.setUint32LE(messageId);
                    buffer.setBytes(errorEncoded);
                    this.send(SpecialEvents.PromiseError as any, buffer.getBuffer());
                }
                return true;
            }
            case SpecialEvents.PromiseResolve: {
                const messageId = reader.getUint32LE();
                const data = this.deffered.get(messageId);
                this.deffered.delete(messageId);
                if (data) {
                    data.resolve(reader);
                }
                return true;
            }
            case SpecialEvents.PromiseError: {
                const messageId = reader.getUint32LE();
                const data = this.deffered.get(messageId);
                this.deffered.delete(messageId);
                if (data) {
                    console.log(reader["view"]);
                    const res = SocketError.fromBuffer(reader);
                    data.reject(res);
                }
                return true;
            }
            default:
                const count = this.events.emit(type, reader, this.client);
                return !!count;
        }
    };

    sendPromise(type: number, message: SocketRaw = emptyMessage): Promise<SocketData> {
        const deffered = deffer();
        const id = this.messageId++;
        this.deffered.set(id, deffered);
        const buffer = new BinaryBuffer(message.byteLength + 1 + 1 + 4);
        buffer.setUint8(SpecialEvents.Promise);
        buffer.setUint8(type);
        buffer.setUint32LE(id);
        buffer.setBytes(message);
        this.handle.send(buffer.getBuffer());
        return deffered.promise;
    }

    send(type: number, message: SocketRaw = emptyMessage) {
        const buffer = new Uint8Array(message.byteLength + 1);
        buffer.set(message, 1);
        buffer[0] = type;
        return this.handle.send(buffer);
    }
}

class SocketError extends Error {
    constructor(message: string) {
        super(message);
    }

    static fromBuffer(reader: BinaryBuffer) {
        const error = new SocketError(reader.getUtf8String());
        //error.stack = reader.getUtf8String();
        return error;
    }

    static fromU8Array(arr: Uint8Array) {
        return SocketError.fromBuffer(new BinaryBuffer(arr));
    }

    toBuffer() {
        // const stack = this.stack
        //     .split("\n")
        //     .map(line => {
        //         const regMatch = line.match(/(\([A-z-//:\.0-9]+)\)/);
        //         if (regMatch && regMatch[0]) {
        //             const data = regMatch[0].slice(1, regMatch[0].length - 1);
        //             line = line.replace(regMatch[0], `(/${data.split("/").pop()})`).trim();
        //         }

        //         return line;
        //     })
        //     .join("\n");

        return (
            new BinaryBuffer(utf8StringLen(this.message) /* + utf8StringLen(stack)*/)
                .setUtf8String(this.message)
                //.setUtf8String(stack)
                .getBuffer()
        );
    }
}
