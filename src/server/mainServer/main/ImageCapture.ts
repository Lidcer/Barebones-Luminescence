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
    private readonly CAM_DIRECTORY = path.join(process.cwd(), "cam");
    private readonly RESOLUTION = [1920, 1080];
    private readonly DEVICE = "/dev/video0";
    private readonly MAX_IMAGES = 20;
    private onRemove = new Map<string, () => void>();
    private _last?: ImageLocation;

    constructor(private lifetime = SECOND) {
        if (!fs.existsSync(this.CAM_DIRECTORY)) {
            fs.mkdirSync(this.CAM_DIRECTORY);
        }
        this.gc();
        setInterval(() => {
            this.gc();
        }, HOUR);
    }

    capture(onRemove: () => void) {
        return new Promise<ImageLocation>((resolve, reject) => {
            const name = Date.now().toString();
            const aName = `${name}.png`;

            const pathS = path.join(this.CAM_DIRECTORY, aName);
            const cmd = `fswebcam --no-banner --png --device ${this.DEVICE} --resolution ${this.RESOLUTION[0]}x${this.RESOLUTION[1]} ${pathS}`;
            Logger.debug(`exec "${cmd}"`);
            exec(cmd, (error, _, stdError) => {
                if (error) {
                    reject(error);
                } else {
                    const img = this.mapImage(aName);
                    this.onRemove.set(img.date.toString(), onRemove);
                    if (this.hasImage(img)) {
                        Logger.debug(`Captured ${pathS}`);
                        this._last = img;
                        resolve(img);
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
        const pathS = path.join(this.CAM_DIRECTORY, image.name);
        return fs.existsSync(pathS);
    }

    async getImages() {
        try {
            const files = await fs.promises.readdir(this.CAM_DIRECTORY);
            const filesSorted = files.map(this.mapImage).sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
            return filesSorted;
        } catch (error) {
            Logger.error("Unable to obtain image files ImageCapture.getFiles", error);
            return [];
        }
    }
    async removeImage(image: ImageLocation): Promise<boolean> {
        try {
            const pathS = path.join(this.CAM_DIRECTORY, image.name);
            await fs.promises.unlink(pathS);
            const remove = this.onRemove.get(image.date.toString());
            if (remove) {
                remove();
                this.onRemove.delete(image.date.toString());
            }
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
            const exist: ImageLocation[] = [];
            for (const image of images) {
                if (image.timestamp + this.lifetime < now) {
                    await this.removeImage(image);
                } else {
                    exist.push(image);
                }
            }
            exist.sort((a, b) => (a.date > b.date ? -1 : 1));
            for (let i = this.MAX_IMAGES; i < exist.length; i++) {
                this.removeImage(exist[i]);
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
                      path: path.join(this.CAM_DIRECTORY, image.name),
                  })
                : undefined,
        };
    }
    get last() {
        return this._last;
    }
}
