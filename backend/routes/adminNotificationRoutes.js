import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import {
  sendAdminNotification,
  sendAdminMulticast,
} from "../controllers/adminNotificationController.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.post("/send", sendAdminNotification);
router.post("/multicast", sendAdminMulticast);

export default router;
