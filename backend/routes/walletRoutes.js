import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import {
  getMyWallet,
  getMyTransactions,
  getTransactionById,
  claimReferralCode,
  getWalletSettings,
  adminGetAllWallets,
  adminGetWalletByUserId,
  adminGetAllTransactions,
  adminAdjustWalletBalance,
  adminUpdateWalletStatus,
  adminUpdateWalletSettings,
} from "../controllers/walletController.js";

const router = express.Router();

// ==========================================
// PUBLIC / REWARDS CONFIG
// ==========================================
router.get("/settings", getWalletSettings);

// ==========================================
// USER ROUTES (Requires user authentication)
// ==========================================
router.get("/", protect, getMyWallet);
router.get("/me", protect, getMyWallet);
router.get("/transactions", protect, getMyTransactions);
router.get("/transactions/:id", protect, getTransactionById);
router.post("/claim-referral", protect, claimReferralCode);

// ==========================================
// ADMIN ROUTES (Requires admin role)
// ==========================================
router.get("/admin/all", protect, requireAdmin, adminGetAllWallets);
router.get("/admin/wallets", protect, requireAdmin, adminGetAllWallets);
router.get("/admin/transactions", protect, requireAdmin, adminGetAllTransactions);
router.get("/admin/users/:userId", protect, requireAdmin, adminGetWalletByUserId);
router.post("/admin/adjust", protect, requireAdmin, adminAdjustWalletBalance);
router.patch("/admin/users/:userId/status", protect, requireAdmin, adminUpdateWalletStatus);
router.put("/admin/users/:userId/status", protect, requireAdmin, adminUpdateWalletStatus);
router.get("/admin/settings", protect, requireAdmin, getWalletSettings);
router.put("/admin/settings", protect, requireAdmin, adminUpdateWalletSettings);

export default router;
