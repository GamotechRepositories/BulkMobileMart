import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import {
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  updateCoupon,
  validateCoupon,
} from "../controllers/couponController.js";

const router = express.Router();

router.post("/validate", protect, validateCoupon);
router.get("/", protect, requireAdmin, getAllCoupons);
router.post("/", protect, requireAdmin, createCoupon);
router.put("/:id", protect, requireAdmin, updateCoupon);
router.delete("/:id", protect, requireAdmin, deleteCoupon);

export default router;
