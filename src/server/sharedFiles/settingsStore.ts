import { cloneDeep } from "../../shared/utils";
import { createDirIfDoesNoExist, exist, readJson, writeJson } from "./fileSystemUtils";

export const storageFolder = "storage";
let initialized = false;

async function init() {
    await createDirIfDoesNoExist([storageFolder]);
    initialized = true;
}

export async function getStorage<T = any>(fileName: string, template: T): Promise<T> {
    const values = Object.entries(template);
    try {
        if (!initialized) {
            await init();
        }
        const presenceOfFile = await exist([storageFolder, fileName], "file");
        if (!presenceOfFile) {
            return { ...template };
        }
        const read = await readJson<T>([storageFolder, fileName]);
        const builder = {};
        for (const [key, value] of values) {
            const fallback = read[key];
            builder[key] = fallback === undefined ? template[value] : fallback;
        }
        return builder as T;
    } catch (error) {
        Logger.debug("Storage Error", error);
    }
    return cloneDeep(template);
}

export async function setStorage<T = any>(fileName: string, data: T) {
    if (!initialized) {
        await init();
    }
    await writeJson([storageFolder, fileName], data, true);
}
