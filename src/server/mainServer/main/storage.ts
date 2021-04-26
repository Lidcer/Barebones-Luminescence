import { array, cloneDeep, getDayString } from "../../../shared/utils";
import { getStorage, setStorage, storageFolder } from "../../sharedFiles/settingsStore";
import { DoorLog, FetchableServerConfig, LedPattern, LedPatternItem, ServerSettings } from "../../../shared/interfaces";
import { WebSocket } from "../socket/Websocket";
import { hsv2rgb } from "../../../shared/colour";
import { Lights } from "../LightController/Devices/Controller";
import { MagicHomeController } from "../LightController/Devices/MagicHome";
import { DOOR_SENSOR, VERSION } from "./config";
import { exist, readJson, writeJson } from "../../sharedFiles/fileSystemUtils";

const fileName = "serverSettings.json";
const doorLog = "log.json";

const RainBowPatternDetail = 16;
const PATTERN_RAINBOW: LedPattern = {
  name: "Rainbow",
  ledPattern: array<LedPatternItem>(RainBowPatternDetail, i => {
    return { delay: 100, mode: "fade", rgb: hsv2rgb({ h: Math.round((i / RainBowPatternDetail) * 360), s: 1, v: 1 }) };
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

export function setupServerSocket(websocket: WebSocket, lights: Lights) {
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
      magicController: isMagicHome(),
      version: VERSION
    };
  });
  websocket.onPromise<DoorLog, []>("get-door-log", async client => {
    client.validateAuthentication();
    const logs = await readDoorLog();
    return logs;
  });
  websocket.onPromise<void, []>("clear-door-log", async client => {
    client.validateAuthentication();
    await clearDoorLog();
  });
}

export async function increaseDoor() {
  const date = new Date();
  const string = getDayString(date);
  
  const existingData = await readDoorLog();  
  if (!existingData[string]) {
    existingData[string] = 0;
  }
  existingData[string] += 1;

  const presenceOfFile = await exist([storageFolder, doorLog], "file");
  if (!presenceOfFile) {
    await writeJson([storageFolder, doorLog], JSON.stringify(existingData), true);
  }
}

export async function readDoorLog(): Promise<DoorLog> {
  const presenceOfFile = await exist([storageFolder, doorLog], "file");
  if (!presenceOfFile) {
    return {};
  }
  return readJson([storageFolder, doorLog])
}

export async function clearDoorLog() {
  const presenceOfFile = await exist([storageFolder, doorLog], "file");
  if (!presenceOfFile) {
    await writeJson([storageFolder, doorLog], JSON.stringify({}), true);
  }
}