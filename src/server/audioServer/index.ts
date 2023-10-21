import { ADDRESS, PASSWORD, SERVER_PORT } from "./config";
//@ts-ignore dumb typescript is reporting that there is no io member
import { io } from "socket.io-client";
import { ClientSocket } from "../../shared/clientSocket";
import { default as axios } from "axios";
import { AudioCapture } from "./audioCapture";
import { setupInfo } from "./Info";
import { initStorage } from "./settings";
import { saveSettings } from "../mainServer/main/storage";
import { AudioAnalyser } from "../../shared/audioAnalyser";
import { AudioProcessor } from "../../shared/audioProcessor";
import { default as convert } from "pcm-convert";
import { LoginData, SocketAuth } from "../../shared/interfaces";

const connectionUrl = `http://${ADDRESS}:${SERVER_PORT}`;
Logger.debug("Connection string", `Connecting to ${connectionUrl}`);

async function checkForServer() {
    try {
        await axios.get(connectionUrl);
        connectToSocket();
    } catch (error) {
        setTimeout(() => {
            Logger.debug("Server unreachable! trying again in few seconds...", error);
        }, 5000);
    }
}

async function connectToSocket() {
    await initStorage();
    await saveSettings(false);
    Logger.debug("Connecting to socket");
    const socket = io(connectionUrl, {
        timeout: 50000,
        auth: {
            password: PASSWORD,
            clientType: "audio-server",
        } as SocketAuth,
    });
    const client = new ClientSocket();
    let auth = true;

    socket.on("connection-login", (data: LoginData) => {
        if (data.status === "ok") {
            auth = true;
        } else {
            auth = false;
            if (data.message) {
                console.error(data.message);
            }
        }
    });

    socket.on("disconnect", () => {
        auth = false;
    });
    socket.on("connect-error", err => {
        Logger.error("Socket connection error", err);
    });
    socket.on("error", err => {
        Logger.error("Socket error", err);
    });

    const audioProcessor = new AudioProcessor();
    const audio = new AudioAnalyser(audioProcessor);
    const onPCM = (buffer: Buffer, audioCapture: AudioCapture) => {
        if (socket.connected && auth) {
            const arrayBuffer = convert(buffer, "arraybuffer stereo") as ArrayBuffer;
            const intArray = new Int16Array(arrayBuffer);
            audioProcessor.pipe(intArray);
            const rgb = audio.getRGB();
            rgb.r = Math.round(rgb.r);
            rgb.g = Math.round(rgb.g);
            rgb.b = Math.round(rgb.b);
            const a = audioCapture.internalProcessing ? "i" : "d";
            console.log(a, rgb.r, rgb.g, rgb.b);
            if (audioCapture.internalProcessing) {
                socket.emit("rgb-set", rgb.r, rgb.g, rgb.b);
            } else {
                socket.emit("pcm", buffer);
            }
        }
    };

    const audioCapture = new AudioCapture(buffer => onPCM(buffer, audioCapture));
    setupInfo(client, audioCapture);
    audioCapture.start();
}

checkForServer();
