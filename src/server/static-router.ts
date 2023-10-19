import path from "path";
import { BunServer } from "./sharedFiles/bun-server";
import fs from "fs";

export function staticsRouter(app: BunServer) {
    let scriptCache = "";
    const getScript = () => {
        if (!scriptCache || DEV) {
            scriptCache = fs.readFileSync(path.join(process.cwd(), "statics", "bundle.js"), "utf-8");
        }
        return scriptCache;
    };
    
    app.get("/script-*.js", (req, res) => {
        return new Response(getScript(), {
            headers: {
                "Content-Type": "Application/javascript"
            }
        })
    })

    //const staticsPath = path.join(process.cwd(), "dist", "statics");
    //router.use("/statics", express.static(staticsPath));

}
