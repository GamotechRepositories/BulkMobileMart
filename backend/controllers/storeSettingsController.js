import StoreSettings from "../models/StoreSettings.js";
import {
  clearStoreSettingsCache,
  getStoreSettings,
  normalizeMerchantUpiAccounts,
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

const sanitizeMerchantUpiAccounts = (accounts, defaultPayeeName = "BulkMobileMart") => {
  if (!Array.isArray(accounts)) return undefined;

  const normalized = accounts
    .map((account) => ({
      upiId: sanitizeText(account?.upiId) || "",
      label: sanitizeText(account?.label) || defaultPayeeName,
      enabled: account?.enabled !== false,
    }))
    .filter((account) => account.upiId);

  for (const account of normalized) {
    if (!isValidUpiId(account.upiId)) {
      return {
        error: `Enter a valid UPI ID (example: merchant@upi). Invalid: ${account.upiId}`,
      };
    }
  }

  let activeAssigned = false;
  const singleActiveAccounts = normalized.map((account) => {
    if (account.enabled && !activeAssigned) {
      activeAssigned = true;
      return account;
    }
    return { ...account, enabled: false };
  });

  return { accounts: singleActiveAccounts };
};

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
    const doc = await StoreSettings.findOne({ key: "store" });
    const settings = serializeStoreSettings(doc, { admin: true });
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
      merchantUpiAccounts,
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

    const defaultPayeeName = sanitizeText(merchantUpiName) || "BulkMobileMart";

    if (merchantUpiAccounts !== undefined) {
      const result = sanitizeMerchantUpiAccounts(merchantUpiAccounts, defaultPayeeName);
      if (result?.error) {
        return res.status(400).json({ success: false, message: result.error });
      }

      payload.merchantUpiAccounts = result.accounts;
      const primary = result.accounts.find((account) => account.enabled) || result.accounts[0];
      payload.merchantUpiId = primary?.upiId || "";
      payload.merchantUpiName = primary?.label || defaultPayeeName;
    } else if (merchantUpiId !== undefined || merchantUpiName !== undefined) {
      const upiId = sanitizeText(merchantUpiId) || "";
      if (upiId && !isValidUpiId(upiId)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid UPI ID (example: merchant@upi)",
        });
      }

      payload.merchantUpiId = upiId;
      payload.merchantUpiName = defaultPayeeName;
      payload.merchantUpiAccounts = upiId
        ? [{ upiId, label: defaultPayeeName, enabled: true }]
        : [];
    }

    if (merchantUpiName !== undefined && merchantUpiAccounts === undefined) {
      payload.merchantUpiName = defaultPayeeName;
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
    const settings = serializeStoreSettings(doc, { admin: true });

    res.status(200).json({
      success: true,
      message: "Store settings updated",
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
