import mongoose from "mongoose";
import { addressSnapshotSchema } from "../address/Address.js";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BulkMobileMartProduct",
      required: true,
    },
    name: { type: String, required: true },
    brandName: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: "" },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserBulkMart",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      validate: {
        validator(value) {
          return !value || /^\d{6}$/.test(value);
        },
        message: "Order number must be a 6-digit number",
      },
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator(v) {
          return v.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    deliveryAddress: {
      type: addressSnapshotSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "online"],
      required: true,
    },
    subtotal: { type: Number, required: true },
    deliveryCharges: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["confirm", "processing", "shipping", "delivered", "cancelled"],
      default: "confirm",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

function applyDeliveredPaymentRule(update) {
  if (!update) return;

  const $set = update.$set || update;
  if ($set.status === "delivered") {
    if (update.$set) {
      update.$set.paymentStatus = "paid";
    } else {
      update.paymentStatus = "paid";
    }
  }
}

orderSchema.pre("findOneAndUpdate", function setPaidOnDeliveredUpdate() {
  applyDeliveredPaymentRule(this.getUpdate());
});

orderSchema.pre("save", async function preSaveOrder() {
  if (this.isModified("status") && this.status === "delivered") {
    this.paymentStatus = "paid";
  }

  if (this.orderNumber && /^\d{6}$/.test(this.orderNumber)) return;

  const OrderModel = this.constructor;
  let orderNumber;
  let exists = true;

  while (exists) {
    orderNumber = String(Math.floor(100000 + Math.random() * 900000));
    exists = await OrderModel.exists({ orderNumber });
  }

  this.orderNumber = orderNumber;
});

const Order = mongoose.model("Order", orderSchema);

export default Order;
