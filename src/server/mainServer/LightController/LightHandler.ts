import { WebSocket } from "../socket/Websocket";
import { ControllerMode, RGB, SunSetApi } from "../../../shared/interfaces";
import { DAY, MINUTE, MODES, SECOND, SUNRISE_SUNSET_API, userClients } from "../../../shared/constants";
import { clamp, debounce, noop } from "lodash";
import { AudioProcessor } from "../../../shared/audioProcessor";
import { AudioAnalyser } from "../../../shared/audioAnalyser";
import { AutoPilot } from "./AutoPilot";
import { Lights } from "./Devices/Controller";
import { increaseDoor, saveSettings, settings } from "../main/storage";
import { sleep } from "../../../shared/utils";
import { isPastMidnight, dateMerger } from "../../../shared/timeUtils";
import axios, { AxiosResponse } from "axios";
import { ImageCapture } from "../main/ImageCapture";
import { DoorLog } from "../main/doorLog";

export function setupLightHandler(
    websocket: WebSocket,
    light: Lights,
    audioProcessor: AudioProcessor,
    doorLog: DoorLog,
) {
    const autoPilot = new AutoPilot(websocket);
    let doorFrameLoop: NodeJS.Timeout;
    const SERVER_FPS = SECOND * 0.05;
    let sunSetData: SunSetApi;
    const pollSunsetSunRise = async () => {
        const res = await axios.get<any, AxiosResponse<{ results: SunSetApi; status: string }>>(SUNRISE_SUNSET_API);
        if (
            typeof res.data === "object" &&
            !Array.isArray(res.data) &&
            res.data.status === "OK" &&
            typeof res.data.results === "object" &&
            !Array.isArray(res.data.results)
        ) {
            const validators = [
                "sunrise",
                "sunset",
                "solar_noon",
                "day_length",
                "civil_twilight_begin",
                "civil_twilight_end",
                "nautical_twilight_begin",
                "nautical_twilight_end",
                "astronomical_twilight_begin",
                "astronomical_twilight_end",
            ];
            for (const validater of validators) {
                if (typeof res.data.results[validater] !== "string") {
                    Logger.error(`API validation error ${validater} was not found`, res.data);
                }
            }
            sunSetData = res.data.results;
            Logger.info(`Sunrise ${sunSetData.sunrise} | Sunset ${sunSetData.sunset}`);
        } else {
            Logger.error(`API did not receive object from server`);
        }
    };
    setInterval(pollSunsetSunRise, DAY);
    setTimeout(pollSunsetSunRise, MINUTE * 10);
    pollSunsetSunRise().catch(noop);

    let lightMode: ControllerMode = settings.controllerMode;
    let lastMode: ControllerMode = lightMode;
    let timeout: NodeJS.Timeout;
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
            case "AutoPilot":
            case "Manual":
            case "Pattern":
            case "Audio":
            case "AudioRaw":
            case "ManualForce":
            case "ManualLocked":
                const diff = lightMode !== mode;
                lastMode = settings.controllerMode = lightMode = mode;
                websocket.broadcast("mode-update", lightMode);

                if (doorFrameLoop) {
                    clearTimeout(doorFrameLoop);
                    doorFrameLoop = undefined;
                }
                de.cancel();

                if (diff) {
                    await saveSettings();
                }
                return;
            default:
                throw new Error(`Mode ${mode} does not exist!`);
        }
    };

    websocket.on<[number, number, number]>("rgb-set", (client, red, green, blue) => {
        client.validateAuthentication();
        if (userClients.includes(client.clientType)) {
            if (lastMode !== "ManualForce" && lastMode !== "ManualLocked") {
                setMode("Manual");
            }
        } else {
            setMode("AudioRaw");
        }
        RGB.r = clamp(red, 0, 255);
        RGB.b = clamp(blue, 0, 255);
        RGB.g = clamp(green, 0, 255);
    });

    websocket.onPromise<void, [ControllerMode]>("mode-set", async (client, mode) => {
        client.validateAuthentication();
        setMode(mode);
    });
    websocket.onPromise<ControllerMode, []>("mode-get", async client => {
        client.validateAuthentication();
        return lightMode;
    });

    websocket.onPromise<RGB, []>("rgb-status", async client => {
        client.validateAuthentication();
        return RGB;
    });

    websocket.onSocketEvent("all-clients-disconnected", () => {
        const blockMods: ControllerMode[] = ["ManualForce", "ManualLocked", "AudioRaw", "Audio"];
        if (!blockMods.includes(lightMode)) {
            setMode("AutoPilot");
        }
    });

    const isStateChanged = () => {
        switch (lightMode) {
            case "Audio":
            case "AudioRaw":
                return true;
        }

        if (lightMode === "Door") {
            return false;
        }

        if (lightMode === "AutoPilot") {
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
        if (lightMode === "Audio") {
            const { r, b, g } = audioAnalyser.getRGB();
            const value = light.setIfPossible(r, g, b);
            if (value) {
                RGB.r = lastRGB.r = r;
                RGB.g = lastRGB.g = g;
                RGB.b = lastRGB.b = b;
                websocket.broadcast("rgb-update", RGB);
            }
            return;
        }
        lastRGB.r = RGB.r;
        lastRGB.g = RGB.g;
        lastRGB.b = RGB.b;
        await light.setRGB(RGB.r, RGB.g, RGB.b);
        websocket.broadcast("rgb-update", RGB);
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
            const next = lightMode === "Audio" || lightMode === "AudioRaw" ? 0 : SERVER_FPS - diff;
            timeout = setTimeout(tick, next);
        }
    };

    const updateModeAndLight = (rgb?: RGB) => {
        websocket.broadcast("mode-update", lightMode);
        websocket.broadcast("rgb-update", rgb || RGB);
    };

    let lastDoorState = false;
    light.on("door", async level => {
        if (lightMode === "ManualLocked") {
            return;
        }
        const date = new Date();

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
            websocket.broadcast("door-open");
            if (doorLog) {
                doorLog.log().then(() => {
                    websocket.broadcast("door-image-available");
                });
            }
        }
        lastDoorState = !!level;

        if (level) {
            increaseDoor();
            de.cancel();
            lightMode = "Door";
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
    if (light.connected) {
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
