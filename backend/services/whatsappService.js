import {
  getWhatsAppApiKey,
  isWhatsAppMessageConfigured,
  whatsappConfig,
} from "../config/whatsapp.js";
import { uploadBufferToS3, isS3Configured } from "../utils/s3Upload.js";
import { UPLOAD_FOLDERS } from "../utils/uploadFolders.js";
import {
  generateOrderInvoicePdfBuffer,
  getOrderInvoiceFilename,
} from "./invoicePdfService.js";

function orderRef(order) {
  const num = order?.orderNumber || "";
  if (/^\d{6}$/.test(num)) return num;
  return order?._id?.toString?.() || "";
}

function invoiceNumber(order) {
  const ref = orderRef(order);
  return ref ? `INV-${ref}` : "INV-000000";
}

function formatAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function customerName(order) {
  return (
    String(order?.deliveryAddress?.fullName || "").trim() ||
    String(order?.user?.name || "").trim() ||
    "Customer"
  );
}

function customerPhoneRaw(order) {
  return (
    order?.deliveryAddress?.number ||
    order?.user?.phone ||
    ""
  );
}

/** VoxUp expects digits with country code, e.g. 917000000000 */
export function toWhatsAppPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && /^[6789]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length > 10) return digits;
  return "";
}

function textParam(text) {
  return { type: "text", text: String(text ?? "").trim() || "-" };
}

function bodyComponent(values) {
  return {
    type: "body",
    parameters: values.map(textParam),
  };
}

function documentHeader(link, filename = "") {
  const document = { link: String(link || "").trim() };
  if (filename) {
    document.filename = String(filename).trim();
  }
  return {
    type: "header",
    parameters: [
      {
        type: "document",
        document,
      },
    ],
  };
}

async function resolveInvoiceDocumentUrl(order) {
  if (!isS3Configured()) {
    throw new Error(
      "S3 not configured — cannot upload invoice PDF for WhatsApp document header"
    );
  }

  const buffer = await generateOrderInvoicePdfBuffer(order);
  if (!buffer?.length) {
    throw new Error("Invoice PDF generation returned an empty buffer");
  }

  const uploaded = await uploadBufferToS3({
    buffer,
    mimeType: "application/pdf",
    folder: UPLOAD_FOLDERS.INVOICES,
    originalName: getOrderInvoiceFilename(order),
  });

  if (!uploaded?.url) {
    throw new Error("Invoice PDF uploaded but CDN URL was empty");
  }

  console.log(`WhatsAppService: invoice PDF uploaded — ${uploaded.url}`);
  return uploaded.url;
}

async function parseVoxUpResponse(response) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data.message ||
      data.error ||
      data.type ||
      `WhatsApp send failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function sendWhatsAppCampaign(messageType, { to, components }) {
  if (!isWhatsAppMessageConfigured(messageType)) {
    return {
      success: false,
      skipped: true,
      reason: `${messageType} WhatsApp API key is not configured`,
    };
  }

  const phone = toWhatsAppPhone(to);
  if (!phone) {
    return {
      success: false,
      skipped: true,
      reason: "Missing or invalid customer phone",
    };
  }

  const apiKey = getWhatsAppApiKey(messageType);
  const response = await fetch(whatsappConfig.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ to: phone, components }),
  });

  const data = await parseVoxUpResponse(response);
  return { success: true, skipped: false, data, to: phone, messageType };
}

function logWhatsAppResult(context, result) {
  if (!result) return;
  if (result.skipped) {
    console.warn(`WhatsAppService [${context}]: skipped — ${result.reason}`);
    return;
  }
  if (result.success) {
    console.log(`WhatsAppService [${context}]: sent to ${result.to}`);
    return;
  }
  console.warn(`WhatsAppService [${context}]: failed — ${result.error || "unknown"}`);
}

async function safeSend(context, fn) {
  try {
    const result = await fn();
    logWhatsAppResult(context, result);
    return result;
  } catch (error) {
    const message = error?.message || String(error);
    console.error(`WhatsAppService [${context}]:`, message);
    return { success: false, skipped: false, error: message };
  }
}

/**
 * Confirmation template: {{1}} name, {{2}} orderId, {{3}} invoice, {{4}} amount
 */
export async function sendWhatsAppOrderConfirmation(order) {
  return safeSend("order_confirmation", () =>
    sendWhatsAppCampaign("order_confirmation", {
      to: customerPhoneRaw(order),
      components: [
        bodyComponent([
          customerName(order),
          orderRef(order),
          invoiceNumber(order),
          formatAmount(order?.total),
        ]),
      ],
    })
  );
}

/**
 * Invoice template: document header + {{1}} name, {{2}} orderId, {{3}} invoice, {{4}} amount
 */
export async function sendWhatsAppInvoice(order) {
  return safeSend("invoice_sent", async () => {
    const documentUrl = await resolveInvoiceDocumentUrl(order);

    return sendWhatsAppCampaign("invoice_sent", {
      to: customerPhoneRaw(order),
      components: [
        documentHeader(documentUrl, getOrderInvoiceFilename(order)),
        bodyComponent([
          customerName(order),
          orderRef(order),
          invoiceNumber(order),
          formatAmount(order?.total),
        ]),
      ],
    });
  });
}

/**
 * Tracking template: {{1}} name, {{2}} orderId, {{3}} trackingId, {{4}} track link, {{5}} invoice
 */
export async function sendWhatsAppOrderTracking(order) {
  const trackingId = order?.shipment?.trackingNumber || "Pending";
  const trackUrl =
    order?.shipment?.trackUrl ||
    `${whatsappConfig.publicWebUrl}/orders/${order?._id || ""}`;

  return safeSend("order_tracking", () =>
    sendWhatsAppCampaign("order_tracking", {
      to: customerPhoneRaw(order),
      components: [
        bodyComponent([
          customerName(order),
          orderRef(order),
          trackingId,
          trackUrl,
          invoiceNumber(order),
        ]),
      ],
    })
  );
}

/**
 * Delivered template: {{1}} name, {{2}} orderId
 */
export async function sendWhatsAppOrderDelivered(order) {
  return safeSend("order_delivered", () =>
    sendWhatsAppCampaign("order_delivered", {
      to: customerPhoneRaw(order),
      components: [
        bodyComponent([customerName(order), orderRef(order)]),
      ],
    })
  );
}

/** Fire confirmation + invoice together when an order is confirmed. */
export async function sendWhatsAppOrderConfirmedBundle(order) {
  const confirmation = await sendWhatsAppOrderConfirmation(order);
  const invoice = await sendWhatsAppInvoice(order);
  return { confirmation, invoice };
}
