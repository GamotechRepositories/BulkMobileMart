import SupportMessage, { SUPPORT_ISSUE_TYPES } from "../models/support/SupportMessage.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENT_LENGTH = 2_500_000;

function normalizeText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function isValidDataUrl(value) {
  return typeof value === "string" && /^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(value);
}

export const submitSupportMessage = async (req, res) => {
  try {
    const name = normalizeText(req.body.name, 100);
    const email = normalizeText(req.body.email, 150).toLowerCase();
    const phone = normalizeText(req.body.phone, 20);
    const orderId = normalizeText(req.body.orderId, 50);
    const issueType = normalizeText(req.body.issueType, 50);
    const message = normalizeText(req.body.message, 2000);
    const attachment = typeof req.body.attachment === "string" ? req.body.attachment : "";
    const attachmentName = normalizeText(req.body.attachmentName, 200);

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: "Valid email is required" });
    }
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }
    if (!issueType || !SUPPORT_ISSUE_TYPES.includes(issueType)) {
      return res.status(400).json({ success: false, message: "Valid issue type is required" });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }
    if (attachment && !isValidDataUrl(attachment)) {
      return res.status(400).json({
        success: false,
        message: "Attachment must be a JPG, PNG, WEBP, or GIF image",
      });
    }
    if (attachment && attachment.length > MAX_ATTACHMENT_LENGTH) {
      return res.status(400).json({
        success: false,
        message: "Attachment is too large. Please upload an image under 2 MB",
      });
    }

    const supportMessage = await SupportMessage.create({
      name,
      email,
      phone,
      orderId,
      issueType,
      message,
      attachment,
      attachmentName,
      user: req.user?._id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Your support request has been submitted. We will get back to you soon.",
      data: { id: supportMessage._id },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit support request",
    });
  }
};

export const getAllSupportMessages = async (req, res) => {
  try {
    const messages = await SupportMessage.find()
      .sort({ createdAt: -1 })
      .select("name email phone orderId issueType message attachmentName status createdAt attachment")
      .lean();

    const data = messages.map(({ attachment, ...rest }) => ({
      ...rest,
      hasAttachment: Boolean(attachment),
    }));

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support messages",
    });
  }
};

export const getSupportMessageById = async (req, res) => {
  try {
    const message = await SupportMessage.findById(req.params.id).lean();

    if (!message) {
      return res.status(404).json({ success: false, message: "Support message not found" });
    }

    return res.json({ success: true, data: message });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load support message",
    });
  }
};

export const updateSupportMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["open", "resolved"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const message = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select("-attachment");

    if (!message) {
      return res.status(404).json({ success: false, message: "Support message not found" });
    }

    return res.json({
      success: true,
      message: "Status updated",
      data: message,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update support message",
    });
  }
};
