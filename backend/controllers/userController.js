import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { buildPaginatedResponse, getPaginationParams } from "../utils/pagination.js";
import { escapeRegex } from "../utils/adminSearch.js";
import {
  normalizeIndianPhone,
  sendLoginOtp as dispatchLoginOtp,
  verifyLoginOtp as validateLoginOtp,
  markPhoneOtpVerified,
  consumeVerifiedPhone,
} from "../utils/msg91.js";

const signToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured on the server");
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const formatAuthUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  shopNo: user.shopNo || "",
  gstNumber: user.gstNumber || "",
  role: user.role,
});

function pickOptionalSignupFields(body) {
  const fields = {};
  if (body.shopNo?.trim()) fields.shopNo = body.shopNo.trim();
  if (body.gstNumber?.trim()) fields.gstNumber = body.gstNumber.trim().toUpperCase();
  return fields;
}

export const signup = async (_req, res) => {
  res.status(403).json({
    success: false,
    message: "Please sign up with your phone number and OTP.",
  });
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

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Please sign in with OTP on the website or app.",
      });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        user: formatAuthUser(user),
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendOtpLogin = async (req, res) => {
  try {
    const phone = normalizeIndianPhone(req.body.phone);

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone must be 10 digits starting with 6, 7, 8, or 9",
      });
    }

    const result = await dispatchLoginOtp(phone);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { phone },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send OTP",
    });
  }
};

export const verifyOtpLogin = async (req, res) => {
  try {
    const phone = normalizeIndianPhone(req.body.phone);
    const { otp, name } = req.body;
    const optionalSignupFields = pickOptionalSignupFields(req.body);

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone must be 10 digits starting with 6, 7, 8, or 9",
      });
    }

    const verification = await validateLoginOtp(phone, otp);
    if (!verification.ok) {
      return res.status(400).json({
        success: false,
        message: verification.message,
      });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      if (!name?.trim()) {
        markPhoneOtpVerified(phone);
        return res.status(200).json({
          success: true,
          data: {
            needsSignup: true,
            phone,
          },
        });
      }

      user = await User.create({
        name: name.trim(),
        phone,
        role: "user",
        ...optionalSignupFields,
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Please use the admin panel to sign in.",
      });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        user: formatAuthUser(user),
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

export const completeOtpSignup = async (req, res) => {
  try {
    const phone = normalizeIndianPhone(req.body.phone);
    const { name } = req.body;
    const optionalSignupFields = pickOptionalSignupFields(req.body);

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone must be 10 digits starting with 6, 7, 8, or 9",
      });
    }

    if (!consumeVerifiedPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "OTP verification expired. Please verify your phone again.",
      });
    }

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const existingPhoneUser = await User.findOne({ phone });
    if (existingPhoneUser) {
      const token = signToken(existingPhoneUser._id);
      return res.status(200).json({
        success: true,
        data: {
          user: formatAuthUser(existingPhoneUser),
          token,
        },
      });
    }

    const user = await User.create({
      name: name.trim(),
      phone,
      role: "user",
      ...optionalSignupFields,
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: formatAuthUser(user),
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

export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        shopNo: req.user.shopNo || "",
        gstNumber: req.user.gstNumber || "",
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

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Password change is not available for OTP sign-in accounts",
      });
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
      const trimmedEmail = String(email).trim();
      if (trimmedEmail) {
        updates.email = trimmedEmail.toLowerCase();
      } else {
        updates.email = undefined;
      }
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

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (updates.name) user.name = updates.name;
    if (updates.phone) user.phone = updates.phone;
    if (email !== undefined) {
      user.email = updates.email;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        shopNo: user.shopNo || "",
        gstNumber: user.gstNumber || "",
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

    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
    }

    const conflictFilters = [{ phone: phone.trim() }];
    if (email?.trim()) {
      conflictFilters.push({ email: email.trim().toLowerCase() });
    }

    const existingUser = await User.findOne({ $or: conflictFilters });

    if (existingUser) {
      const field = existingUser.phone === phone.trim() ? "Phone" : "Email";
      return res.status(409).json({
        success: false,
        message: `${field} is already registered`,
      });
    }

    const user = await User.create({
      name: name.trim(),
      ...(email?.trim() ? { email: email.trim().toLowerCase() } : {}),
      phone: phone.trim(),
      ...(password ? { password } : {}),
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
