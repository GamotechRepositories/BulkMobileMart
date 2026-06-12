import express from "express";
import {
  getAllSupportMessages,
  getSupportMessageById,
  submitSupportMessage,
  updateSupportMessageStatus,
} from "../controllers/supportController.js";
import { optionalProtect, protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", optionalProtect, submitSupportMessage);

router.get("/admin", protect, requireAdmin, getAllSupportMessages);
router.get("/admin/:id", protect, requireAdmin, getSupportMessageById);
router.patch("/admin/:id", protect, requireAdmin, updateSupportMessageStatus);

export default router;
