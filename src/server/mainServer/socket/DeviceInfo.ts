import { WebSocket } from "./Websocket";
import * as os from "os";
import { ServerInfo } from "../../../shared/interfaces";

export function setupDeviceInfo(websocket: WebSocket) {
  websocket.onPromise<ServerInfo, []>("device-info", async client => {
    client.validateAuthentication();

    const result: ServerInfo = {
      memoryUsage: process.memoryUsage(),
      version: process.version,
      arch: process.arch,
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      os: {
        cpus: os.cpus(),
        userInfo: os.userInfo(),
        platform: os.platform(),
        release: os.release(),
        totalmem: os.totalmem(),
        uptime: os.uptime(),
      },
    };
    return result;
  });
}
