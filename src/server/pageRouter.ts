import { VERSION } from "./mainServer/main/config";
import { Tokenizer } from "./mainServer/main/Tokenizer";
import { WebSocket } from "./mainServer/socket/Websocket";
import { TokenData } from "../shared/interfaces";
import { HASH } from "../shared/constants";
import { BunServer } from "./sharedFiles/bun-server";
import { render } from "./sharedFiles/renderer";

import fs from "fs";

export function pagesRouter(app: BunServer, socket: WebSocket, imageTokenizer: Tokenizer<TokenData>) {
    app.get(`/webcam/:token`, async (req, res) => {
        const token = req.params.token;
        const data = imageTokenizer.getData(token);
        if (data) {
            Logger.log(`WEBCAM: ${req.ip} requested image ${data.path}`);
            const buffer = await fs.promises.readFile(data.path);
            return new Response(buffer, {
                headers: {
                    "Content-Type": "image/png",
                },
            });
        }
        Logger.error(`WEBCAM: ${req.ip} Unauthorized webcam image access`);
        return new Response(undefined, { status: 404 });
    });
    app.get(`/**`, (req, res) => {
        return render("index.ejs", { hash: HASH, version: VERSION });
    });
}
