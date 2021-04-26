import { Router } from "express";
import { VERSION } from "./mainServer/main/config";
import { getManifest } from "./manifest-manager";

export function pagesRouter() {
    const router = Router();
    router.get(`/**`, async (req, res) => {
        const manifest = await getManifest();
        res.render("index", { manifest, version: VERSION });
    });
    return router;
}
