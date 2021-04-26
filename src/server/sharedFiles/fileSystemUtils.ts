import * as fs from "fs";
import * as path from "path";

function getPath(pathString: string[]) {
    const location = process.cwd();
    return path.join.apply(null, [location, ...pathString]);
}

export function writeFile(pathString: string[], data: string) {
    return new Promise<void>((resolve, reject) => {
        const p = getPath(pathString);
        fs.writeFile(p, data, "utf-8", error => {
            if (error) {
                return reject(error);
            }
            resolve();
        });
    });
}

export function readFile(pathString: string[]) {
    return new Promise<string>((resolve, reject) => {
        const p = getPath(pathString);
        fs.readFile(p, "utf-8", (error, data) => {
            if (error) {
                return reject(error);
            }
            resolve(data);
        });
    });
}

export async function writeJson(pathString: string[], json: Object, prettify = true) {
    const string = JSON.stringify(json, undefined, prettify ? 2 : 0);
    return await writeFile(pathString, string);
}

export async function readJson<J = any>(pathString: string[]): Promise<J> {
    const data = await readFile(pathString);
    return JSON.parse(data);
}

export function exist(pathString: string[], check?: "file" | "directory" | undefined) {
    return new Promise<boolean>((resolve, reject) => {
        const p = getPath(pathString);
        fs.stat(p, (error, stats) => {
            if (error) {
                if (error.code === "ENOENT") {
                    return resolve(false);
                }
                return reject(error);
            }
            if (check === "directory") {
                return resolve(stats.isDirectory());
            } else if (check === "file") {
                return resolve(stats.isFile());
            }
            resolve(true);
        });
    });
}

export function createDir(pathString: string[]) {
    const PERMISSION = 0o744;
    return new Promise<void>((resolve, reject) => {
        const p = getPath(pathString);
        fs.mkdir(p, PERMISSION, error => {
            if (error) {
                return reject(error);
            }
            resolve();
        });
    });
}
export async function createDirIfDoesNoExist(pathString: string[]) {
    const result = await exist(pathString, "directory");
    if (!result) {
        createDir(pathString);
    }
}
export function deleteDir(pathString: string[]) {
    return new Promise<void>((resolve, reject) => {
        const p = getPath(pathString);
        fs.unlink(p, error => {
            if (error) {
                return reject(error);
            }
            resolve();
        });
    });
}
