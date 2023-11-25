import { default as isPi } from "detect-rpi";
import { Gpio } from "pigpio";
import { EventEmitter } from "events";
import { App, WebSocket, DISABLED } from 'uWebSockets.js';
import path from 'path';
import fs from 'fs';

const webSockets: WebSocket<unknown>[] = [];

interface IConfig {
    PI_PORT: number,
    SECRET: string,
};

const app = App();
const configJsonPath = path.join(process.cwd(), "config.json");
const rawConfigJson = fs.readFileSync(configJsonPath).toString();
const config = JSON.parse(rawConfigJson) as IConfig;

let GpioObj: any;
(() => {
    if (isPi()) {
        GpioObj = require("pigpio").Gpio;
    } else {
        console.warn("This devices is not raspberrypi! Using mock mode.");
        const mockLag = 100;

        GpioObj = class {
            private pin: number;
            private event = new EventEmitter();
            private mockInput = 0;
            constructor(pin: number, output: any) {
                if (output?.mode === GpioObj.INPUT) {
                    let time = Date.now();
                    const e = () => {
                        const timeNow = Date.now();
                        const delta = timeNow - time;
                        time = timeNow;
                        this.mockInput = this.mockInput ? 0 : 1;
                        this.event.emit("alert", this.mockInput, delta);
                        //setTimeout(() => e(), random(1000, 2000)); // random door open
                    };
                    //@ts-ignore
                    (global as any).door = (value: number) => {
                        this.mockInput = value;
                        e();
                    };
                    e();
                }
                const mode = output?.mode;
                this.pin = pin;
                console.log(`Using pin ${pin} with ${mode}`);
            }

            pwmWrite(number: number) {
                if (number.toString().includes(".")) {
                    throw new Error("Invalid argument!");
                }

                let now = Date.now();
                let counter = 0;
                const max = mockLag;
                while (counter < max) {
                    const newNow = Date.now();
                    counter += newNow - now;
                    now = newNow;
                }
                console.log(`Wrote ${this.pin} with ${number}`);
            }
            glitchFilter(number: number) {
                console.log(`glitchFilter set: ${number}`);
            }
            on(value: string, callback: () => void) {
                this.event.on(value, callback);
            }
            static get OUTPUT() {
                return "output";
            }
            static get INPUT() {
                return "input";
            }
        };
    }
})();

//const app = express();
// const server = app.listen(PI_PORT, () => {
//     Logger.info(`PI listening on port ${PI_PORT}!`);
// });

//const socket = new SocketIO.Server(server);

let initialized = false;
let redLed: Gpio;
let greenLed: Gpio;
let blueLed: Gpio;
let doorSwitch: Gpio;
let lastRed = 0;
let lastGreen = 0;
let lastBlue = 0;



const initialize = (red: number, green: number, blue: number, doorSwitchPin: number | undefined) => {
    if (initialized) return;

    initialized = true;
    redLed = new GpioObj(red, { mode: GpioObj.OUTPUT });
    greenLed = new GpioObj(green, { mode: GpioObj.OUTPUT });
    blueLed = new GpioObj(blue, { mode: GpioObj.OUTPUT });
    if (doorSwitchPin !== undefined) {
        doorSwitch = new GpioObj(doorSwitchPin, {
            mode: GpioObj.INPUT,
            pullUpDown: GpioObj.PUD_UP,
            alert: true,
        });
        doorSwitch.glitchFilter(1000);
        doorSwitch.on("alert", (level, tick) => {
            for (const ws of webSockets) {
                ws.send(new Uint8Array([level, tick]), true);
            }
        });
    }
    (global as any).DEV && Logger.info("Pi server Loaded");
};
function setRgb(red: number, green: number, blue: number) {
    if (lastRed !== red) {
        redLed.pwmWrite(red);
        lastRed = red;
    }
    if (lastBlue !== blue) {
        blueLed.pwmWrite(blue);
        lastBlue = blue;
    }
    if (lastGreen !== green) {
        greenLed.pwmWrite(green);
        lastGreen = green;
    }
}



app.ws("/*", {
    compression: DISABLED,
    upgrade(res, req, context) {
        const secret = new URLSearchParams(req.getQuery()).get("secret");
        if (secret === config.SECRET) {
            res.upgrade({},
              req.getHeader('sec-websocket-key'),
              req.getHeader('sec-websocket-protocol'),
              req.getHeader('sec-websocket-extensions'),
              context);
        } else {
            res.writeStatus("401");
            res.end();
        }
    },
    open(ws) {
        webSockets.push(ws);
        console.log("Connected");
    },

    message(ws, message) {
        const data = new Uint8Array(message);
        
        switch (data[0]) {
        case 0:
            initialize(data[1], data[2], data[3], data[4]);
            break;
        case 1:
            setRgb(data[1], data[2], data[3]);
            break;
        }
    },
    close(ws) {
        const index = webSockets.indexOf(ws);
        if (index !== -1) {
            webSockets.splice(index, 1);
        }
        console.log("Disconnected");
    }
})

app.listen(config.PI_PORT, token => {
    if (token) {
        console.log(`Listening to ${config.PI_PORT}`);
    } else {
        console.error("Failed to listen");
    }
})

// parentPort.addListener("message", (data: number[]) => {
//     switch (data[0]) {
//         case 0:
//             initialize(data[1], data[2], data[3], data[4]);
//             break;
//         case 1:
//             setRgb(data[1], data[2], data[3]);
//             break;
//     }
// });

// socket.on("connection", (c: SocketIO.Socket) => {
//     if (client) {
//         console.error("Client exist");
//         c.disconnect();
//     }
//     const auth = c.handshake.auth as any;
//     if (!auth || !auth.token) {
//         console.error("Token not provided");
//         c.disconnect();
//         return;
//     }
//     if (typeof auth.token === "string" && auth.token === PASSWORD) {
//         client = c;

//         client.on("disconnect", () => {
//             client = undefined;
//         });

//         client.on(
//             "init",
//             (
//                 red: number,
//                 green: number,
//                 blue: number,
//                 doorPin: number,
//                 callback: (error?: StringifiedError) => void,
//             ) => {
//                 try {
//                     initialize(red, green, blue, doorPin);
//                     callback();
//                 } catch (error) {
//                     callback(stringifyError(error));
//                 }
//             },
//         );

//         client.on(
//             "set-rgb",
//             (red: number, green: number, blue: number, callback: (error?: StringifiedError) => void) => {
//                 try {
//                     setRgb(red, green, blue);
//                     callback();
//                 } catch (error) {
//                     callback(stringifyError(error));
//                 }
//             },
//         );
//         return;
//     }
//     c.disconnect();
//     console.error("disconnected");
// });
