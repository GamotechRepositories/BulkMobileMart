import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { amountInWords } from "../../shared/invoice/amountInWords.js";
import {
  buildInvoiceLineItems,
  buildInvoiceTotalsForOrder,
  formatInvoiceAmount,
  formatInvoiceDate,
  formatPlaceOfSupply,
  getInvoiceAdvancePaymentDetails,
  getPaymentModeLabel,
  getPaymentStatusLabel,
  mergeInvoiceConfig,
  STATUS_LABELS,
} from "../../shared/invoice/invoiceCalculations.js";
import { INVOICE_LOGO_URL, LOGO_URL } from "../../shared/invoice/invoiceConfig.js";
import {
  formatCustomerAddress,
  getAddressFullName,
  getOrderNumber,
} from "../../shared/invoice/invoiceHelpers.js";

const e = React.createElement;

const styles = StyleSheet.create({
  page: { padding: 16, fontSize: 9, color: "#111827" },
  header: { textAlign: "center", marginBottom: 8 },
  logo: { width: 130, height: 30, objectFit: "contain", marginHorizontal: "auto" },
  tagline: { marginTop: 4, fontSize: 9 },
  meta: { marginTop: 2, fontSize: 8 },
  title: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: 5,
    marginBottom: 6,
  },
  block: { borderWidth: 1, borderColor: "#d1d5db", marginBottom: 6 },
  sectionBar: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    textAlign: "center",
    fontWeight: 700,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  infoLabel: {
    width: "34%",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    padding: 4,
    fontWeight: 600,
  },
  infoValue: { width: "66%", padding: 4 },
  billTo: { padding: 6, lineHeight: 1.35 },
  billToName: { fontWeight: 700 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    backgroundColor: "#f8fafc",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  cSrNo: { width: "7%", textAlign: "center", padding: 4 },
  cName: { width: "45%", textAlign: "left", padding: 4 },
  cQty: { width: "8%", textAlign: "center", padding: 4 },
  cRate: { width: "18%", textAlign: "right", padding: 4 },
  cAmount: { width: "22%", textAlign: "right", padding: 4 },
  headerText: { fontWeight: 700 },
  amountWords: {
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    padding: 6,
    lineHeight: 1.35,
  },
  footerWrap: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#d1d5db" },
  notes: { width: "68%", padding: 6, lineHeight: 1.35 },
  notesTitle: { fontWeight: 700, marginBottom: 4 },
  summary: { width: "32%", borderLeftWidth: 1, borderLeftColor: "#d1d5db" },
  summaryRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  summaryLabel: {
    width: "58%",
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    padding: 4,
    fontWeight: 600,
  },
  summaryValue: { width: "42%", padding: 4, textAlign: "right" },
  totalRow: { backgroundColor: "#f8fafc" },
  totalText: { fontWeight: 700 },
  attemptedBanner: {
    marginBottom: 6,
    padding: 6,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fdba74",
  },
  attemptedText: { fontSize: 8, fontWeight: 700, color: "#9a3412", textAlign: "center" },
  notesGap: { marginTop: 6 },
});

function formatMoney(amount) {
  return `Rs. ${formatInvoiceAmount(amount)}`;
}

function SummaryRow({ label, value, highlight = false }) {
  return e(
    View,
    { style: [styles.summaryRow, highlight ? styles.totalRow : null] },
    e(Text, { style: [styles.summaryLabel, highlight ? styles.totalText : null] }, label),
    e(Text, { style: [styles.summaryValue, highlight ? styles.totalText : null] }, value)
  );
}

export default function InvoicePdfDocument({ order, customer, storeSettings, logoUrl }) {
  const config = mergeInvoiceConfig(storeSettings);
  const headerLogo = logoUrl || INVOICE_LOGO_URL || LOGO_URL;
  const orderNo = getOrderNumber(order);
  const invoiceNo = `INV-${orderNo}`;
  const addr = order?.deliveryAddress || {};
  const customerName = getAddressFullName(addr) || customer?.name || "-";
  const customerGst = customer?.gstNumber || addr?.gstNumber || "URP";
  const lineItems = buildInvoiceLineItems(order?.items || []);
  const totals = buildInvoiceTotalsForOrder(order, lineItems, {
    sellerState: config.stateName,
    customerState: addr?.state || "",
  });
  const grandTotal = totals.grandTotal;
  const advancePayment = getInvoiceAdvancePaymentDetails(order);
  const isAttempted = order?.status === "attempted";
  const documentTitle = isAttempted ? "ATTEMPTED ORDER" : "TAX INVOICE";
  const documentNo = isAttempted ? `ATT-${orderNo}` : invoiceNo;

  const metaRows = [
    [isAttempted ? "Document No" : "Invoice No", documentNo],
    ["Order No", orderNo],
    ["Order Status", STATUS_LABELS[order?.status] || order?.status || "-"],
    ["Payment Mode", getPaymentModeLabel(order?.paymentMethod)],
    ["Place of Supply", formatPlaceOfSupply(addr?.state)],
    ["Invoice Date", formatInvoiceDate(new Date())],
    ["Order Date", formatInvoiceDate(order?.createdAt || new Date())],
    ["Payment Status", getPaymentStatusLabel(order?.paymentStatus)],
  ];

  const bankRows = [
    ["Bank", config.bank.name],
    ["IFSC Code", config.bank.ifsc],
    ["Account Name", config.bank.accountName],
    ["Account No", config.bank.accountNumber || "-"],
    ["UPI ID", config.bank.upiId || "-"],
  ];

  const phoneLine = addr?.number
    ? e(Text, null, addr.number)
    : customer?.phone
      ? e(Text, null, customer.phone)
      : null;

  const summaryRows = [
    e(SummaryRow, { key: "sub", label: "Sub Total", value: formatMoney(totals.subTotal) }),
    ...totals.gstBreakdown.map((row) =>
      e(SummaryRow, {
        key: row.label,
        label: row.label,
        value: formatMoney(row.amount),
      })
    ),
  ];

  if (totals.couponDiscount > 0) {
    summaryRows.push(
      e(SummaryRow, {
        key: "coupon",
        label: order?.couponCode
          ? `Less: Coupon (${order.couponCode})`
          : "Less: Coupon",
        value: `- ${formatMoney(totals.couponDiscount)}`,
      })
    );
  }

  summaryRows.push(
    e(SummaryRow, {
      key: "ship",
      label: "Shipping Charges",
      value: totals.deliveryCharges === 0 ? "Free" : formatMoney(totals.deliveryCharges),
    })
  );

  summaryRows.push(
    e(SummaryRow, {
      key: "total",
      label: "Total Amount",
      value: formatMoney(grandTotal),
      highlight: true,
    })
  );

  if (advancePayment.isAdvancePaid) {
    summaryRows.push(
      e(SummaryRow, {
        key: "advance",
        label: "Advance Paid (10%)",
        value: formatMoney(advancePayment.advancePaid),
      }),
      e(SummaryRow, {
        key: "balance",
        label: "Balance Due on Delivery",
        value: formatMoney(advancePayment.remainingBalance),
        highlight: true,
      })
    );
  }

  return e(
    Document,
    null,
    e(
      Page,
      { size: "A4", style: styles.page },
      e(
        View,
        { style: styles.header },
        headerLogo ? e(Image, { src: headerLogo, style: styles.logo }) : null,
        e(Text, { style: styles.tagline }, config.tagline),
        e(
          Text,
          { style: styles.meta },
          `By: ${config.legalEntity} | Email: ${config.email}`,
          config.gstNumber ? ` | GST No: ${config.gstNumber}` : "",
          ` | State Code: ${config.stateCode}`
        )
      ),
      e(Text, { style: styles.title }, documentTitle),
      isAttempted
        ? e(
            View,
            { style: styles.attemptedBanner },
            e(
              Text,
              { style: styles.attemptedText },
              "Status: Attempted — checkout was not completed. This is not a tax invoice."
            )
          )
        : null,
      e(
        View,
        { style: styles.block },
        e(Text, { style: styles.sectionBar }, "Invoice Detail"),
        ...metaRows.map(([label, value], idx) =>
          e(
            View,
            {
              key: label,
              style: [
                styles.infoRow,
                idx === metaRows.length - 1 ? { borderBottomWidth: 0 } : null,
              ],
            },
            e(Text, { style: styles.infoLabel }, label),
            e(Text, { style: styles.infoValue }, String(value ?? "-"))
          )
        )
      ),
      e(
        View,
        { style: styles.block },
        e(Text, { style: styles.sectionBar }, "Bill To"),
        e(
          View,
          { style: styles.billTo },
          e(Text, { style: styles.billToName }, customerName),
          addr?.shopName ? e(Text, null, addr.shopName) : null,
          phoneLine,
          e(Text, null, formatCustomerAddress(addr)),
          e(Text, null, `GST No: ${customerGst}`)
        )
      ),
      e(
        View,
        { style: styles.block },
        e(Text, { style: styles.sectionBar }, "Order Detail"),
        e(
          View,
          { style: styles.tableHeader },
          e(Text, { style: [styles.cSrNo, styles.headerText] }, "Sr No"),
          e(Text, { style: [styles.cName, styles.headerText] }, "Product Name"),
          e(Text, { style: [styles.cQty, styles.headerText] }, "Qty"),
          e(Text, { style: [styles.cRate, styles.headerText] }, "Rate"),
          e(Text, { style: [styles.cAmount, styles.headerText] }, "Amount")
        ),
        ...lineItems.map((item, idx) =>
          e(
            View,
            {
              key: `${item.srNo}-${idx}`,
              style: [
                styles.tableRow,
                idx === lineItems.length - 1 ? { borderBottomWidth: 0 } : null,
              ],
            },
            e(Text, { style: styles.cSrNo }, item.srNo),
            e(Text, { style: styles.cName }, item.name),
            e(Text, { style: styles.cQty }, item.qty),
            e(Text, { style: styles.cRate }, formatMoney(item.rate)),
            e(Text, { style: styles.cAmount }, formatMoney(item.amount))
          )
        )
      ),
      e(
        View,
        { style: styles.block },
        e(
          View,
          { style: styles.footerWrap },
          e(
            View,
            { style: styles.notes },
            e(Text, { style: styles.notesTitle }, "Bank Details:"),
            ...bankRows.map(([label, value]) =>
              e(Text, { key: label }, `${label}: ${value}`)
            ),
            e(
              Text,
              { style: styles.notesGap },
              "This is a computer generated invoice. Reverse Charge: No"
            ),
            advancePayment.isAdvancePaid
              ? e(Text, { style: styles.notesGap }, `Remarks: ${advancePayment.remark}`)
              : null
          ),
          e(View, { style: styles.summary }, ...summaryRows)
        ),
        e(
          Text,
          { style: styles.amountWords },
          `Amount in Words: ${amountInWords(grandTotal)}`
        )
      )
    )
  );
}
