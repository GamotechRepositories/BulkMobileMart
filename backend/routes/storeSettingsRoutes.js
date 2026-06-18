import express from "express";
import {
  getAdminStoreSettings,
  getPublicStoreSettings,
  updateStoreSettings,
} from "../controllers/storeSettingsController.js";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getPublicStoreSettings);
router.get("/admin", protect, requireAdmin, getAdminStoreSettings);
router.put("/", protect, requireAdmin, updateStoreSettings);

export default router;
