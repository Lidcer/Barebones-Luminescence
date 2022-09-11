import { EventEmitter } from "events";
import { clamp } from "lodash";
import { MAGIC_HOME_CONTROLLER } from "../../main/config";
import { MagicHomeController } from "./MagicHome";
import { PIController } from "./pi";

export interface LightController {
    setRGB(red: number, green: number, blue: number): Promise<void>;
    setIfPossible(red: number, green: number, blue: number): boolean;
    door?(open: boolean): void;
}

export class Lights implements LightController {
    private readonly MAX_RBG_VALUE = 255;
    private readonly MIN_RBG_VALUE = 0;
    private ledController: LightController;
    private red = 0;
    private green = 0;
    private blue = 0;
    private eventEmitter = new EventEmitter();

    constructor() {
        if (MAGIC_HOME_CONTROLLER) {
            Logger.info("Light Controller", "Using Magic home api");
            this.ledController = new MagicHomeController();
            this.eventEmitter.emit("connect");
        } else {
            Logger.info("Light Controller", "Using pi api");
            const piController = (this.ledController = new PIController());
            piController.on("disconnect", () => this.eventEmitter.emit("disconnect"));
            piController.on("connect", () => this.eventEmitter.emit("connect"));
            piController.on("door", (level, tick) => this.eventEmitter.emit("door", level, tick));

            if (DEV) {
                (global as any).Light = this;
                (global as any).openDoor = () => {
                    this.eventEmitter.emit("door", 1, Date.now());
                };
                (global as any).closeDoor = () => {
                    this.eventEmitter.emit("door", 0, Date.now());
                };

                (global as any).door = () => {
                    this.eventEmitter.emit("door", 1, Date.now());
                    setTimeout(() => {
                        this.eventEmitter.emit("door", 0, Date.now());
                    }, 1000);
                };
            }
        }
    }
    setRGB(red: number, green: number, blue: number): Promise<void> {
        if (this.red === red && this.green === green && this.blue === blue) {
            return;
        }

        this.red = red = clamp(red, this.MIN_RBG_VALUE, this.MAX_RBG_VALUE);
        this.green = green = clamp(green, this.MIN_RBG_VALUE, this.MAX_RBG_VALUE);
        this.blue = blue = clamp(blue, this.MIN_RBG_VALUE, this.MAX_RBG_VALUE);
        return this.ledController.setRGB(red, green, blue);
    }
    setIfPossible(red: number, green: number, blue: number): boolean {
        return this.ledController.setIfPossible(red, green, blue);
    }
    setRed(red: number) {
        return this.ledController.setRGB(red, this.green, this.blue);
    }
    setGreen(green: number) {
        return this.ledController.setRGB(this.red, green, this.blue);
    }
    setBlue(blue: number) {
        return this.ledController.setRGB(this.red, this.green, blue);
    }
    getInstance() {
        return this.ledController;
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
    get connected() {
        const value = (this.ledController as PIController).connected;
        if (value === undefined) {
            return true;
        }
        return value;
    }
}
