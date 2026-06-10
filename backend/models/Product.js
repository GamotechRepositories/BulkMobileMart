import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    categories: {
      type: [String],
      required: [true, "At least one category is required"],
      validate: [
        {
          validator(value) {
            return Array.isArray(value) && value.length >= 1;
          },
          message: "At least 1 category is required",
        },
        {
          validator(value) {
            return value.length <= 4;
          },
          message: "Maximum 4 categories allowed",
        },
      ],
    },
    subcategory: {
      type: String,
      required: [true, "Subcategory name is required"],
      trim: true,
    },
    brandName: {
      type: String,
      required: [true, "Brand name is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountedPrice: {
      type: Number,
      required: [true, "Discounted price is required"],
      min: [0, "Discounted price cannot be negative"],
    },
    discountedPercent: {
      type: Number,
      required: [true, "Discounted percent is required"],
      min: [0, "Discounted percent cannot be negative"],
      max: [100, "Discounted percent cannot exceed 100"],
    },
    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
    },
    productImages: {
      type: [String],
      required: [true, "At least one product image is required"],
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length > 0 &&
            value.every((img) => typeof img === "string" && img.trim())
          );
        },
        message: "At least one valid product image URL is required",
      },
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    features: {
      type: [String],
      default: [],
    },
    warranty: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ categories: 1, subcategory: 1 });

const Product = mongoose.model(
  "BulkMobileMartProduct",
  productSchema,
  "bulkmobilemartproducts"
);

export default Product;
