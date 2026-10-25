
import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserBulkMart",
      required: true
    },

    type: {
      type: String,
      enum: [
        "referral_reward",
        "cashback",
        "points_redemption",
        "points_expiry",
        "reward_reversal",
        "admin_adjustment",
        "points_refund"
      ],
      required: true
    },

    pointsDelta: {
      type: Number,
      required: true,
      validate: Number.isSafeInteger
    },

    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger
    },

    status: {
      type: String,
      enum: ["completed", "reversed"],
      default: "completed"
    },

    referenceId: {
      type: String,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

walletTransactionSchema.index({
  walletId: 1,
  createdAt: -1
});

walletTransactionSchema.index({
  userId: 1,
  createdAt: -1
});

walletTransactionSchema.index(
  { type: 1, referenceId: 1 },
  { unique: true }
);

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

export default WalletTransaction;
