import Address from "../models/address/Address.js";
import User from "../models/user.js";

function normalizeAddressBody(body) {
  return {
    name: (body.name || body.fullName || "").trim(),
    number: String(body.number || body.phone || "").trim(),
    landmark: (body.landmark || body.streetArea || "").trim(),
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
    const { name, number, landmark, city, state, pincode, isDefault } =
      normalizeAddressBody(req.body);

    if (!name || !number || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Name, phone number, city, state and pincode are required",
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
      name,
      number,
      landmark: landmark || "",
      city,
      state,
      pincode,
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

    const normalized = normalizeAddressBody(req.body);
    const { isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany(
        { user: req.user._id, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    if (req.body.name !== undefined || req.body.fullName !== undefined) {
      address.name = normalized.name;
    }
    if (req.body.number !== undefined || req.body.phone !== undefined) {
      address.number = normalized.number;
    }
    if (req.body.landmark !== undefined || req.body.streetArea !== undefined) {
      address.landmark = normalized.landmark;
    }
    if (req.body.city !== undefined) address.city = normalized.city;
    if (req.body.state !== undefined) address.state = normalized.state;
    if (req.body.pincode !== undefined) address.pincode = normalized.pincode;
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
