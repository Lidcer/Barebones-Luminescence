import { WebSocket } from "./Websocket";
import * as os from "os";
import * as osUtils from "os-utils";
import { ServerInfo } from "../../../shared/interfaces";
import { execute } from "../../sharedFiles/terminal";
import { SECOND } from "../../../shared/constants";
import { FixLengthArray } from "../../../shared/Arrays";

const HISTORY = 25;
const MONITOR_TIME = SECOND * 0.5;
const temperatureHistory = new FixLengthArray<number>(HISTORY);
const cpuHistory = new FixLengthArray<number>(HISTORY);

export function setupDeviceInfo(websocket: WebSocket) {
    websocket.onPromise<ServerInfo, []>("device-info", async client => {
        client.validateAuthentication();

        const result: ServerInfo = {
            memoryUsage: process.memoryUsage(),
            version: process.version,
            arch: process.arch,
            cpuUsage: process.cpuUsage(),
            cpuUsageHistory: cpuHistory,
            temperature: temperatureHistory,
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

async function monitorCpu() {
    const lastTemp = Date.now();
    try {
        const percentage = await new Promise<number>(resolve => {
            osUtils.cpuUsage(percentage => {
                resolve(percentage);
            });
        });
        cpuHistory.push(percentage * 100);
    } catch (error) {
        // ignore
    }
    const now = Date.now();
    const diff = now - lastTemp;
    const time = MONITOR_TIME - diff;

    setTimeout(monitorCpu, time);
}
async function monitorTemp(first?: boolean) {
    const lastTemp = Date.now();
    try {
        const temperature = await execute("cat /sys/class/thermal/thermal_zone*/temp");
        const tempC = parseInt(temperature, 10) / 1000;
        temperatureHistory.push(tempC);
    } catch (error) {
        if (first) {
            // do not run again!
            return;
        }
    }
    const now = Date.now();
    const diff = now - lastTemp;
    const time = MONITOR_TIME - diff;

    setTimeout(monitorTemp, time);
}

monitorTemp(true);
monitorCpu();
