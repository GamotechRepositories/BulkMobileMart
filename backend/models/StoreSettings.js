import mongoose from "mongoose";

const shippingSlabSchema = new mongoose.Schema(
  {
    orderAmount: {
      type: Number,
      required: true,
      min: [0, "Order amount must be 0 or more"],
    },
    shippingCharge: {
      type: Number,
      required: true,
      min: [0, "Shipping charge must be 0 or more"],
    },
  },
  { _id: false }
);

const storeSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "store",
      unique: true,
      immutable: true,
    },
    minimumOrderValue: {
      type: Number,
      default: 3000,
      min: [0, "Minimum order value must be 0 or more"],
    },
    minimumShippingCharge: {
      type: Number,
      default: 280,
      min: [0, "Minimum shipping charge must be 0 or more"],
    },
    shippingSlabs: {
      type: [shippingSlabSchema],
      default: () => [
        { orderAmount: 3000, shippingCharge: 280 },
        { orderAmount: 5000, shippingCharge: 350 },
        { orderAmount: 8000, shippingCharge: 550 },
        { orderAmount: 12000, shippingCharge: 800 },
      ],
    },
    merchantUpiId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    merchantUpiName: {
      type: String,
      default: "BulkMobileMart",
      trim: true,
      maxlength: 100,
    },
    cartNoticeEn: {
      type: [String],
      default: () => [
        "Please Verify Your Address Before Placing Your Order.",
        "Minimum order value ₹{{minOrder}}",
        "Parcel opening video is must for return.",
        "Shipping depends on parcel weight minimum Rs {{minShipping}}.",
        "User have to pay shipping charges in advance.",
      ],
    },
    cartNoticeHi: {
      type: [String],
      default: () => [
        "कृपया अपना पूरा पता ठीक से लिखें ऑर्डर करने से पहले। इसके बाद ऑर्डर करें।",
        "न्यूनतम ऑर्डर मूल्य {{minOrder}}.",
        "पार्सल वापसी के लिए पार्सल खोलने का वीडियो अनिवार्य है।",
        "शिपिंग पार्सल के वजन पर निर्भर करता है न्यूनतम {{minShipping}}/",
        "उपयोगकर्ता को शिपिंग शुल्क अग्रिम रूप से देना होगा।",
      ],
    },
  },
  { timestamps: true }
);

const StoreSettings =
  mongoose.models.StoreSettings ||
  mongoose.model("StoreSettings", storeSettingsSchema);

export default StoreSettings;
