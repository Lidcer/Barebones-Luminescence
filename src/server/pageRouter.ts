import { Router, Request } from "express";
import { VERSION } from "./mainServer/main/config";
import { Tokenizer } from "./mainServer/main/Tokenizer";
import { WebSocket } from "./mainServer/socket/Websocket";
import * as path from "path";
import { TokenData } from "../shared/interfaces";
import { HASH } from "../shared/constants";

function getIp(req: Request) {
    return req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
}

export function pagesRouter(socket: WebSocket, imageTokenizer: Tokenizer<TokenData>) {
    const router = Router();
    router.get(`/webcam/:socketId/:token`, async (req, res) => {
        const token = req.params.token;
        const socketId = req.params.socketId;
        const data = imageTokenizer.getData(token);
        if (data) {
            const client = socket.getClients().find(e => e.id === socketId);
            if (client && client.id === data.id) {
                if (client.clientType === "browser-client" || client.clientType === "android-app") {
                    const ip = getIp(req);
                    if (ip) {
                        Logger.log(`WEBCAM: ${ip} requested image ${data.id}`);
                        res.type("png");
                        path.join(process.cwd());
                        res.sendFile(data.path);
                        return;
                    }
                }
            }
        }
        Logger.error(`WEBCAM: ${getIp(req) || "unknown"} Unauthorized webcam image access`);
        res.status(404).end();
    });
    router.get(`/**`, async (req, res) => {

        res.render("index", { hash: HASH, version: VERSION });
    });

    return router;
}
