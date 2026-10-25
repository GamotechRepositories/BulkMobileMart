import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import {
  adminGetAllWallets,
  adminGetWalletByUserId,
  adminGetAllTransactions,
  adminAdjustWalletBalance,
  adminUpdateWalletStatus,
  getWalletSettings,
  adminUpdateWalletSettings,
} from "../controllers/walletController.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/", adminGetAllWallets);
router.get("/transactions", adminGetAllTransactions);
router.get("/settings", getWalletSettings);
router.put("/settings", adminUpdateWalletSettings);
router.get("/users/:userId", adminGetWalletByUserId);
router.post("/adjust", adminAdjustWalletBalance);
router.patch("/users/:userId/status", adminUpdateWalletStatus);
router.put("/users/:userId/status", adminUpdateWalletStatus);

export default router;
