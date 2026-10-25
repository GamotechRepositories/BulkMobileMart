import mongoose from "mongoose";
import crypto from "crypto";
import Wallet from "../models/wallet/Wallet.js";
import WalletTransaction from "../models/wallet/WalletTransaction.js";
import User, { generateRandomReferralCode } from "../models/user.js";
import StoreSettings from "../models/StoreSettings.js";
import {
  getStoreSettings,
  clearStoreSettingsCache,
  normalizeWalletSettings,
} from "../utils/storeSettingsHelpers.js";
import {
  buildPaginatedResponse,
  getPaginationParams,
} from "../utils/pagination.js";
import { respondWithControllerError } from "../utils/controllerErrors.js";
import { escapeRegex } from "../utils/adminSearch.js";

const VALID_TRANSACTION_TYPES =
  WalletTransaction.schema.path("type").enumValues;

/**
 * Ensures a wallet exists for the given user ID.
 * If one does not exist, creates it atomically.
 */
export async function getOrCreateUserWallet(userId) {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    try {
      wallet = await Wallet.create({
        userId,
        pointsBalance: 0,
        status: "active",
      });
    } catch (err) {
      if (err.code === 11000) {
        wallet = await Wallet.findOne({ userId });
      } else {
        throw err;
      }
    }
  }
  return wallet;
}

/**
 * Calculates aggregated stats for a user's wallet transactions.
 */
export async function getUserWalletStats(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const result = await WalletTransaction.aggregate([
    {
      $match: {
        userId: userObjectId,
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        totalEarned: {
          $sum: {
            $cond: [{ $gt: ["$pointsDelta", 0] }, "$pointsDelta", 0],
          },
        },
        totalRedeemed: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$pointsDelta", 0] },
                  { $eq: ["$type", "points_redemption"] },
                ],
              },
              { $abs: "$pointsDelta" },
              0,
            ],
          },
        },
        totalDebited: {
          $sum: {
            $cond: [
              { $lt: ["$pointsDelta", 0] },
              { $abs: "$pointsDelta" },
              0,
            ],
          },
        },
        totalTransactions: { $sum: 1 },
      },
    },
  ]);

  if (!result || result.length === 0) {
    return {
      totalEarned: 0,
      totalRedeemed: 0,
      totalDebited: 0,
      totalTransactions: 0,
    };
  }

  return {
    totalEarned: result[0].totalEarned || 0,
    totalRedeemed: result[0].totalRedeemed || 0,
    totalDebited: result[0].totalDebited || 0,
    totalTransactions: result[0].totalTransactions || 0,
  };
}

/**
 * Reusable core helper to apply a points credit or debit to a user's wallet
 * and record an immutable transaction log.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} params.type - One of valid WalletTransaction types
 * @param {number} params.pointsDelta - Integer (+ to credit, - to debit)
 * @param {string} params.referenceId - Unique reference key for this type
 * @param {string} [params.description]
 * @param {Object} [params.metadata]
 * @param {boolean} [params.allowBlocked=false] - Whether to allow adjustments on blocked wallets (e.g. admin override)
 */
export async function applyWalletPoints({
  userId,
  type,
  pointsDelta,
  referenceId,
  description = "",
  metadata = {},
  allowBlocked = false,
}) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid user ID");
    error.status = 400;
    throw error;
  }

  const delta = Number(pointsDelta);
  if (!Number.isSafeInteger(delta) || delta === 0) {
    const error = new Error("pointsDelta must be a non-zero whole integer");
    error.status = 400;
    throw error;
  }

  if (!VALID_TRANSACTION_TYPES.includes(type)) {
    const error = new Error(
      `Invalid transaction type. Allowed: ${VALID_TRANSACTION_TYPES.join(", ")}`
    );
    error.status = 400;
    throw error;
  }

  const refId = String(referenceId || "").trim();
  if (!refId) {
    const error = new Error("referenceId is required");
    error.status = 400;
    throw error;
  }

  // Idempotency check: { type, referenceId } has a unique compound index
  const existingTx = await WalletTransaction.findOne({
    type,
    referenceId: refId,
  });
  if (existingTx) {
    const error = new Error(
      `Transaction with type '${type}' and referenceId '${refId}' already exists`
    );
    error.status = 409;
    error.code = 11000;
    throw error;
  }

  const wallet = await getOrCreateUserWallet(userId);

  if (!allowBlocked && wallet.status === "blocked") {
    const error = new Error("Wallet is blocked. Transactions are not permitted.");
    error.status = 403;
    throw error;
  }

  // Balance sufficiency check for deductions
  if (delta < 0 && wallet.pointsBalance + delta < 0) {
    const error = new Error(
      `Insufficient points. Current balance: ${wallet.pointsBalance}, requested deduction: ${Math.abs(delta)}`
    );
    error.status = 400;
    throw error;
  }

  // Atomic balance update
  const query = {
    _id: wallet._id,
    ...(allowBlocked ? {} : { status: "active" }),
  };
  if (delta < 0) {
    query.pointsBalance = { $gte: Math.abs(delta) };
  }

  const updatedWallet = await Wallet.findOneAndUpdate(
    query,
    { $inc: { pointsBalance: delta } },
    { new: true }
  );

  if (!updatedWallet) {
    const freshWallet = await Wallet.findById(wallet._id);
    if (!freshWallet) {
      const err = new Error("Wallet not found");
      err.status = 404;
      throw err;
    }
    if (freshWallet.status === "blocked" && !allowBlocked) {
      const err = new Error("Wallet is blocked");
      err.status = 403;
      throw err;
    }
    if (delta < 0 && freshWallet.pointsBalance < Math.abs(delta)) {
      const err = new Error(
        `Insufficient points balance. Current balance: ${freshWallet.pointsBalance}`
      );
      err.status = 400;
      throw err;
    }
    const err = new Error("Unable to update wallet balance. Please try again.");
    err.status = 500;
    throw err;
  }

  const balanceAfter = updatedWallet.pointsBalance;
  const balanceBefore = balanceAfter - delta;

  // Create immutable transaction ledger record
  try {
    const transaction = await WalletTransaction.create({
      walletId: updatedWallet._id,
      userId,
      type,
      pointsDelta: delta,
      balanceBefore,
      balanceAfter,
      status: "completed",
      referenceId: refId,
      description: String(description || "").trim(),
      metadata: metadata || {},
    });

    return {
      success: true,
      wallet: updatedWallet,
      transaction,
    };
  } catch (txError) {
    // Rollback atomic balance update if transaction record creation fails
    try {
      await Wallet.findByIdAndUpdate(updatedWallet._id, {
        $inc: { pointsBalance: -delta },
      });
    } catch (rollbackError) {
      console.error(
        "Critical error: Failed to rollback wallet balance after transaction write failure:",
        rollbackError
      );
    }
    throw txError;
  }
}

/**
 * Ensures the given user has a referral code; if not, generates and saves one.
 */
export async function ensureUserReferralCode(user) {
  if (user?.referralCode) return user.referralCode;

  let code;
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    code = generateRandomReferralCode();
    const count = await User.countDocuments({ referralCode: code });
    if (!count) exists = false;
    attempts++;
  }
  const finalCode = code || `BMM${Date.now().toString().slice(-5)}`;
  await User.findByIdAndUpdate(user._id, { referralCode: finalCode });
  user.referralCode = finalCode;
  return finalCode;
}

/**
 * Awards referral points to both the newly registered user (referee)
 * and the inviting user (referrer) based on admin settings.
 */
export async function processReferralReward({ newUserId, referrerId }) {
  try {
    const settings = await getStoreSettings();
    const ws = settings?.walletSettings;
    if (!ws?.enabled || !ws?.referralEnabled) {
      return { rewarded: false, reason: "Referral rewards disabled" };
    }

    const refereePoints = Number(ws.referralRewardReferee) || 0;
    const referrerPoints = Number(ws.referralRewardReferrer) || 0;

    const results = {};

    // Award welcome bonus to the referee (new user)
    if (refereePoints > 0) {
      try {
        const refereeRes = await applyWalletPoints({
          userId: newUserId,
          type: "referral_reward",
          pointsDelta: refereePoints,
          referenceId: `REF-WELCOME-${newUserId}`,
          description: "Welcome bonus for signing up with referral code",
          metadata: { referrerId },
        });
        results.referee = refereeRes;
      } catch (err) {
        if (err.code !== 11000) {
          console.error("Error crediting referee welcome bonus:", err);
        }
      }
    }

    // Award referral reward to the referrer
    if (referrerPoints > 0) {
      try {
        const referrerRes = await applyWalletPoints({
          userId: referrerId,
          type: "referral_reward",
          pointsDelta: referrerPoints,
          referenceId: `REF-BONUS-${newUserId}-${referrerId}`,
          description: "Referral bonus for inviting a new customer",
          metadata: { referredUserId: newUserId },
        });
        results.referrer = referrerRes;
      } catch (err) {
        if (err.code !== 11000) {
          console.error("Error crediting referrer bonus:", err);
        }
      }
    }

    return { rewarded: true, results };
  } catch (error) {
    console.error("Error processing referral rewards:", error);
    return { rewarded: false, error: error.message };
  }
}

/**
 * Awards purchase cashback/reward points to a user's wallet
 * when an order meets or exceeds the admin-configured threshold.
 */
export async function rewardOrderPurchase(order) {
  try {
    if (!order || !order.user || order.status === "attempted") return null;

    const settings = await getStoreSettings();
    const ws = settings?.walletSettings;
    if (!ws?.enabled || !ws?.orderRewardEnabled) return null;

    const threshold = Number(ws.orderRewardThreshold) || 0;
    const rewardPoints = Number(ws.orderRewardPoints) || 0;
    const orderTotal = Number(order.total) || 0;

    if (rewardPoints <= 0 || orderTotal < threshold) return null;

    const referenceId = `ORDER-REWARD-${order._id}`;

    const result = await applyWalletPoints({
      userId: order.user,
      type: "cashback",
      pointsDelta: rewardPoints,
      referenceId,
      description: `Reward points for Order #${order.orderNumber || String(order._id).slice(-6)} (Total: ₹${orderTotal})`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        orderTotal,
        rewardThreshold: threshold,
      },
    });

    return result;
  } catch (error) {
    // Already rewarded (idempotent duplicate key error)
    if (error.code === 11000 || error.status === 409) return null;
    console.error("Failed to reward order purchase:", error);
    return null;
  }
}

/**
 * Reverses order cashback reward if an order is cancelled.
 */
export async function reverseOrderReward(order) {
  try {
    if (!order || !order.user) return null;

    const rewardTx = await WalletTransaction.findOne({
      type: "cashback",
      referenceId: `ORDER-REWARD-${order._id}`,
      status: "completed",
    });

    if (!rewardTx) return null;

    const reversalRefId = `ORDER-REVERSAL-${order._id}`;
    const result = await applyWalletPoints({
      userId: order.user,
      type: "reward_reversal",
      pointsDelta: -Math.abs(rewardTx.pointsDelta),
      referenceId: reversalRefId,
      description: `Reversal of reward points for cancelled Order #${order.orderNumber || String(order._id).slice(-6)}`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        originalTransactionId: rewardTx._id,
      },
      allowBlocked: true,
    });

    return result;
  } catch (error) {
    if (error.code === 11000 || error.status === 409) return null;
    console.error("Failed to reverse order reward:", error);
    return null;
  }
}

/**
 * Refunds redeemed wallet points if an order with wallet points discount is cancelled.
 */
export async function refundOrderRedeemedPoints(order) {
  try {
    if (!order || !order.user) return null;

    const pointsToRefund = Math.floor(Number(order.walletPointsRedeemed)) || 0;
    if (pointsToRefund <= 0) return null;

    const referenceId = `ORDER-REDEMPTION-REFUND-${order._id}`;
    const result = await applyWalletPoints({
      userId: order.user,
      type: "points_refund",
      pointsDelta: pointsToRefund,
      referenceId,
      description: `Refund of redeemed points for cancelled Order #${order.orderNumber || String(order._id).slice(-6)}`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        pointsRefunded: pointsToRefund,
      },
      allowBlocked: true,
    });

    return result;
  } catch (error) {
    if (error.code === 11000 || error.status === 409) return null;
    console.error("Failed to refund order redeemed points:", error);
    return null;
  }
}

// ==========================================
// USER CONTROLLER HANDLERS
// ==========================================

/**
 * GET /api/wallet or /api/wallet/me
 * Retrieves current user's wallet balance, summary stats, referral code/link, and active reward config.
 */
export async function getMyWallet(req, res) {
  try {
    const wallet = await getOrCreateUserWallet(req.user._id);
    const stats = await getUserWalletStats(req.user._id);

    const user = await User.findById(req.user._id).select("referralCode referredBy");
    let referralCode = user?.referralCode;
    if (!referralCode && user) {
      referralCode = await ensureUserReferralCode(user);
    }

    const settings = await getStoreSettings();
    const ws = settings?.walletSettings;

    const referralCount = await User.countDocuments({ referredBy: req.user._id });

    const frontendBaseUrl =
      process.env.FRONTEND_URL ||
      (req.headers.origin && !req.headers.origin.includes("localhost:5001")
        ? req.headers.origin
        : "https://bulkmobilemart.com");

    const referralLink = `${frontendBaseUrl}/?ref=${referralCode || ""}`;

    return res.status(200).json({
      success: true,
      data: {
        ...wallet.toObject(),
        stats,
        referral: {
          code: referralCode || "",
          link: referralLink,
          referredBy: user?.referredBy || null,
          referredUsersCount: referralCount,
        },
        rewardsConfig: {
          referralEnabled: ws?.referralEnabled ?? true,
          referralRewardReferee: ws?.referralRewardReferee ?? 50,
          referralRewardReferrer: ws?.referralRewardReferrer ?? 50,
          orderRewardEnabled: ws?.orderRewardEnabled ?? true,
          orderRewardThreshold: ws?.orderRewardThreshold ?? 1000,
          orderRewardPoints: ws?.orderRewardPoints ?? 25,
        },
      },
    });
  } catch (error) {
    return respondWithControllerError(res, error, "Get wallet");
  }
}

/**
 * GET /api/wallet/transactions
 * Retrieves paginated transaction history for the logged-in user.
 */
export async function getMyTransactions(req, res) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { type, status, startDate, endDate } = req.query;

    const filter = { userId: req.user._id };

    if (type) {
      const types = String(type)
        .split(",")
        .map((t) => t.trim())
        .filter((t) => VALID_TRANSACTION_TYPES.includes(t));
      if (types.length === 1) {
        filter.type = types[0];
      } else if (types.length > 1) {
        filter.type = { $in: types };
      }
    }

    if (status && ["completed", "reversed"].includes(status)) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start)) filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end)) filter.createdAt.$lte = end;
      }
      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments(filter),
    ]);

    return res.status(200).json(
      buildPaginatedResponse(transactions, total, page, limit)
    );
  } catch (error) {
    return respondWithControllerError(res, error, "Get transactions");
  }
}

/**
 * GET /api/wallet/transactions/:id
 * Retrieves a single transaction detail.
 */
export async function getTransactionById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const transaction = await WalletTransaction.findById(id).lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const isOwner =
      transaction.userId &&
      transaction.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this transaction",
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    return respondWithControllerError(res, error, "Get transaction details");
  }
}

// ==========================================
// ADMIN CONTROLLER HANDLERS
// ==========================================

/**
 * GET /api/wallet/admin/all or /api/admin/wallets
 * Admin: List all wallets with search, status filters, and pagination.
 */
export async function adminGetAllWallets(req, res) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { search, status, minBalance, maxBalance, sortBy, sortOrder } =
      req.query;

    const filter = {};

    if (status && ["active", "blocked"].includes(status)) {
      filter.status = status;
    }

    if (minBalance !== undefined || maxBalance !== undefined) {
      filter.pointsBalance = {};
      const min = Number(minBalance);
      const max = Number(maxBalance);
      if (Number.isFinite(min)) filter.pointsBalance.$gte = min;
      if (Number.isFinite(max)) filter.pointsBalance.$lte = max;
      if (Object.keys(filter.pointsBalance).length === 0) {
        delete filter.pointsBalance;
      }
    }

    if (search && typeof search === "string" && search.trim()) {
      const term = search.trim();
      const userPattern = new RegExp(escapeRegex(term), "i");
      const matchingUsers = await User.find({
        $or: [
          { name: userPattern },
          { phone: userPattern },
          { email: userPattern },
          { shopName: userPattern },
        ],
      })
        .select("_id")
        .lean();

      const userIds = matchingUsers.map((u) => u._id);
      if (userIds.length > 0) {
        filter.userId = { $in: userIds };
      } else {
        return res
          .status(200)
          .json(buildPaginatedResponse([], 0, page, limit));
      }
    }

    const sortField = ["pointsBalance", "createdAt", "updatedAt"].includes(
      sortBy
    )
      ? sortBy
      : "updatedAt";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const [wallets, total] = await Promise.all([
      Wallet.find(filter)
        .populate("userId", "name phone email role shopName shopNo")
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
      Wallet.countDocuments(filter),
    ]);

    return res
      .status(200)
      .json(buildPaginatedResponse(wallets, total, page, limit));
  } catch (error) {
    return respondWithControllerError(res, error, "Admin get all wallets");
  }
}

/**
 * GET /api/wallet/admin/user/:userId or /api/admin/wallets/users/:userId
 * Admin: Get wallet, user summary, stats, and recent transactions for a specific user.
 */
export async function adminGetWalletByUserId(req, res) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(userId)
      .select("name phone email role shopName shopNo")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wallet = await getOrCreateUserWallet(userId);
    const stats = await getUserWalletStats(userId);

    const recentTransactions = await WalletTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        wallet,
        user,
        stats,
        recentTransactions,
      },
    });
  } catch (error) {
    return respondWithControllerError(res, error, "Admin get user wallet");
  }
}

/**
 * GET /api/wallet/admin/transactions or /api/admin/wallets/transactions
 * Admin: View all transactions across all users with multi-filter and search.
 */
export async function adminGetAllTransactions(req, res) {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { userId, type, status, referenceId, search, startDate, endDate } =
      req.query;

    const filter = {};

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    if (type) {
      const types = String(type)
        .split(",")
        .map((t) => t.trim())
        .filter((t) => VALID_TRANSACTION_TYPES.includes(t));
      if (types.length === 1) {
        filter.type = types[0];
      } else if (types.length > 1) {
        filter.type = { $in: types };
      }
    }

    if (status && ["completed", "reversed"].includes(status)) {
      filter.status = status;
    }

    if (referenceId) {
      filter.referenceId = new RegExp(escapeRegex(String(referenceId).trim()), "i");
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start)) filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end)) filter.createdAt.$lte = end;
      }
      if (Object.keys(filter.createdAt).length === 0) {
        delete filter.createdAt;
      }
    }

    if (search && typeof search === "string" && search.trim()) {
      const term = search.trim();
      const pattern = new RegExp(escapeRegex(term), "i");

      const matchingUsers = await User.find({
        $or: [
          { name: pattern },
          { phone: pattern },
          { email: pattern },
        ],
      })
        .select("_id")
        .lean();

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { referenceId: pattern },
        { description: pattern },
        ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
      ];
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .populate("userId", "name phone email role shopName")
        .populate("walletId", "pointsBalance status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments(filter),
    ]);

    return res
      .status(200)
      .json(buildPaginatedResponse(transactions, total, page, limit));
  } catch (error) {
    return respondWithControllerError(res, error, "Admin get all transactions");
  }
}

/**
 * POST /api/wallet/admin/adjust or /api/admin/wallets/adjust
 * Admin: Manually credit or debit points to a user's wallet with audit logging.
 */
export async function adminAdjustWalletBalance(req, res) {
  try {
    const {
      userId,
      pointsDelta,
      type = "admin_adjustment",
      referenceId,
      description = "",
      metadata = {},
      allowBlocked = false,
    } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required",
      });
    }

    const user = await User.findById(userId).select("name email phone").lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const delta = Number(pointsDelta);
    if (!Number.isSafeInteger(delta) || delta === 0) {
      return res.status(400).json({
        success: false,
        message: "pointsDelta must be a non-zero whole integer (e.g. 50 or -50)",
      });
    }

    // Generate unique reference if none provided
    const refId =
      referenceId && String(referenceId).trim()
        ? String(referenceId).trim()
        : `ADJ-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const adminAuditMetadata = {
      ...metadata,
      adjustedBy: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      adminPhone: req.user.phone,
    };

    const result = await applyWalletPoints({
      userId,
      type,
      pointsDelta: delta,
      referenceId: refId,
      description: description || (delta > 0 ? "Admin credit adjustment" : "Admin debit adjustment"),
      metadata: adminAuditMetadata,
      allowBlocked: Boolean(allowBlocked),
    });

    return res.status(200).json({
      success: true,
      message: `Successfully ${delta > 0 ? "credited" : "debited"} ${Math.abs(delta)} points`,
      data: result,
    });
  } catch (error) {
    return respondWithControllerError(res, error, "Admin adjust wallet balance");
  }
}

/**
 * PATCH or PUT /api/wallet/admin/user/:userId/status or /api/admin/wallets/users/:userId/status
 * Admin: Change a wallet's status ("active" | "blocked").
 */
export async function adminUpdateWalletStatus(req, res) {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required",
      });
    }

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'active' or 'blocked'",
      });
    }

    const wallet = await getOrCreateUserWallet(userId);
    wallet.status = status;
    await wallet.save();

    return res.status(200).json({
      success: true,
      message: `Wallet status updated to ${status}`,
      data: wallet,
    });
  } catch (error) {
    return respondWithControllerError(res, error, "Admin update wallet status");
  }
}

/**
 * POST /api/wallet/claim-referral
 * User: Claim a friend's referral code to receive welcome bonus points.
 */
export async function claimReferralCode(req, res) {
  try {
    const { referralCode } = req.body;
    if (!referralCode || typeof referralCode !== "string" || !referralCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Referral code is required",
      });
    }

    const normalizedCode = referralCode.trim().toUpperCase();

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.referredBy) {
      return res.status(400).json({
        success: false,
        message: "You have already claimed a referral code on this account",
      });
    }

    const referrer = await User.findOne({ referralCode: normalizedCode });
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral code. Please check and try again.",
      });
    }

    if (referrer._id.equals(user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot use your own referral code",
      });
    }

    user.referredBy = referrer._id;
    await user.save();

    await processReferralReward({
      newUserId: user._id,
      referrerId: referrer._id,
    });

    const settings = await getStoreSettings();
    const refereePoints = settings?.walletSettings?.referralRewardReferee ?? 50;

    return res.status(200).json({
      success: true,
      message: `Referral code applied! You earned ${refereePoints} bonus points.`,
      data: {
        pointsEarned: refereePoints,
        referrerName: referrer.name,
      },
    });
  } catch (error) {
    return respondWithControllerError(res, error, "Claim referral code");
  }
}

/**
 * GET /api/wallet/settings
 * Public/User: Get current referral and transaction reward thresholds and point amounts.
 */
export async function getWalletSettings(req, res) {
  try {
    const settings = await getStoreSettings();
    return res.status(200).json({
      success: true,
      data: settings?.walletSettings,
    });
  } catch (error) {
    return respondWithControllerError(res, error, "Get wallet settings");
  }
}

/**
 * PUT /api/wallet/admin/settings or /api/admin/wallets/settings
 * Admin: Configure referral points and transaction reward threshold/points.
 */
export async function adminUpdateWalletSettings(req, res) {
  try {
    const normalized = normalizeWalletSettings(req.body);

    let doc = await StoreSettings.findOne({ key: "store" });
    if (!doc) {
      doc = await StoreSettings.create({
        key: "store",
        walletSettings: normalized,
      });
    } else {
      doc.set("walletSettings", normalized);
      doc.markModified("walletSettings");
      await doc.save();
    }

    clearStoreSettingsCache();

    return res.status(200).json({
      success: true,
      message: "Wallet & rewards settings updated successfully",
      data: doc.walletSettings,
    });
  } catch (error) {
    return respondWithControllerError(res, error, "Update wallet settings");
  }
}
