/// <reference path="../../../shared/fix.d.ts" />
/// <reference path="../../sharedFiles/logger.d.ts" />

import path from "path";
import fs from "fs";
import { Logger as Log } from "../../../shared/logger";
import { randomBytes } from "crypto";
import esbuild from "esbuild";

const IS_DEV = process.env.NODE_ENV !== "production";

(global as any).DEV = IS_DEV;
(global as any).Logger = Log;

interface IConfig {
    SERVER_PORT?: number;
    PI_PORT?: number;
    PASSWORD: string;
    ADDRESS: string;
    MAGIC_HOME_CONTROLLER?: boolean;
    AUDIO_SERVER?: boolean;
    SECRET?: string;
    DOOR_SENSOR?: boolean;
    CAM_INSTALLED?: boolean;
}

let config: IConfig = {
    PASSWORD: "",
    SECRET: "",
    SERVER_PORT: 6849,
    PI_PORT: 5447,
    ADDRESS: "localhost",
    MAGIC_HOME_CONTROLLER: false,
    AUDIO_SERVER: false,
    DOOR_SENSOR: false,
    CAM_INSTALLED: false,
};

const packageJsonPath = path.join(process.cwd(), "package.json");
const configJsonPath = path.join(process.cwd(), "config.json");
const rawPackageJson = fs.readFileSync(packageJsonPath).toString();
const PackageJson = JSON.parse(rawPackageJson);
const { version: VERSION } = PackageJson;

try {
    const rawConfigJson = fs.readFileSync(configJsonPath).toString();
    config = JSON.parse(rawConfigJson);
} catch (error) {
    /* ignored */
}

if (!config.PASSWORD || !config.SECRET) {
    regenerateConfig();
}

// server
const serverPort = process.env.PORT || config.SERVER_PORT || 5050;;
const SERVER_PORT = typeof serverPort === "string" ? parseInt(serverPort, 10) : serverPort;
const WEBPACK_PORT = 8085; // For dev environment only
const PASSWORD = config.PASSWORD;
const SECRET = config.SECRET;
const ADDRESS = config.ADDRESS || "localhost";
const MAGIC_HOME_CONTROLLER = config.MAGIC_HOME_CONTROLLER || false;
const AUDIO_SERVER = config.AUDIO_SERVER || false;
const PI_PORT = config.PI_PORT || false;
const DOOR_SENSOR = config.DOOR_SENSOR || false;
const CAM_INSTALLED = config.CAM_INSTALLED || false;

export function regenerateConfig(shouldShutDownServer = false) {
    config.SECRET = randomBytes(64).toString("base64");
    updateConfig();
    if (shouldShutDownServer) {
        Logger.log("\n\n\n\n");
        Logger.log("========================");
        Logger.warn("SHUTING DOWN SERVER");
        Logger.log("========================");
        process.exit(0);
    }
}

function updateConfig() {
    fs.writeFileSync(configJsonPath, JSON.stringify(config, undefined, 1));
}


function watchFolder(folder: string, cb: () => void) {
    fs.readdir(folder, (err, files) => {
      if (err) {
        console.error(err);
        return;
      }
  
      files.forEach((file) => {
        const filePath = `${folder}/${file}`;
        fs.watch(filePath, (event, filename) => {
          if (event === 'change') {
            cb()
          } else if (event === 'rename') {
            cb()
          }
        });
        if (fs.statSync(filePath).isDirectory()) {
          watchFolder(filePath, cb);
        }
      });
    });
  }

function buildClient() {
    esbuild.build({
        entryPoints: ['./src/client/index.jsx'],
        plugins: [],
        define: {
            DEV: JSON.stringify(true),
        },
        bundle: true,
        outfile: './statics/bundle.js',
    });
    Logger.debug("Client built")
}

if (DEV) {
    let timer: Timer;
    const cb = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            buildClient();
        }, 1000)
    }
    watchFolder("./src/client", cb);
    watchFolder("./src/shared", cb);
    buildClient();
}

export {
    IS_DEV,
    AUDIO_SERVER,
    ADDRESS,
    VERSION,
    PASSWORD,
    SERVER_PORT,
    WEBPACK_PORT,
    SECRET,
    MAGIC_HOME_CONTROLLER,
    PI_PORT,
    CAM_INSTALLED,
    DOOR_SENSOR,
};
