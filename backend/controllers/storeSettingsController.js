import StoreSettings from "../models/StoreSettings.js";
import {
  clearStoreSettingsCache,
  getStoreSettings,
  normalizeShippingSlabs,
  serializeStoreSettings,
} from "../utils/storeSettingsHelpers.js";

const sanitizeNoticeLines = (lines) =>
  Array.isArray(lines)
    ? lines.map((line) => String(line || "").trim()).filter(Boolean)
    : undefined;

const sanitizeText = (value) => {
  if (value === undefined) return undefined;
  return String(value || "").trim();
};

const isValidUpiId = (value) => /^[\w.-]+@[\w.-]+$/.test(String(value || "").trim());

export const getPublicStoreSettings = async (_req, res) => {
  try {
    const settings = await getStoreSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminStoreSettings = async (_req, res) => {
  try {
    const settings = await getStoreSettings({ forceRefresh: true });
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStoreSettings = async (req, res) => {
  try {
    const {
      minimumOrderValue,
      minimumShippingCharge,
      shippingSlabs,
      merchantUpiId,
      merchantUpiName,
      cartNoticeEn,
      cartNoticeHi,
    } = req.body;

    const payload = {};

    if (minimumOrderValue !== undefined) {
      const value = Number(minimumOrderValue);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum order value must be a valid number",
        });
      }
      payload.minimumOrderValue = value;
    }

    if (minimumShippingCharge !== undefined) {
      const value = Number(minimumShippingCharge);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum shipping charge must be a valid number",
        });
      }
      payload.minimumShippingCharge = value;
    }

    if (shippingSlabs !== undefined) {
      const normalized = normalizeShippingSlabs(shippingSlabs);
      if (!normalized.length) {
        return res.status(400).json({
          success: false,
          message: "Add at least one shipping slab",
        });
      }
      payload.shippingSlabs = normalized;
    }

    if (merchantUpiId !== undefined) {
      const upiId = sanitizeText(merchantUpiId);
      if (upiId && !isValidUpiId(upiId)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid UPI ID (example: merchant@upi)",
        });
      }
      payload.merchantUpiId = upiId;
    }

    if (merchantUpiName !== undefined) {
      payload.merchantUpiName = sanitizeText(merchantUpiName) || "BulkMobileMart";
    }

    const noticeEn = sanitizeNoticeLines(cartNoticeEn);
    if (noticeEn) payload.cartNoticeEn = noticeEn;

    const noticeHi = sanitizeNoticeLines(cartNoticeHi);
    if (noticeHi) payload.cartNoticeHi = noticeHi;

    let doc = await StoreSettings.findOne({ key: "store" });
    if (!doc) {
      doc = await StoreSettings.create({ key: "store", ...payload });
    } else {
      Object.assign(doc, payload);
      await doc.save();
    }

    clearStoreSettingsCache();
    const settings = serializeStoreSettings(doc);

    res.status(200).json({
      success: true,
      message: "Store settings updated",
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
