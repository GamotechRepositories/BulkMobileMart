import React from "react";
import { pdf } from "@react-pdf/renderer";
import InvoicePdfDocument from "./InvoicePdfDocument.jsx";

export async function downloadInvoiceFromElement(_element, filename = "invoice.pdf", invoiceData = {}) {
  const { order, customer, storeSettings, logoUrl } = invoiceData;
  if (!order) {
    throw new Error("Order data is required for invoice PDF");
  }

  const blob = await pdf(
    React.createElement(InvoicePdfDocument, {
      order,
      customer,
      storeSettings,
      logoUrl,
    })
  ).toBlob();

  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
