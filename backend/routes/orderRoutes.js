import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import {
  placeOrder,
  adminPlaceOrder,
  createCheckoutAttempt,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrder,
  cancelOrder,
  getDashboardStats,
  getOrderUnreadCount,
} from "../controllers/orderController.js";

const router = express.Router();

router.use(protect);

router.get("/admin/dashboard-stats", requireAdmin, getDashboardStats);
router.get("/admin/unread-count", requireAdmin, getOrderUnreadCount);
router.get("/admin/all", requireAdmin, getAllOrders);
router.post("/admin/create", requireAdmin, adminPlaceOrder);
router.patch("/admin/:id", requireAdmin, updateOrder);
router.post("/checkout-attempt", createCheckoutAttempt);
router.post("/", placeOrder);
router.get("/", getMyOrders);
router.patch("/:id/cancel", cancelOrder);
router.get("/:id", getOrderById);

export default router;
