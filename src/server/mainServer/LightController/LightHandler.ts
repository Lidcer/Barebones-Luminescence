import { WebSocket } from "../socket/Websocket";
import { ControllerMode, RGB } from "../../../shared/interfaces";
import { SECOND } from "../../../shared/constants";
import { clamp } from "lodash";
import { AudioProcessor } from "../../../shared/audioProcessor";
import { AudioAnalyser } from "../../../shared/audioAnalyser";
import { AutoPilot } from "./AutoPilot";
import { Lights } from "./Devices/Controller";
import { saveSettings, settings } from "../main/storage";
import { setStorage } from "../../sharedFiles/settingsStore";
import { sleep } from "../../../shared/utils";

export function setupLightHandler(websocket: WebSocket, light: Lights, audioProcessor: AudioProcessor) {
  const autoPilot = new AutoPilot(websocket);
  const SERVER_FPS = SECOND * 0.1;

  let lightMode: ControllerMode = settings.controllerMode;
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

  const setMode = async (mode: ControllerMode) => {
    switch (mode) {
      case "AutoPilot":
      case "Manual":
      case "Pattern":
      case "Audio":
        const diff = lightMode !== mode;

        settings.controllerMode = lightMode = mode;
        websocket.broadcast("mode-update", lightMode);
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
    setMode("Manual");
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

  const isStateChanged = () => {
    if (lightMode === "Audio") {
      return true;
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
      const next = lightMode === "Audio" ? 0 : SERVER_FPS - diff;
      timeout = setTimeout(tick, next);
    }
  };

  const destroy = () => {
    clearTimeout(timeout);
  };

  const start = async () => {
    Logger.info("Light controller", "Initalizing");
    await sleep(SECOND * 15);
    await light.setRGB(255, 0, 0);
    await sleep(SECOND);
    await light.setRGB(0, 255, 0);
    await sleep(SECOND);
    await light.setRGB(0, 0, 255);
    await sleep(SECOND);
    await light.setRGB(0, 0, 0);
    await sleep(SECOND);
    Logger.info("Light controller", "Started");
    tick();
  };
  start();
  return { destroy };
}
