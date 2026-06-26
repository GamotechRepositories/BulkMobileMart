import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const VERIFIED_PHONE_TTL_MS = 10 * 60 * 1000;
const devOtpStore = new Map();
const verifiedPhoneStore = new Map();

function isMsg91Configured() {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  if (!authKey) return false;
  return !/^(your|xxx|test)/i.test(authKey);
}

export function normalizeIndianPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10 && /^[6789]/.test(digits)) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  return null;
}

export function toMsg91Mobile(phone10) {
  return `91${phone10}`;
}

function generateDevOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function storeDevOtp(phone10, otp) {
  devOtpStore.set(phone10, {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
  });
}

function verifyDevOtp(phone10, otp) {
  const entry = devOtpStore.get(phone10);
  if (!entry) {
    return { ok: false, message: "OTP expired or not found. Please request a new OTP." };
  }
  if (Date.now() > entry.expiresAt) {
    devOtpStore.delete(phone10);
    return { ok: false, message: "OTP has expired. Please request a new OTP." };
  }
  if (String(entry.otp) !== String(otp).trim()) {
    return { ok: false, message: "Invalid OTP. Please try again." };
  }
  devOtpStore.delete(phone10);
  return { ok: true };
}

async function parseMsg91Response(response) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data.message || data.type || `MSG91 request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function sendLoginOtp(phone10) {
  if (isMsg91Configured()) {
    const templateId = process.env.MSG91_TEMPLATE_ID?.trim();
    if (!templateId || /your/i.test(templateId)) {
      throw new Error("MSG91_TEMPLATE_ID is not configured on the server");
    }

    const params = new URLSearchParams({
      template_id: templateId,
      mobile: toMsg91Mobile(phone10),
      otp_length: String(OTP_LENGTH),
      otp_expiry: String(OTP_EXPIRY_MINUTES),
    });

    const senderId = process.env.MSG91_SENDER_ID?.trim();
    if (senderId) {
      params.set("sender", senderId);
    }

    const response = await fetch(
      `https://control.msg91.com/api/v5/otp?${params.toString()}`,
      {
        method: "POST",
        headers: {
          authkey: process.env.MSG91_AUTH_KEY.trim(),
          "Content-Type": "application/json",
        },
      }
    );

    const data = await parseMsg91Response(response);
    if (data.type === "error") {
      throw new Error(data.message || "Failed to send OTP");
    }

    return { mode: "msg91", message: "OTP sent successfully" };
  }

  const otp = generateDevOtp();
  storeDevOtp(phone10, otp);
  console.warn(
    `[OTP DEV] MSG91 not configured. OTP for ${phone10}: ${otp} (expires in ${OTP_EXPIRY_MINUTES} min)`
  );

  return {
    mode: "dev",
    message: "OTP sent successfully",
    devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
  };
}

export async function verifyLoginOtp(phone10, otp) {
  if (!otp || !/^\d{4,8}$/.test(String(otp).trim())) {
    return { ok: false, message: "Please enter a valid OTP" };
  }

  if (isMsg91Configured()) {
    const params = new URLSearchParams({
      mobile: toMsg91Mobile(phone10),
      otp: String(otp).trim(),
    });

    const response = await fetch(
      `https://control.msg91.com/api/v5/otp/verify?${params.toString()}`,
      {
        method: "GET",
        headers: {
          authkey: process.env.MSG91_AUTH_KEY.trim(),
          accept: "application/json",
        },
      }
    );

    try {
      const data = await parseMsg91Response(response);
      if (data.type === "error") {
        return { ok: false, message: data.message || "Invalid OTP" };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message || "OTP verification failed" };
    }
  }

  return verifyDevOtp(phone10, otp);
}

export function markPhoneOtpVerified(phone10) {
  verifiedPhoneStore.set(phone10, Date.now() + VERIFIED_PHONE_TTL_MS);
}

export function consumeVerifiedPhone(phone10) {
  const expiresAt = verifiedPhoneStore.get(phone10);
  if (!expiresAt || Date.now() > expiresAt) {
    verifiedPhoneStore.delete(phone10);
    return false;
  }
  verifiedPhoneStore.delete(phone10);
  return true;
}

export function isPhoneOtpVerified(phone10) {
  const expiresAt = verifiedPhoneStore.get(phone10);
  if (!expiresAt || Date.now() > expiresAt) {
    verifiedPhoneStore.delete(phone10);
    return false;
  }
  return true;
}
