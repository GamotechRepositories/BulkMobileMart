import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/dbconfig.js";
import "./models/user.js";
import heroBannerRoutes from "./routes/heroBannerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.warn(
    "Warning: JWT_SECRET is not set in .env — signup and login will fail until you add it."
  );
}

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "BulkMobileMart API is running" });
});

app.use("/api/herobanners", heroBannerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app;
