import express from "express";
import { protect, requireAdmin } from "../middleware/authMiddleware.js";
import { signup, login, getMe, updateMe, changeMyPassword, createUser, getUsers, updateUser, deleteUser } from "../controllers/userController.js";
import { addAddressForUser, getAddressesForUser } from "../controllers/addressController.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/me/password", protect, changeMyPassword);
router.get("/", protect, requireAdmin, getUsers);
router.post("/", protect, requireAdmin, createUser);
router.get("/:userId/addresses", protect, requireAdmin, getAddressesForUser);
router.post("/:userId/addresses", protect, requireAdmin, addAddressForUser);
router.put("/:id", protect, requireAdmin, updateUser);
router.delete("/:id", protect, requireAdmin, deleteUser);

export default router;
