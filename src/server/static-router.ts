import path from "path";
import express from "express";
import { Router } from "express";

export function staticsRouter() {
    const router = Router();

    router.get("/script-*.js", (req, res) => {
        res.sendFile(path.join(process.cwd(), "statics", "bundle.js"));
    })

    const staticsPath = path.join(process.cwd(), "dist", "statics");
    router.use("/statics", express.static(staticsPath));
    return router;
}
