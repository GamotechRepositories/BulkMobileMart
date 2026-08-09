import React from "react";
import { pdf } from "@react-pdf/renderer";
import { getInvoiceFilename } from "../../shared/invoice/invoiceHelpers.js";
import User from "../models/user.js";
import { getStoreSettings } from "../utils/storeSettingsHelpers.js";

async function resolveInvoiceCustomer(order) {
  const embedded = order?.user;
  if (embedded && typeof embedded === "object" && (embedded.name || embedded.phone || embedded.gstNumber)) {
    return embedded;
  }

  const userId = embedded?._id || embedded || null;
  if (!userId) return null;

  return User.findById(userId).select("name email phone gstNumber").lean();
}

/**
 * Builds the same tax invoice PDF used on web/admin order invoice pages.
 * Document lives under backend/ so react/@react-pdf resolve from backend/node_modules
 * (shared/ cannot see those packages on server deploys that only install backend deps).
 */
export async function generateOrderInvoicePdfBuffer(order) {
  if (!order) {
    throw new Error("Order is required to generate invoice PDF");
  }

  const [{ default: InvoicePdfDocument }, customer, storeSettings] = await Promise.all([
    import("./InvoicePdfDocument.jsx"),
    resolveInvoiceCustomer(order),
    getStoreSettings(),
  ]);

  const document = React.createElement(InvoicePdfDocument, {
    order,
    customer,
    storeSettings,
  });

  // @react-pdf's toBuffer() returns a Node stream (despite the name)
  const stream = await pdf(document).toBuffer();

  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export function getOrderInvoiceFilename(order) {
  return getInvoiceFilename(order);
}
