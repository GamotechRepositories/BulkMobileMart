import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatAddressLine, getAddressFullName } from "./addressDisplay";
import { getOrderNumber } from "./orderNumber";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const STATUS_LABELS = {
  confirm: "Confirm",
  processing: "Processing",
  shipping: "Shipping",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending: "Confirm",
  confirmed: "Confirm",
  shipped: "Shipping",
};

export function downloadInvoicePdf(order, user, filename) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const orderNo = getOrderNumber(order);
  const addr = order.deliveryAddress;
  const paymentMode = order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment";
  const paymentStatus =
    order.paymentStatus === "paid_10"
      ? "10% Paid"
      : (order.paymentStatus || "unpaid") === "paid"
        ? "Paid"
        : "Unpaid";

  // Header
  doc.setTextColor(102, 102, 102);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Mobile Invoice | support@bulkmobilemart.com | 9876543210", pageW / 2, 16, {
    align: "center",
  });

  let y = 24;
  const colW = (pageW - margin * 2 - 4) / 2;

  doc.setDrawColor(229, 229, 229);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, colW, 52, 2, 2);
  doc.roundedRect(margin + colW + 4, y, colW, 52, 2, 2);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE & ORDER", margin + 3, y + 6);
  doc.text("BILL TO", margin + colW + 7, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const leftRows = [
    ["Invoice Date", formatDate(new Date())],
    ["Order No", orderNo],
    ["Invoice No", `${orderNo}-INV`],
    ["Order Date", formatDate(order.createdAt)],
    ["Order Status", STATUS_LABELS[order.status] || order.status],
    ["Payment Status", paymentStatus],
    ["Payment Mode", paymentMode],
  ];

  leftRows.forEach(([label, value], i) => {
    const rowY = y + 12 + i * 5.5;
    doc.setTextColor(102, 102, 102);
    doc.text(label, margin + 3, rowY);
    doc.setTextColor(0, 0, 0);
    doc.text(String(value), margin + colW - 3, rowY, { align: "right" });
  });

  const addressLine = formatAddressLine(addr);

  const rightRows = [
    ["Name", getAddressFullName(addr) || user?.name || "—"],
    ["Email", addr?.email || user?.email || "—"],
    ["Phone", addr?.number ? `+91 ${addr.number}` : user?.phone ? `+91 ${user.phone}` : "—"],
    ["Shop", addr?.shopName || "—"],
    ["Shop No.", addr?.shopNo || "—"],
    ["Address", addr?.fullAddress || addressLine || "—"],
    ["Landmark", addr?.landmark || "—"],
  ];

  rightRows.forEach(([label, value], i) => {
    const rowY = y + 12 + i * 5.5;
    doc.setTextColor(102, 102, 102);
    doc.text(label, margin + colW + 7, rowY);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(String(value), colW - 20);
    doc.text(lines, margin + colW + colW - 3, rowY, { align: "right" });
  });

  y += 58;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Sr No.", "Item Name", "Qty", "Rate", "Amount"]],
    body: order.items.map((item, index) => [
      index + 1,
      item.name,
      item.quantity,
      formatPrice(item.price),
      formatPrice(item.price * item.quantity),
    ]),
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0] },
    headStyles: {
      fillColor: [248, 248, 248],
      textColor: [102, 102, 102],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 14 },
      2: { halign: "right", cellWidth: 14 },
      3: { halign: "right", cellWidth: 24 },
      4: { halign: "right", cellWidth: 24 },
    },
    theme: "grid",
    tableLineColor: [229, 229, 229],
    tableLineWidth: 0.2,
  });

  y = doc.lastAutoTable.finalY + 8;
  const summaryX = pageW - margin - 55;

  doc.setFontSize(8);
  doc.setTextColor(102, 102, 102);
  doc.text("Subtotal", summaryX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(formatPrice(order.subtotal), pageW - margin, y, { align: "right" });

  y += 5;
  doc.setTextColor(102, 102, 102);
  doc.text("Delivery", summaryX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(
    order.deliveryCharges === 0 ? "Free" : formatPrice(order.deliveryCharges),
    pageW - margin,
    y,
    { align: "right" }
  );

  y += 10;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(summaryX - 2, y - 6, pageW - margin - summaryX + 2, 10, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Total Amount", summaryX, y);
  doc.text(formatPrice(order.total), pageW - margin, y, { align: "right" });

  doc.save(filename);
}
