import express from "express";
import { AUDIO_SERVER, CAM_INSTALLED, IS_DEV, SERVER_PORT } from "./config";
import path from "path";
import { WebSocket } from "../socket/Websocket";
import { pagesRouter } from "../../pageRouter";
import { staticsRouter } from "../../static-router";
import { setupCommunicationToAudioServer } from "../socket/audioServer";
import { setupLightHandler } from "../LightController/LightHandler";
import { AudioProcessor } from "../../../shared/audioProcessor";
import { setupDeviceInfo } from "../socket/DeviceInfo";
import { Lights } from "../LightController/Devices/Controller";
import { initStorage, setupServerSocket } from "./storage";
import { DAY, MINUTE, SECOND } from "../../../shared/constants";
import { ImageCapture } from "./ImageCapture";
import { DoorLog } from "./doorLog";
import { Tokenizer } from "./Tokenizer";
import { TokenData } from "../../../shared/interfaces";

const app = express();
app.disable("x-powered-by");
app.set("view engine", "ejs");
app.use("/assets", express.static(path.join(process.cwd(), "assets")));
app.use(staticsRouter());

const imageTokenizer = new Tokenizer<TokenData>(MINUTE);

async function start() {
    await initStorage();

    const lights = new Lights();
    const audioProcessor = new AudioProcessor();

    const imageCapture = CAM_INSTALLED ? new ImageCapture(IS_DEV ? MINUTE : DAY) : undefined;
    const doorLog = imageCapture ? new DoorLog(imageCapture) : undefined;

    const server = app.listen(SERVER_PORT, () => {
        Logger.info(`App listening on port ${SERVER_PORT}!`);
    });

    const webSocket = new WebSocket({ server });
    app.use(pagesRouter(webSocket, imageTokenizer));

    const { getMode } = setupLightHandler(webSocket, lights, audioProcessor, doorLog);
    setupServerSocket(webSocket, lights, imageTokenizer, imageCapture, doorLog, getMode);
    setupDeviceInfo(webSocket);
    setupCommunicationToAudioServer(webSocket, audioProcessor);

    if (AUDIO_SERVER) {
        setTimeout(() => {
            require("../../audioServer/index");
        }, SECOND * 5);
    }
    (global as any).socket = lights;
    (global as any).webSocket = webSocket;
}

start();
