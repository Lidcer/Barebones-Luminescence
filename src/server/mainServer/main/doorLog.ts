import { ImageCapture, ImageLocation } from "./ImageCapture";
import { FixLengthArray } from "../../../shared/Arrays";
import { RawDoorLogData, TokenData } from "../../../shared/interfaces";
import { Tokenizer } from "./Tokenizer";

interface DoorLogData {
    date: Date;
    image?: ImageLocation;
}

export class DoorLog {
    private lastLogs = new FixLengthArray<DoorLogData>(100);
    constructor(private imageCapture?: ImageCapture) {}

    async log() {
        const data: DoorLogData = {
            date: new Date(),
        };
        this.lastLogs.push(data);
        if (this.imageCapture) {
            try {
                const image = await this.imageCapture.capture();
                data.image = image;
            } catch (error) {
                Logger.error("Unable to capture image", error);
            }
        }
    }
    getDoorRawLogs(socketId: string, tokenizer: Tokenizer<TokenData>) {
        return this.lastLogs.map(data => {
            return this.imageCapture.convertToRaw(data.image, socketId, tokenizer);
        });
    }
}
