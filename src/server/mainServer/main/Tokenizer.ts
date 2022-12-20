import * as crypto from "crypto";
import { MINUTE } from "../../../shared/constants";

interface TokenBuffer<T> {
    data: T;
    timeout: NodeJS.Timeout;
}

export class Tokenizer<T> {
    private bank = new Map<string, TokenBuffer<T>>();

    constructor(private lifeTime = MINUTE * 10, private keyLen = 128) {}

    createToken(obj: T) {
        while (true) {
            const token = this.generateToken(this.keyLen);
            if (!this.bank.has(token)) {
                return this.createTokenHandler(token, obj);
            }
        }
    }
    private createTokenHandler(token: string, obj: T) {
        this.bank.set(token, {
            data: obj,
            timeout: setTimeout(() => {
                this.bank.delete(token);
            }, this.lifeTime),
        });
        return token;
    }
    getData(token: string) {
        const data = this.bank.get(token);
        if (data) {
            clearTimeout(data.timeout);
            this.bank.delete(token);
            return data.data;
        }
        return null;
    }
    private generateToken(length: number) {
        const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
        const bytes = crypto.randomBytes(length);
        const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, length);
        return characters.split("").reduce(acc => {
            const idx = Math.floor(hash.length * Math.random());
            return acc + hash[idx];
        }, "");
    }
}
