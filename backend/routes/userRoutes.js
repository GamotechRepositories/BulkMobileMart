import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { signup, login, getMe, getUsers, updateUser, deleteUser } from "../controllers/userController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, getMe);
router.get("/", protect, requireAdmin, getUsers);
router.put("/:id", protect, requireAdmin, updateUser);
router.delete("/:id", protect, requireAdmin, deleteUser);

export default router;
