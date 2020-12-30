import { PASSWORD } from "../main/config";
import { WebSocket } from "./Websocket";

export function setupAuthenticate(websocket: WebSocket) {
  websocket.onPromise<void, [string, string]>("auth", async (client, password, type) => {
    if (password !== PASSWORD) {
      throw new Error("Incorrect password");
    }
    if (client.clientType !== "unknown") {
      throw new Error(`Already authenticated as ${client.clientType}`);
    }

    if (type === "audio") {
      if (websocket.getAudioServer()) {
        throw new Error("Only one audio server can be connected!");
      }
      client.setAudioProcessor();
      websocket.broadcast("audio-server-connected");
      const announceDisconnect = () => {
        websocket.broadcast("audio-server-disconnected");
      };
      client.on("disconnect", announceDisconnect);
    } else {
      client.setClient();
    }
  });
  websocket.onPromise<boolean, []>("has-auth", async client => {
    return client.clientType !== "unknown";
  });
  websocket.onPromise<string, []>("auth-type", async client => {
    return client.clientType;
  });
}
