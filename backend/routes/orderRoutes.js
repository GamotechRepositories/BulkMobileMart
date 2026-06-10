import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import {
  placeOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrder,
} from "../controllers/orderController.js";

const router = express.Router();

router.use(protect);

router.get("/admin/all", requireAdmin, getAllOrders);
router.patch("/admin/:id", requireAdmin, updateOrder);
router.post("/", placeOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);

export default router;
