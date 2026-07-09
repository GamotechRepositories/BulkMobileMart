import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import {
  getAdminInboxSummary,
  getPromotionalAudienceStats,
  getPromotionalNotificationHistory,
  sendAdminNotification,
  sendAdminMulticast,
  sendPromotionalNotification,
} from "../controllers/adminNotificationController.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/inbox-summary", getAdminInboxSummary);
router.get("/promotional/audience", getPromotionalAudienceStats);
router.get("/promotional/history", getPromotionalNotificationHistory);
router.post("/promotional/send", sendPromotionalNotification);
router.post("/send", sendAdminNotification);
router.post("/multicast", sendAdminMulticast);

export default router;
