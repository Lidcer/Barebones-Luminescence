import { LightController } from "./Controller";
import { RGB } from "../../../../shared/interfaces";
import { PI_PORT } from "../../main/config";
import { StringifiedError } from "../../../sharedFiles/error";
import { EventEmitter } from "events";

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

    constructor() {
        Logger.info("Starting connection");
        const workerURL = new URL("../../../piServer/index.ts", import.meta.url).href;
        const worker = new Worker(workerURL);
        console.log(worker);
        worker.postMessage([0, this.RED, this.GREEN, this.BLUE, this.DOOR_PIN]);
        this.eventEmitter.emit("connect");
        worker.addEventListener("message", event => {
            const [level, tick] = event.data;
            this.eventEmitter.emit("door", level, tick);
        });
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
        if (this.queue.length) {
            const { r, g, b } = this.queue.pop();
            try {
                await this.setRgb(r, g, b);
            } catch (error) {
                Logger.error(error);
            }
        }
        setTimeout(this.tick, 0);
    };

    private setRgb(r: number, g: number, b: number) {
        return new Promise<void>((resolve, reject) => {
            this.socket.emit("set-rgb", r, g, b, (error?: StringifiedError) => {
                if (error) {
                    const actualError = new Error(error.message);
                    actualError.stack = error.stack;
                    reject(actualError);
                } else {
                    resolve();
                }
            });
        });
    }
    get connected() {
        return this._connected;
    }
}
