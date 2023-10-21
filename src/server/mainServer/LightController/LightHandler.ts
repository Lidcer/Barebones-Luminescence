import { WebSocket } from "../socket/Websocket";
import { ControllerMode, RGB, SunSetApi } from "../../../shared/interfaces";
import { DAY, MINUTE, MODES, SECOND, SUNRISE_SUNSET_API, userClients } from "../../../shared/constants";
import { clamp, debounce, noop } from "lodash";
import { AudioProcessor } from "../../../shared/audioProcessor";
import { AudioAnalyser } from "../../../shared/audioAnalyser";
import { AutoPilot } from "./AutoPilot";
import { Lights } from "./Devices/Controller";
import { increaseDoor, saveSettings, settings } from "../main/storage";
import { quickBuffer, sleep } from "../../../shared/utils";
import { isPastMidnight, dateMerger } from "../../../shared/timeUtils";
import { DoorLog } from "../main/doorLog";
import { getSunsetSunriseData } from "./SunsetSunrise";
import { ClientMessagesRaw, ServerMessages, ServerMessagesRaw } from "../../../shared/Messages";
import { BinaryBuffer } from "../../../shared/messages/BinaryBuffer";

export function setupLightHandler(
    websocket: WebSocket,
    light: Lights,
    audioProcessor: AudioProcessor,
    doorLog: DoorLog,
) {
    const autoPilot = new AutoPilot(websocket);
    let doorFrameLoop: Timer;
    const SERVER_FPS = SECOND * 0.05;

    let lightMode: ControllerMode = settings.controllerMode;
    let lastMode: ControllerMode = lightMode;
    let timeout: Timer;
    const RGB: RGB = {
        r: 0,
        b: 0,
        g: 0,
    };
    const lastRGB: RGB = {
        r: 255,
        b: 255,
        g: 255,
    };
    const audioAnalyser = new AudioAnalyser(audioProcessor);

    const de = debounce<(color: number[]) => void>(async (color: number[]) => {
        if (doorFrameLoop) {
            clearInterval(doorFrameLoop);
            doorFrameLoop = undefined;
        }

        let r = color[0];
        let g = color[1];
        let b = color[2];

        doorFrameLoop = setInterval(() => {
            if (r > RGB.r) r--;
            if (g > RGB.g) g--;
            if (b > RGB.b) b--;

            if (r === RGB.r && b === RGB.b && b === RGB.b) {
                lightMode = lastMode;
                clearInterval(doorFrameLoop);
                doorFrameLoop = undefined;
            }

            light.setRGB(r, g, b);
            updateModeAndLight({ r: RGB.r, g: RGB.g, b: RGB.b });
        }, 100);
    }, SECOND * 10);

    const setMode = async (mode: ControllerMode) => {
        switch (mode) {
            case ControllerMode.AutoPilot:
            case ControllerMode.Manual:
            case ControllerMode.Pattern:
            case ControllerMode.Audio:
            case ControllerMode.AudioRaw:
            case ControllerMode.ManualForce:
            case ControllerMode.ManualLocked:
                const diff = lightMode !== mode;
                lastMode = settings.controllerMode = lightMode = mode;
                if (diff) {
                    websocket.broadcast(ClientMessagesRaw.ModeUpdate, quickBuffer(lightMode));
                }

                if (doorFrameLoop) {
                    clearTimeout(doorFrameLoop);
                    doorFrameLoop = undefined;
                }
                de.cancel();

                if (diff) {
                    await saveSettings(false);
                }
                return;
            default:
                throw new Error(`Mode ${mode} does not exist!`);
        }
    };

    websocket.on(ServerMessagesRaw.RGBSet, (buffer, client) => {
        client.validateAuthentication();
        if (userClients.includes(client.clientType)) {
            if (lastMode !== ControllerMode.ManualForce && lastMode !== ControllerMode.ManualLocked) {
                setMode(ControllerMode.Manual);
            }
        } else {
            setMode(ControllerMode.AudioRaw);
        }
        RGB.r = clamp(buffer.getUint8(), 0, 255);
        RGB.g = clamp(buffer.getUint8(), 0, 255);
        RGB.b = clamp(buffer.getUint8(), 0, 255);
    });

    websocket.onPromise(ServerMessagesRaw.ModeSet, async (buffer, client) => {
        client.validateAuthentication();
        const mode = buffer.getUint8();
        setMode(mode);
        return new Uint8Array(0);
    });
    websocket.onPromise(ServerMessagesRaw.ModeGet, async (_, client) => {
        client.validateAuthentication();
        const arr = new Uint8Array(1);
        arr[0] = lightMode;
        return arr;
    });

    websocket.onPromise(ServerMessagesRaw.RGBGet, async (_, client) => {
        client.validateAuthentication();
        const buffer = new BinaryBuffer(3);
        buffer.setUint8(RGB.r);
        buffer.setUint8(RGB.g);
        buffer.setUint8(RGB.b);
        return buffer.getBuffer();
    });

    websocket.onSocketEvent("all-clients-disconnected", () => {
        const blockMods: ControllerMode[] = [
            ControllerMode.ManualForce,
            ControllerMode.ManualLocked,
            ControllerMode.AudioRaw,
            ControllerMode.Audio,
        ];
        if (!blockMods.includes(lightMode)) {
            setMode(ControllerMode.AutoPilot);
        }
    });

    const isStateChanged = () => {
        switch (lightMode) {
            case ControllerMode.Audio:
            case ControllerMode.AudioRaw:
                return true;
        }

        if (lightMode === ControllerMode.Door) {
            return false;
        }

        if (lightMode === ControllerMode.AutoPilot) {
            const { r, g, b } = autoPilot.scheduler.state;
            RGB.r = r;
            RGB.b = b;
            RGB.g = g;
        }

        const red = RGB.r === lastRGB.r;
        const blue = RGB.b === lastRGB.b;
        const green = RGB.g === lastRGB.g;
        return !(red && blue && green);
    };

    const changeState = async () => {
        if (lightMode === ControllerMode.Audio) {
            const { r, b, g } = audioAnalyser.getRGB();
            const value = light.setIfPossible(r, g, b);
            if (value) {
                RGB.r = lastRGB.r = r;
                RGB.g = lastRGB.g = g;
                RGB.b = lastRGB.b = b;
                const data = new BinaryBuffer(3).setUint8(r).setUint8(g).setUint8(b).getBuffer();
                websocket.broadcast(ClientMessagesRaw.RGBUpdate, data);
            }
            return;
        }
        lastRGB.r = RGB.r;
        lastRGB.g = RGB.g;
        lastRGB.b = RGB.b;
        await light.setRGB(RGB.r, RGB.g, RGB.b);
        const data = new BinaryBuffer(3).setUint8(RGB.r).setUint8(RGB.g).setUint8(RGB.b).getBuffer();
        websocket.broadcast(ClientMessagesRaw.RGBUpdate, data);
    };

    const tick = async () => {
        const now = Date.now();
        if (isStateChanged()) {
            await changeState();
        }

        const dateEnd = Date.now();
        const diff = dateEnd - now;

        if (diff > SERVER_FPS) {
            Logger.debug("Server is lagging!");
            timeout = setTimeout(tick, 0);
        } else {
            const next =
                lightMode === ControllerMode.Audio || lightMode === ControllerMode.AudioRaw ? 0 : SERVER_FPS - diff;
            timeout = setTimeout(tick, next);
        }
    };

    const updateModeAndLight = (rgb?: RGB) => {
        rgb = rgb || RGB;
        websocket.broadcast(
            ClientMessagesRaw.RGBUpdate,
            new BinaryBuffer(3).setUint8(RGB.r).setUint8(RGB.g).setUint8(RGB.b).getBuffer(),
        );
    };

    let lastDoorState = false;
    light.on("door", async level => {
        if (lightMode === ControllerMode.ManualLocked) {
            return;
        }
        const date = new Date();
        const sunSetData = getSunsetSunriseData();

        let instantOff = false;
        const greenish = 64;
        const color = [255, 255, 255]; //RGB
        if (isPastMidnight(date)) {
            color[0] = color[2] = 0;
            color[1] = greenish;
            instantOff = true;
            if (sunSetData) {
                const compare = dateMerger(sunSetData.sunrise); // end of the night
                if (date < compare) {
                    color[1] = color[2] = 0;
                    color[0] = 255; // red
                    instantOff = false;
                }
            }
        } else {
            if (sunSetData) {
                const compare = dateMerger(sunSetData.sunset); // start of the night
                if (date < compare) {
                    instantOff = true;
                    color[0] = color[2] = 0;
                    color[1] = greenish;
                }
            }
        }

        if (doorFrameLoop) {
            clearTimeout(doorFrameLoop);
            doorFrameLoop = undefined;
        }

        if (lastDoorState !== !!level && level) {
            websocket.broadcast(ClientMessagesRaw.DoorOpen, new Uint8Array(0));
            if (doorLog) {
                doorLog.log().then(() => {
                    websocket.broadcast(ClientMessagesRaw.DoorImageAvailable, new Uint8Array(0));
                });
            }
        }
        lastDoorState = !!level;

        if (level) {
            increaseDoor();
            de.cancel();
            lightMode = ControllerMode.Door;
            await light.setRGB(color[0], color[1], color[2]);
            updateModeAndLight({ r: color[0], g: color[1], b: color[2] });
        } else {
            if (instantOff) {
                de.cancel();
                await light.setRGB(0, 0, 0);
                updateModeAndLight({ r: 0, g: 0, b: 0 });
            } else {
                de(color);
                updateModeAndLight({ r: color[0], g: color[1], b: color[2] });
            }
        }
    });

    const destroy = () => {
        clearTimeout(timeout);
    };

    const onConnect = async () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        await sleep(SECOND * 0.5);
        await light.setRGB(255, 0, 0);
        await sleep(SECOND * 0.5);
        await light.setRGB(0, 255, 0);
        await sleep(SECOND * 0.5);
        await light.setRGB(0, 0, 255);
        await sleep(SECOND * 0.5);
        await light.setRGB(0, 0, 0);
        await sleep(SECOND * 0.5);
        await light.setRGB(RGB.r, RGB.g, RGB.b);
        tick();
    };
    if (light.connected || DEV) {
        onConnect();
    }
    light.on("connect", () => {
        onConnect();
    });
    light.on("disconnect", () => {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
    });

    return {
        destroy,
        getMode: () => {
            return lightMode;
        },
    };
}
