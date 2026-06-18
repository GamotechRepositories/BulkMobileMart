import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import {
  createRazorpayOrder,
  getAdminPaymentById,
  getAdminPayments,
  getPaymentUnreadCount,
  submitUpiPaymentProof,
  updatePaymentStatus,
  verifyRazorpayPayment,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/submit-upi-proof", protect, submitUpiPaymentProof);
router.post("/create-order", protect, createRazorpayOrder);
router.post("/verify", protect, verifyRazorpayPayment);

router.get("/admin/unread-count", protect, requireAdmin, getPaymentUnreadCount);
router.get("/admin", protect, requireAdmin, getAdminPayments);
router.get("/admin/:id", protect, requireAdmin, getAdminPaymentById);
router.patch("/admin/:id", protect, requireAdmin, updatePaymentStatus);

export default router;
