import express from "express";
import { proxyImage } from "../controllers/proxyController.js";

const router = express.Router();

router.get("/image", proxyImage);

export default router;
