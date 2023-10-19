import { SpecialEvents } from "../Messages";
import { EventEmitter, EventEmitterSingle } from "../eventEmitter";
import { Deffered } from "../interfaces";
import { deffer } from "../utils";
import { BinaryBuffer, utf8StringLen } from "./BinaryBuffer";

export type SocketData = BinaryBuffer;
export type SocketRaw = Uint8Array;

const emptyMessage = new Uint8Array();

export class Handle<A,B> {
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
    public client: C;

    constructor(private handle: Handle<A, B>, client: C) {
        handle.connect = this.onConnect;
        handle.disconnect = this.onDisconnect;
        handle.message = this.onMessage;
    }
    on(key: A, cb: (ref: C, data: SocketData) =>void) {
        this.events.on(key, cb);
    }
    onPromise(key: A, cb: (ref: C, buffer: SocketData) =>void) {
        this.promiseEvents.on(key, cb);
    }
    off(key: A, cb: (ref: C, buffer: SocketData) =>void) {
        this.events.off(key, cb);
    }
    offPromise(key: A) {
        this.promiseEvents.off(key);
    }

    protected onConnect = () => {
        this.events.emit(SpecialEvents.Connect);
    }
    protected onDisconnect = () => {
        this.events.emit(SpecialEvents.Disconnect);
        this.deffered.forEach(value => value.reject(new Error("Disonnected")));
        this.deffered.clear();
    }
    protected onMessage = async (reader: SocketData) => {
        const type = reader.getUint8();

        switch (type) {
            case SpecialEvents.Promise: {
                const promiseType = reader.getUint8();
                const messageId = reader.getUint8();
                const bufferObj = new BinaryBuffer(reader.getU8Arr());
                try {
                    const data = await this.promiseEvents.emit(promiseType, bufferObj) as Uint8Array;
                    const buff = new Uint8Array(5 + data.byteLength);
                    const buffer = new BinaryBuffer(buff);
                    buffer.setUint32LE(messageId);
                    buffer.setBytes(data);
                    this.send(SpecialEvents.PromiseResolve as any, buffer.getBuffer());    
                } catch (error) {
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
                const promiseType = reader.getUint8() as A;
                const messageId = reader.getUint8();
                const data = this.deffered.get(messageId);
                this.deffered.delete(messageId);
                if (data) {
                    const res = this.onPromiseData(promiseType, reader);
                    data.resolve(res);
                }
                return true;
            }
            case SpecialEvents.PromiseError: {
                /*const promiseType = */reader.getUint8() as A;
                const messageId = reader.getUint8();
                const data = this.deffered.get(messageId);
                this.deffered.delete(messageId);
                if (data) {
                    const res = SocketError.fromBuffer(reader);
                    data.reject(res);
                }
                return true;
            }
            default:
                const count = this.events.emit(type, reader);
                return !!count;
        }
    }

    onPromiseData(type: A, data: SocketData) {
        return null;
    }

    sendPromise(type: number, message: SocketRaw = emptyMessage) {
        const deffered = deffer();
        const id = this.messageId++;
        this.deffered.set(id, deffered);
        const buffer = new BinaryBuffer(message.byteLength + 1 + 4)
        buffer.setUint8(type);
        buffer.setUint32LE(this.messageId);
        buffer.setU8Arr(message);
        this.handle.send(buffer.getU8Arr());
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
        return new SocketError(reader.getUtf8String());
    }

    static fromU8Array(arr: Uint8Array) {
        return SocketError.fromBuffer(new BinaryBuffer(arr));
    }

    toBuffer() {
        const writer = new BinaryBuffer(utf8StringLen(this.message));
        return writer.getBuffer();
    }
}
