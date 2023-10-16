import { array, cloneDeep, getDayString, removeFromArray } from "../../../shared/utils";
import { getStorage, setStorage, storageFolder } from "../../sharedFiles/settingsStore";
import {
    CameraImageLocation,
    ControllerMode,
    DoorLogData,
    FetchableServerConfig,
    LedPattern,
    LedPatternItem,
    ServerSettings,
    TokenData,
} from "../../../shared/interfaces";
import { WebSocket } from "../socket/Websocket";
import { hsv2rgb } from "../../../shared/colour";
import { Lights } from "../LightController/Devices/Controller";
import { MagicHomeController } from "../LightController/Devices/MagicHome";
import { CAM_INSTALLED, DOOR_SENSOR, VERSION } from "./config";
import { exist, readJson, writeJson } from "../../sharedFiles/fileSystemUtils";
import { DoorLog } from "./doorLog";
import { ImageCapture } from "./ImageCapture";
import { Tokenizer } from "./Tokenizer";

const fileName = "serverSettings.json";
const doorLog = "log.json";

const RainBowPatternDetail = 16;
const PATTERN_RAINBOW: LedPattern = {
    name: "Rainbow",
    ledPattern: array<LedPatternItem>(RainBowPatternDetail, i => {
        return {
            delay: 100,
            mode: "fade",
            rgb: hsv2rgb({ h: Math.round((i / RainBowPatternDetail) * 360), s: 1, v: 1 }),
        };
    }),
};

const defaultSettings: ServerSettings = {
    magicHome: {
        ips: [],
        blockedIp: [],
    },
    schedule: {
        Friday: {},
        Monday: {},
        Saturday: {},
        Sunday: {},
        Thursday: {},
        Tuesday: {},
        Wednesday: {},
        custom: {},
        mode: "fade",
    },
    controllerMode: "Manual",
    patterns: [PATTERN_RAINBOW],
};

export let settings = cloneDeep(defaultSettings);
let socket: WebSocket;

export async function initStorage() {
    const result = await getStorage(fileName, defaultSettings);
    settings = result;
}

export async function saveSettings() {
    await setStorage(fileName, settings);
    if (socket) {
        socket.broadcast("server-settings-update", settings);
    }
}

export function setupServerSocket(
    websocket: WebSocket,
    lights: Lights,
    imageTokenizer: Tokenizer<TokenData>,
    imageCapture: ImageCapture,
    doorLog: DoorLog,
    getMode: () => ControllerMode,
) {
    const isMagicHome = () => {
        return lights.getInstance() instanceof MagicHomeController;
    };
    socket = websocket;
    websocket.onPromise<ServerSettings, []>("server-settings-get", async client => {
        client.validateAuthentication();
        return settings;
    });
    websocket.onPromise<FetchableServerConfig, []>("server-config-get", async client => {
        client.validateAuthentication();
        return {
            doorSensor: DOOR_SENSOR,
            activeCamera: CAM_INSTALLED,
            magicController: isMagicHome(),
            version: VERSION,
            mode: getMode(),
        };
    });
    websocket.onPromise<DoorLogData, []>("get-door-log", async client => {
        client.validateAuthentication();
        const logs = await readDoorLog();
        return logs;
    });
    websocket.onPromise<void, []>("clear-door-log", async client => {
        client.validateAuthentication();
        await clearDoorLog();
    });

    if (CAM_INSTALLED) {
        websocket.onPromise<CameraImageLocation, []>("get-cam-data", async client => {
            client.validateAuthentication();
            const imagesS = await imageCapture.getImages();
            const id = client.id;
            const doorOpens = doorLog.getDoorRawLogs(id, imageTokenizer);
            const images = imagesS.map(img => imageCapture.convertToRaw(img, id, imageTokenizer));
            return {
                lastImage: imageCapture.last
                    ? imageCapture.convertToRaw(imageCapture.last, id, imageTokenizer)
                    : undefined,
                images,
                doorOpens,
            };
        });

        websocket.onPromise<boolean, []>("take-cam-image", async client => {
            client.validateAuthentication();
            try {
                await imageCapture.capture(() => {});
                return true;
            } catch (error) {
                Logger.error(error);
                return false;
            }
        });
    }
}

export async function increaseDoor() {
    const date = new Date();
    const string = getDayString(date);

    const existingData = await readDoorLog();

    if (!existingData[string]) {
        existingData[string] = 0;
    }
    existingData[string] += 1;
    await writeJson([storageFolder, doorLog], existingData, true);
}

export async function readDoorLog(): Promise<DoorLogData> {
    const presenceOfFile = await exist([storageFolder, doorLog], "file");
    if (!presenceOfFile) {
        return {};
    }
    return readJson([storageFolder, doorLog]);
}

export async function clearDoorLog() {
    await writeJson([storageFolder, doorLog], {}, true);
}
