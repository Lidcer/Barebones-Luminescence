import { WebSocket } from "./mainServer/socket/Websocket";
import { PASSWORD } from "./audioServer/config";
import { clientKeys } from "../shared/interfaces";
import { MINUTE } from "../shared/constants";
import { HttpServer } from "./sharedFiles/http-servers/http-srv-utils";

export function apiRouter(app: HttpServer, socket: WebSocket) {
    const wrongPass = new Map<string, number>();

    setInterval(() => {
        wrongPass.forEach((value, key) => {
            value--;
            if (value === 0) {
                wrongPass.delete(key);
            }
        });
    }, MINUTE);
    const jsonResponse = (any: any, status: number) => {
        return new Response(JSON.stringify(any), { headers: { "Content-Type": "Application/json" }, status });
    };

    app.post(`/api/v1/request-token`, async (req, res) => {
        const json = await req.json<{ password: string; clientType: string }>();
        if (typeof json === "object" && clientKeys.includes(json.clientType as any)) {
            if (json.password === PASSWORD) {
                return jsonResponse({ data: { token: socket.generateToken(json.clientType) } }, 200);
            } else {
                let count = wrongPass.get(req.ip) || 0;
                count++;
                if (count > 10) {
                    count = 10;
                }
                if (count > 3) {
                    return jsonResponse({ error: "429 Too Many Request" }, 401);
                } else {
                    return jsonResponse({ error: "401 Unauthorized" }, 401);
                }
            }
        } else {
            return jsonResponse({ error: "400 Bad Request" }, 200);
        }
    });
}
