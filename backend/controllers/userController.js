import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { buildPaginatedResponse, getPaginationParams } from "../utils/pagination.js";
import { escapeRegex } from "../utils/adminSearch.js";

const signToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured on the server");
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and password are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.trim().toLowerCase() }, { phone: phone.trim() }],
    });

    if (existingUser) {
      const field =
        existingUser.email === email.trim().toLowerCase() ? "Email" : "Phone";
      return res.status(409).json({
        success: false,
        message: `${field} is already registered`,
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      role: "user",
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: "Name is required" });
      }
      updates.name = String(name).trim();
    }

    if (email !== undefined) {
      if (!String(email).trim()) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }
      updates.email = String(email).trim().toLowerCase();
    }

    if (phone !== undefined) {
      if (!String(phone).trim()) {
        return res.status(400).json({ success: false, message: "Phone is required" });
      }
      updates.phone = String(phone).trim();
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "No profile fields to update",
      });
    }

    const conflictFilters = [];
    if (updates.email) conflictFilters.push({ email: updates.email });
    if (updates.phone) conflictFilters.push({ phone: updates.phone });

    if (conflictFilters.length) {
      const existingUser = await User.findOne({
        _id: { $ne: req.user._id },
        $or: conflictFilters,
      });

      if (existingUser) {
        const field = existingUser.email === updates.email ? "Email" : "Phone";
        return res.status(409).json({
          success: false,
          message: `${field} is already registered`,
        });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, and password are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.trim().toLowerCase() }, { phone: phone.trim() }],
    });

    if (existingUser) {
      const field =
        existingUser.email === email.trim().toLowerCase() ? "Email" : "Phone";
      return res.status(409).json({
        success: false,
        message: `${field} is already registered`,
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      role: "user",
    });

    res.status(201).json({
      success: true,
      message: "User created",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { role: { $ne: "admin" } };

    const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";

    if (name) {
      filter.name = { $regex: escapeRegex(name), $options: "i" };
    }

    if (phone) {
      filter.phone = { $regex: escapeRegex(phone), $options: "i" };
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    res.status(200).json(buildPaginatedResponse(users, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (email?.trim()) {
      const existing = await User.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: user._id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered",
        });
      }
      user.email = email.trim();
    }

    if (phone?.trim()) {
      const existing = await User.findOne({
        phone: phone.trim(),
        _id: { $ne: user._id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Phone is already registered",
        });
      }
      user.phone = phone.trim();
    }

    if (name?.trim()) user.name = name.trim();
    if (password) user.password = password;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res.status(400).json({ success: false, message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
