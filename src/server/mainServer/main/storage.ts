import { array, cloneDeep } from "../../../shared/utils";
import { getStorage, setStorage } from "../../sharedFiles/settingsStore";
import { LedPattern, LedPatternItem, ServerSettings } from "../../../shared/interfaces";
import { WebSocket } from "../socket/Websocket";
import { hsv2rgb } from "../../../shared/colour";

const fileName = "serverSettings.json";

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

export function setupServerSocket(websocket: WebSocket) {
  socket = websocket;
  websocket.onPromise<ServerSettings, []>("server-settings-get", async client => {
    client.validateAuthentication();
    return settings;
  });
  // websocket.onPromise<boolean, [ServerSettings]>("server-settings-get", async (client, newSettings) => {
  //   client.validateAuthentication();
  //   settings = newSettings;
  //   await saveSettings();
  //   return settings;
  // });
}
