import Address from "../models/address/Address.js";
import User from "../models/user.js";

const REQUIRED_FIELDS = [
  "fullName",
  "number",
  "email",
  "shopNo",
  "shopName",
  "fullAddress",
  "landmark",
  "city",
  "state",
  "pincode",
];

function normalizeAddressBody(body) {
  return {
    fullName: (body.fullName || body.name || "").trim(),
    number: String(body.number || body.phone || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    shopNo: (body.shopNo || "").trim(),
    shopName: (body.shopName || "").trim(),
    fullAddress: (body.fullAddress || body.streetArea || "").trim(),
    landmark: (body.landmark || "").trim(),
    city: (body.city || "").trim(),
    state: (body.state || "").trim(),
    pincode: String(body.pincode || "").trim(),
    isDefault: body.isDefault,
  };
}

function formatValidationError(error) {
  if (error.name === "ValidationError" && error.errors) {
    const first = Object.values(error.errors)[0];
    return first?.message || "Invalid address data";
  }
  return error.message;
}

function getMissingFields(data) {
  return REQUIRED_FIELDS.filter((field) => !data[field]);
}

export const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({ success: true, data: addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addAddress = async (req, res) => {
  try {
    const normalized = normalizeAddressBody(req.body);
    const { isDefault } = normalized;
    const missing = getMissingFields(normalized);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All address fields are required",
      });
    }

    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id },
        { $set: { isDefault: false } }
      );
    }

    const addressCount = await Address.countDocuments({ user: req.user._id });
    const shouldBeDefault = isDefault || addressCount === 0;

    const address = await Address.create({
      user: req.user._id,
      ...normalized,
      isDefault: shouldBeDefault,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { addresses: address._id },
    });

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: address,
    });
  } catch (error) {
    const message = formatValidationError(error);
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({ _id: id, user: req.user._id });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const normalized = normalizeAddressBody({ ...address.toObject(), ...req.body });
    const { isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    REQUIRED_FIELDS.forEach((field) => {
      address[field] = normalized[field];
    });

    if (isDefault !== undefined) address.isDefault = isDefault;

    await address.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: address,
    });
  } catch (error) {
    const message = formatValidationError(error);
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOneAndDelete({ _id: id, user: req.user._id });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { addresses: address._id },
    });

    if (address.isDefault) {
      const nextDefault = await Address.findOne({ user: req.user._id }).sort({
        createdAt: -1,
      });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
