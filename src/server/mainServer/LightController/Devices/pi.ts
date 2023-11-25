import { LightController } from "./Controller";
import { RGB } from "../../../../shared/interfaces";
import { PI_PORT, SECRET } from "../../main/config";
import { EventEmitter } from "events";
//import { Worker } from "worker_threads";
import path from "path";
import { WebSocket } from "ws";

export interface WorkerData {
    type: "init" | "set-rgb" | "rgb-done";
    r: number;
    g: number;
    b: number;
}

export class PIController implements LightController {
    private readonly RED = 17;
    private readonly GREEN = 27;
    private readonly BLUE = 22;
    private readonly DOOR_PIN = 16;
    private readonly connectionUrl = `http://localhost:${PI_PORT}`;
    private queueLimit = 10;
    private sendingData = false;
    private queue: RGB[] = [];
    private eventEmitter = new EventEmitter();
    private _connected = false;
    private websocket: WebSocket | undefined;

    constructor() {
        Logger.info("Starting connection");
        this.socketCreate();
        // const bun = typeof require === "function" && require.prototype;
        // if (bun) {
        //     //@ts-ignore
        //     //const workerURL = new URL("../../../piServer/index.ts", import.meta.url).href;
        //     //this.worker = new Worker(workerURL);
        // } else {
        // }
        const workerPath = path.join(process.cwd(), "dist", "server", "piServer", "index.js");
        // this.worker = new Worker(workerPath);
        // this.worker.postMessage([0, this.RED, this.GREEN, this.BLUE, this.DOOR_PIN]);
        this.eventEmitter.emit("connect");
        // this.worker.on("message", event => {
        //     const [level, tick] = event.data;
        //     this.eventEmitter.emit("door", level, tick);
        // });
        this.tick();
        // this.worker.addEventListener("message", event => {
        //     const [level, tick] = event.data;
        //     this.eventEmitter.emit("door", level, tick);
        // });
        // this.socket = io(this.connectionUrl, { auth: { token: PASSWORD } });
        // this.socket.on("connect", () => {
        //     this.socket.emit("init", this.RED, this.GREEN, this.BLUE, this.DOOR_PIN, (error: StringifiedError) => {
        //         if (error) {
        //             const actualError = new Error(error.message);
        //             actualError.stack = error.stack;
        //             console.error(actualError);
        //             process.exit(1);
        //         }
        //         this._connected = true;
        //         this.tick();
        //         this.eventEmitter.emit("connect");
        //         Logger.info("Connected");
        //     });
        //     this.socket.on("door", (level: number, tick: number) => {
        //         this.eventEmitter.emit("door", level, tick);
        //     });
        //     this.socket.on("disconnect", () => {
        //         this._connected = false;
        //         this.eventEmitter.emit("disconnect");
        //     });
        // });
    }

    socketCreate() {
        return new Promise<void>(resolve => {
            const websocket = new WebSocket(`ws://localhost:${PI_PORT}?secret=${SECRET}`); 
            websocket.addEventListener("open", () => {
                this.websocket = websocket;
                websocket.send(new Uint8Array([0, this.RED, this.GREEN, this.BLUE, this.DOOR_PIN]));
                resolve();
                Logger.info("Connected to PI");
            })
            websocket.addEventListener("message", (message) => {
                const buff = new Uint8Array(message.data as Buffer);
                this.eventEmitter.emit("door", buff[0], buff[1]);
            });
    
            websocket.addEventListener("error", error =>{
                // if (DEV) {
                //     console.error(error.);
                // }
            })
    
            websocket.addEventListener("close", () => {
                this.websocket = undefined
                this.socketCreate();
            })
        })
    }

    off(value: "disconnect", callback: () => void): void;
    off(value: "connect", callback: () => void): void;
    off(value: "door", callback: (level: number, tick: number) => void): void;
    off(value: string, callback: (...args: any) => void) {
        this.eventEmitter.off(value, callback);
    }
    on(value: "disconnect", callback: () => void): void;
    on(value: "connect", callback: () => void): void;
    on(value: "door", callback: (level: number, tick: number) => void): void;
    on(value: string, callback: (...args: any) => void) {
        this.eventEmitter.on(value, callback);
    }

    async setRGB(red: number, green: number, blue: number): Promise<void> {
        while (this.queue.length > this.queueLimit) {
            this.queue.pop();
        }
        this.queue.push({ r: Math.round(red), g: Math.round(green), b: Math.round(blue) });
    }
    setIfPossible(red: number, green: number, blue: number): boolean {
        if (this.queue.length) {
            this.queue[0] = { r: Math.round(red), g: Math.round(green), b: Math.round(blue) };
            return true;
        }

        if (this.sendingData) {
            return false;
        }
        this.queue.push({ r: Math.round(red), g: Math.round(green), b: Math.round(blue) });
        return true;
    }

    private tick = async () => {
        if (this.queue.length && this.websocket) {
            const { r, g, b } = this.queue.pop();
            try {
                this.websocket.send(new Uint8Array([1, r, g, b, this.DOOR_PIN]));
            } catch (error) {
                Logger.error(error);
            }
        }
        setTimeout(this.tick, 0);
    };

    get connected() {
        return this._connected;
    }
}
