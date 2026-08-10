import express from "express";
import {
  optimizeImage,
  proxyImage,
  proxyImageDownload,
} from "../controllers/proxyController.js";

const router = express.Router();

router.get("/image", proxyImage);
router.get("/image/download", proxyImageDownload);
router.get("/img", optimizeImage);

export default router;
