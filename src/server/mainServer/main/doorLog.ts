import { ImageCapture, ImageLocation } from "./ImageCapture";
import { FixLengthArray } from "../../../shared/Arrays";
import { RawDoorLogData, RawImageLocation, TokenData } from "../../../shared/interfaces";
import { Tokenizer } from "./Tokenizer";
import { SECOND } from "../../../shared/constants";
import { resolve } from "path";

interface DoorLogData {
    date: Date;
    image?: ImageLocation;
}

export class DoorLog {
    private lastLogs = new FixLengthArray<DoorLogData>(100);
    private readonly IMAGE_DELAY = SECOND * 2;
    constructor(private imageCapture?: ImageCapture) {}

    log() {
        return new Promise<DoorLogData>(resolve => {
            const data: DoorLogData = {
                date: new Date(),
            };
            this.lastLogs.push(data);
            if (this.imageCapture) {
                setTimeout(async () => {
                    try {
                        const image = await this.imageCapture.capture(() => {
                            const index = this.lastLogs.indexOf(data);
                            if (index !== -1) {
                                this.lastLogs.splice(index, 1);
                            }
                        });
                        data.image = image;
                    } catch (error) {
                        Logger.error("Unable to capture image", error);
                    }
                    resolve(data);
                }, this.IMAGE_DELAY);
            }
        });
    }
    getDoorRawLogs(tokenizer: Tokenizer<TokenData>) {
        return this.lastLogs
            .filter(e => !!e.image)
            .map(data => {
                const cData = this.imageCapture.convertToRaw(data.image, tokenizer) as RawDoorLogData;
                cData.doorData = data.date.toUTCString();
                return cData;
            });
    }
}
