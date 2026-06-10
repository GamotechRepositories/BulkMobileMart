import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/dbconfig.js";
import HeroBanner from "../models/HeroBanner.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

const CATEGORIES = [
  {
    categoryName: "Chargers",
    categoryImage: "",
    subcategories: ["Fast Charger", "Car Charger", "Wireless Charger"],
  },
  {
    categoryName: "Earphones",
    categoryImage: "",
    subcategories: ["Wired", "Wireless", "Earbuds"],
  },
  {
    categoryName: "Cables",
    categoryImage: "",
    subcategories: ["Type-C", "Lightning", "Micro USB"],
  },
  {
    categoryName: "Neckbands",
    categoryImage: "",
    subcategories: ["Bluetooth", "Sports"],
  },
  {
    categoryName: "Power Banks",
    categoryImage: "",
    subcategories: ["10000mAh", "20000mAh"],
  },
  {
    categoryName: "Smart Watches",
    categoryImage: "",
    subcategories: ["Fitness", "Kids"],
  },
  {
    categoryName: "Bluetooth Speakers",
    categoryImage: "",
    subcategories: ["Portable", "Party"],
  },
  {
    categoryName: "Mobile Covers",
    categoryImage: "",
    subcategories: ["Silicone", "Hard Case"],
  },
  {
    categoryName: "Tempered Glass",
    categoryImage: "",
    subcategories: ["9H", "Privacy"],
  },
  {
    categoryName: "Adapters",
    categoryImage: "",
    subcategories: ["OTG", "Audio Jack"],
  },
];

const PRODUCTS = [
  {
    name: "Fast Charger 20W",
    categories: ["Chargers"],
    subcategory: "Fast Charger",
    brandName: "BulkMart",
    price: 299,
    discountedPrice: 165,
    discountedPercent: 45,
    stock: 100,
    ratings: 4.5,
    productImages: [
      "https://images.unsplash.com/photo-1591290619762-d2a4c81c3f67?w=400",
    ],
    description: "20W fast charging adapter with Type-C cable.",
    features: ["20W Output", "BIS Certified"],
    warranty: "6 months",
  },
  {
    name: "Bass Edition Neckband",
    categories: ["Neckbands"],
    subcategory: "Bluetooth",
    brandName: "BulkMart",
    price: 599,
    discountedPrice: 299,
    discountedPercent: 50,
    stock: 80,
    ratings: 4.2,
    productImages: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
    ],
    description: "Wireless neckband with deep bass.",
    features: ["12hr Battery", "IPX5"],
    warranty: "1 year",
  },
  {
    name: "Type-C Cable 1M",
    categories: ["Cables"],
    subcategory: "Type-C",
    brandName: "BulkMart",
    price: 149,
    discountedPrice: 89,
    discountedPercent: 40,
    stock: 200,
    ratings: 4.0,
    productImages: [
      "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400",
    ],
    description: "Durable braided Type-C cable.",
    features: ["1 Meter", "Fast Charge"],
    warranty: "3 months",
  },
  {
    name: "Power Bank 10000mAh",
    categories: ["Power Banks"],
    subcategory: "10000mAh",
    brandName: "BulkMart",
    price: 1299,
    discountedPrice: 799,
    discountedPercent: 38,
    stock: 50,
    ratings: 4.6,
    productImages: [
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400",
    ],
    description: "Compact 10000mAh power bank with dual USB.",
    features: ["Dual Port", "LED Indicator"],
    warranty: "1 year",
  },
  {
    name: "Wireless Earbuds Pro",
    categories: ["Earphones"],
    subcategory: "Earbuds",
    brandName: "BulkMart",
    price: 999,
    discountedPrice: 499,
    discountedPercent: 50,
    stock: 60,
    ratings: 4.3,
    productImages: [
      "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400",
    ],
    description: "True wireless earbuds with charging case.",
    features: ["Touch Control", "20hr Playback"],
    warranty: "1 year",
  },
  {
    name: "Dual Port Car Charger",
    categories: ["Chargers"],
    subcategory: "Car Charger",
    brandName: "BulkMart",
    price: 399,
    discountedPrice: 249,
    discountedPercent: 38,
    stock: 75,
    ratings: 4.1,
    productImages: [
      "https://images.unsplash.com/photo-1618005198919-d86d5f5b4a9f?w=400",
    ],
    description: "Fast dual USB car charger.",
    features: ["Dual USB", "LED Light"],
    warranty: "6 months",
  },
];

async function seed() {
  await connectDB();

  const existingCategories = await Category.countDocuments();
  const existingProducts = await Product.countDocuments();
  const existingBanners = await HeroBanner.countDocuments();

  if (existingCategories === 0) {
    await Category.insertMany(CATEGORIES);
    console.log(`Seeded ${CATEGORIES.length} categories`);
  } else {
    console.log(`Categories already exist (${existingCategories}), skipping`);
  }

  if (existingBanners === 0) {
    await HeroBanner.create({
      imageUrl: "/hero-banner.webp",
      alt: "BulkMobileMart wholesale mobile accessories",
      order: 0,
    });
    console.log("Seeded 1 hero banner");
  } else {
    console.log(`Hero banners already exist (${existingBanners}), skipping`);
  }

  if (existingProducts === 0) {
    await Product.insertMany(PRODUCTS);
    console.log(`Seeded ${PRODUCTS.length} products`);
  } else {
    console.log(`Products already exist (${existingProducts}), skipping`);
  }

  const summary = {
    database: mongoose.connection.name,
    categories: await Category.countDocuments(),
    products: await Product.countDocuments(),
    banners: await HeroBanner.countDocuments(),
  };

  console.log("Seed complete:", summary);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
