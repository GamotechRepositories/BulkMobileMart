
import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserBulkMart",
      required: true,
      unique: true
    },

    pointsBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: Number.isSafeInteger
    },

    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active"
    }
  },
  {
    timestamps: true
  }
);

const Wallet = mongoose.model("Wallet", walletSchema);

export default Wallet;
