import express from "express";
import { AUDIO_SERVER, SERVER_PORT } from "./config";
import path from "path";
import { WebSocket } from "../socket/Websocket";
import { pagesRouter } from "../../pageRouter";
import { staticsRouter } from "../../static-router";
import { setupAuthenticate } from "../socket/authenticate";
import { setupCommunicationToAudioServer } from "../socket/audioServer";
import { setupLightHandler } from "../LightController/LightHandler";
import { AudioProcessor } from "../../../shared/audioProcessor";
import { setupDeviceInfo } from "../socket/DeviceInfo";
import { Lights } from "../LightController/Devices/Controller";
import { initStorage, setupServerSocket } from "./storage";
import { SECOND } from "../../../shared/constants";

const app = express();
app.disable("x-powered-by");
app.set("view engine", "ejs");
app.use("/assets", express.static(path.join(process.cwd(), "assets")));
app.use(staticsRouter());
app.use(pagesRouter());

async function start() {
  await initStorage();

  const lights = new Lights();
  const audioProcessor = new AudioProcessor();

  const server = app.listen(SERVER_PORT, () => {
    Logger.info(`App listening on port ${SERVER_PORT}!`);
  });

  const webSocket = new WebSocket({ server });
  setupAuthenticate(webSocket);
  setupServerSocket(webSocket, lights);
  setupDeviceInfo(webSocket);
  setupCommunicationToAudioServer(webSocket, audioProcessor);
  setupLightHandler(webSocket, lights, audioProcessor);

  if (AUDIO_SERVER) {
    setTimeout(() => {
      require("../../audioServer/index");
    }, SECOND * 5);
  }
  (global as any).socket = lights;
  (global as any).webSocket = webSocket;
}

start();
