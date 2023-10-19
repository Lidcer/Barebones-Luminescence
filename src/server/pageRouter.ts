
import { VERSION } from "./mainServer/main/config";
import { Tokenizer } from "./mainServer/main/Tokenizer";
import { WebSocket } from "./mainServer/socket/Websocket";
import { TokenData } from "../shared/interfaces";
import { HASH } from "../shared/constants";
import { BunServer } from "./sharedFiles/bun-server";
import { render } from "./sharedFiles/renderer";


export function pagesRouter(app: BunServer, socket: WebSocket, imageTokenizer: Tokenizer<TokenData>) {

    app.get(`/webcam/:socketId/:token`, async (req, res) => {
        const token = req.params.token;
        const socketId = req.params.socketId;
        const data = imageTokenizer.getData(token);
        if (data) {
            // const client = socket.getClients().find(e => e.id === socketId);
            // if (client && client.id === data.id) {
            //     if (client.clientType === "browser-client" || client.clientType === "android-app") {
            //         const ip = getIp(req);
            //         if (ip) {
            //             Logger.log(`WEBCAM: ${ip} requested image ${data.id}`);
            //             res.type("png");
            //             path.join(process.cwd());
            //             res.sendFile(data.path);
            //             return;
            //         }
            //     }
            // }
        }
        Logger.error(`WEBCAM: ${req.ip} Unauthorized webcam image access`);
        return new Response(undefined, {status: 404})
    });
    app.get(`/**`, (req, res) => {
        return render("index.ejs", { hash: HASH, version: VERSION });
    });


}
