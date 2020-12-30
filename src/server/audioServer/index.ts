import { ADDRESS, PASSWORD, SERVER_PORT } from "./config";
//@ts-ignore dumb typescript is reporting that there is no io member
import { io } from "socket.io-client";
import { ClientSocket } from "../../shared/clientSocket";
import { default as axios } from "axios";
import { AudioCapture } from "./audioCapture";
import { setupInfo } from "./Info";
import { initStorage } from "./settings";
import { saveSettings } from "../mainServer/main/storage";

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
  await saveSettings();
  Logger.debug("Connecting to socket");
  const socket = io(connectionUrl, { timeout: 50000 });
  const client = new ClientSocket(socket);

  let auth = false;
  const authenticate = async () => {
    const result = await client.emitPromise("has-auth");
    if (!result) {
      try {
        await client.emitPromise("auth", PASSWORD, "audio");
        auth = true;
        Logger.debug("Authentication succeeded");
      } catch (error) {
        Logger.error("Authentication failed", error);
      }
    }
  };

  if (socket.connected) {
    authenticate();
  }
  socket.on("connect", authenticate);
  socket.on("disconnect", () => {
    auth = false;
  });
  socket.on("connect-error", err => {
    Logger.error("Socket connection error", err);
  });
  socket.on("error", err => {
    Logger.error("Socket error", err);
  });

  const onPCM = (buffer: Buffer) => {
    if (socket.connected && auth) {
      socket.emit("pcm", buffer);
    }
  };

  const audioCapture = new AudioCapture(onPCM);
  setupInfo(client, audioCapture);
  audioCapture.start();
}

checkForServer();
