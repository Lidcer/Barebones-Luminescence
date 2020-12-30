import { Router } from "express";
import { getManifest } from "./manifest-manager";

export function pagesRouter() {
  const router = Router();
  router.get(`/**`, async (req, res) => {
    const manifest = await getManifest();
    res.render("index", { manifest });
  });
  return router;
}
