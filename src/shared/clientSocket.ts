//mport { Socket } from "socket.io-client";
import { SECOND } from "./constants";
import { Logger } from "./logger";
import { createSocketError, SocketError } from "./socketError";
import { pushUniqToArray, removeFromArray } from "./utils";

type EventCallbackFunction = (...args: any[]) => void;
type EventPromiseCallbackFunction = (...args: [any]) => Promise<any>;

export class ClientSocket {
  private callbacks = new Map<string, EventCallbackFunction[]>();
  private promiseCallback = new Map<string, EventPromiseCallbackFunction>();
  constructor(private socket: any /* */) {}

  handlePacket = async (...args: any) => {
    const value = args[0];
    const len = args.length;
    const callback = args[len - 1];
    const promise = typeof callback === "function";
    if (promise) {
      const promise = this.promiseCallback.get(value);
      if (promise === undefined) {
        Logger.debug("WARNING", `Promise value "${value}" does not exit!`);
        callback(undefined, createSocketError("Unknown value", undefined));
        return;
      }
      const filteredArgs = args.slice(1, args.length - 1);
      try {
        const result = await promise.apply(this, filteredArgs);
        callback(result);
      } catch (error) {
        const message = (error && error.message) || "Unknown error";
        const stack = error && error.stack;
        callback(undefined, createSocketError(message, stack));
        Logger.debug("Socket promise error", error);
      }
    } else {
      const callbacks = this.callbacks.get(value);
      if (!callbacks) {
        Logger.debug("WARNING", `Value "${value}" does not exit!`);
        return;
      }
      const filteredArgs = args.slice(1, args.length);
      for (const callback of callbacks) {
        callback.apply(this, filteredArgs);
      }
    }
  };

  on<T extends any[]>(event: string, fn: (...args: T) => void) {
    const fns = this.callbacks.get(event) || [];
    pushUniqToArray(fns, fn);
    this.callbacks.set(event, fns);
    this.socket.on(event, (...args) => this.handlePacket.apply(this, [event, ...args]));
  }
  off(event: string, fn: EventCallbackFunction) {
    const fns = this.callbacks.get(event) || [];
    removeFromArray(fns, fn);
    if (!fns.length) {
      this.socket.off(event);
    }
  }

  emit<T extends any[]>(value: string, ...args: T) {
    this.socket.emit.apply(this.socket, [value, ...args]);
  }

  onPromise<A, T extends any[]>(event: string, fn: (...args: T) => Promise<A>) {
    if (!(fn instanceof (async () => {}).constructor)) {
      throw new Error("Promise callback expected");
    }
    const fns = this.promiseCallback.get(event);
    if (fns) throw new Error(`value ${event} already exist!`);
    this.socket.on(event, (...args) => this.handlePacket.apply(this, [event, ...args]));
    this.promiseCallback.set(event, fn as any);
  }

  offPromise(event: string) {
    this.promiseCallback.delete(event);
  }

  emitPromise<R, T extends any[]>(value: string, ...args: T) {
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
          return resolve(value);
        }
      };
      const emitArgs = [value, ...args, fun];
      this.socket.emit.apply(this.socket, emitArgs);
    });
  }

  get connected() {
    return this.socket.connected;
  }

  destroy() {
    for (const [key, fns] of this.callbacks) {
      for (const fn of fns) {
        this.socket.off(key, fn);
      }
    }
    this.callbacks.clear();
  }
}
