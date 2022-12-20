import { HOUR, SECOND } from "../../../shared/constants";
import * as path from "path";
import * as fs from "fs";
import { exec } from "child_process";
import { RawImageLocation, TokenData } from "../../../shared/interfaces";
import { Tokenizer } from "./Tokenizer";

export interface ImageLocation {
    timestamp: number;
    date: Date;
    name: string;
    extension: string;
}

export class ImageCapture {
    readonly camDirectory = path.join(process.cwd(), "cam");
    readonly resolution = [1280, 720];
    readonly device = "/dev/video0";
    private _last?: ImageLocation;

    constructor(private lifetime = SECOND) {
        if (!fs.existsSync(this.camDirectory)) {
            fs.mkdirSync(this.camDirectory);
        }
        this.gc();
        setInterval(() => {
            this.gc();
        }, HOUR);
    }

    capture() {
        return new Promise<ImageLocation>((resolve, reject) => {
            const name = Date.now().toString();
            const aName = `${name}.png`;

            const pathS = path.join(this.camDirectory, aName);
            const cmd = `fswebcam --no-banner --png --device ${this.device} --resolution ${this.resolution[0]}x${this.resolution[1]} ${pathS}`;
            Logger.debug(`exec "${cmd}"`);
            exec(cmd, (error, _, stdError) => {
                if (error) {
                    reject(error);
                } else {
                    const img = this.mapImage(aName);
                    if (this.hasImage(img)) {
                        Logger.debug(`Captured ${pathS}`);
                        this._last = img;
                        resolve(this.mapImage(pathS));
                    } else {
                        Logger.debug(`An error has occurred ${pathS}`);
                        reject(new Error(stdError || "Unable to capture image"));
                    }
                }
            });
        });
    }
    private mapImage(imageName: string): ImageLocation {
        const split = imageName.split(".");
        const ex = split.pop();
        const noFileExt = split.join(".");
        const timestamp = parseInt(noFileExt);
        const date = new Date(timestamp);
        return {
            timestamp,
            date,
            name: imageName,
            extension: ex,
        };
    }
    hasImage(image: ImageLocation) {
        const pathS = path.join(this.camDirectory, image.name);
        return fs.existsSync(pathS);
    }

    async getImages() {
        try {
            const files = await fs.promises.readdir(this.camDirectory);
            const filesSorted = files.map(this.mapImage).sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
            return filesSorted;
        } catch (error) {
            Logger.error("Unable to obtain image files ImageCapture.getFiles", error);
            return [];
        }
    }
    async removeImage(image: ImageLocation): Promise<boolean> {
        try {
            const pathS = path.join(this.camDirectory, image.name);
            await fs.promises.unlink(pathS);
            return true;
        } catch (error) {
            Logger.error("Unable to delete image", error);
            return false;
        }
    }
    async gc() {
        try {
            console.info("Running gc");
            const images = await this.getImages();
            const now = Date.now();
            for (const image of images) {
                if (image.timestamp + this.lifetime < now) {
                    await this.removeImage(image);
                }
            }
        } catch (error) {
            Logger.error("Unable to garbage collect images", error);
        }
    }
    convertToRaw(image: ImageLocation, socketId: string, tokenizer: Tokenizer<TokenData>): RawImageLocation {
        return {
            date: image.date.toUTCString(),
            name: image.name,
            token: tokenizer
                ? tokenizer.createToken({
                      id: socketId,
                      path: path.join(this.camDirectory, image.name),
                  })
                : undefined,
        };
    }
    get last() {
        return this._last;
    }
}
