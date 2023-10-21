import { array, cloneDeep, getDayString, quickBuffer, removeFromArray } from "../../../shared/utils";
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
import { ClientMessagesRaw, ServerMessagesRaw } from "../../../shared/Messages";
import { BinaryBuffer, utf8StringLen } from "../../../shared/messages/BinaryBuffer";

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
    controllerMode: ControllerMode.Manual,
    patterns: [PATTERN_RAINBOW],
};

export let settings = cloneDeep(defaultSettings);
let socket: WebSocket;

export async function initStorage() {
    const result = await getStorage(fileName, defaultSettings);
    settings = result;
}

export async function saveSettings(emit: boolean) {
    await setStorage(fileName, settings);
    const json = JSON.stringify(settings);
    if (socket && emit) {
        socket.broadcast(
            ClientMessagesRaw.SettingsUpdate,
            new BinaryBuffer(utf8StringLen(json)).setUtf8String(json).getBuffer(),
        );
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
    websocket.onPromise(ServerMessagesRaw.Settings, async (_, client) => {
        client.validateAuthentication();
        return quickBuffer(settings);
    });
    websocket.onPromise(ServerMessagesRaw.Config, async (_, client) => {
        client.validateAuthentication();
        const binary = new BinaryBuffer(4 + utf8StringLen(VERSION));
        return binary
            .setUint8(getMode())
            .setBool(DOOR_SENSOR)
            .setBool(CAM_INSTALLED)
            .setBool(isMagicHome())
            .setUtf8String(VERSION)
            .getBuffer();
    });
    websocket.onPromise(ServerMessagesRaw.DoorLog, async (_, client) => {
        client.validateAuthentication();
        return quickBuffer(await readDoorLog());
    });
    websocket.onPromise(ServerMessagesRaw.DoorClear, async (_, client) => {
        client.validateAuthentication();
        await clearDoorLog();
        return new Uint8Array();
    });

    if (CAM_INSTALLED) {
        websocket.onPromise(ServerMessagesRaw.CamGet, async (_, client) => {
            client.validateAuthentication();
            const imagesS = await imageCapture.getImages();
            const doorOpens = doorLog.getDoorRawLogs(imageTokenizer);
            const images = imagesS.map(img => imageCapture.convertToRaw(img, imageTokenizer));
            const data = {
                lastImage: imageCapture.last ? imageCapture.convertToRaw(imageCapture.last, imageTokenizer) : undefined,
                images,
                doorOpens,
            };

            return quickBuffer(data);
        });

        websocket.onPromise(ServerMessagesRaw.CamTake, async (_, client) => {
            client.validateAuthentication();
            try {
                await imageCapture.capture(() => {});
                return new BinaryBuffer(1).setBool(true).getBuffer();
            } catch (error) {
                Logger.error(error);
                return new BinaryBuffer(1).setBool(false).getBuffer();
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
