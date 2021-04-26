/// <reference path="../../shared/fix.d.ts" />
/// <reference path="../sharedFiles/logger.d.ts" />
import { Logger as Log } from "../../shared/logger";
import * as path from "path";
import * as fs from "fs";

const IS_DEV = process.env.NODE_ENV !== "production";

(global as any).DEV = IS_DEV;
(global as any).Logger = Log;

interface IConfig {
    ADDRESS?: string;
    PASSWORD?: string;
    SERVER_PORT?: string;
}

let config: IConfig = {
    ADDRESS: "localhost",
    PASSWORD: "",
    SERVER_PORT: "6849",
};

const configJsonPath = path.join(process.cwd(), "config.json");
try {
    const rawConfigJson = fs.readFileSync(configJsonPath).toString();
    config = JSON.parse(rawConfigJson);
} catch (error) {
    /* ignored */
}

const ADDRESS = config.ADDRESS || "localhost";
const PASSWORD = config.PASSWORD || "";
const SERVER_PORT = config.SERVER_PORT || "6849";

if (!PASSWORD) {
    Logger.error("Config file", "Password is missing in config file!");
}

export { ADDRESS, PASSWORD, SERVER_PORT };
