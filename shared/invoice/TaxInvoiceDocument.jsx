import { forwardRef } from "react";
import { amountInWords } from "./amountInWords.js";
import {
  buildInvoiceLineItems,
  buildInvoiceTotals,
  formatInvoiceAmount,
  formatInvoiceDate,
  formatPlaceOfSupply,
  getPaymentModeLabel,
  getPaymentStatusLabel,
  mergeInvoiceConfig,
  STATUS_LABELS,
} from "./invoiceCalculations.js";
import { INVOICE_LOGO_URL, LOGO_URL } from "./invoiceConfig.js";
import { formatCustomerAddress, getAddressFullName, getOrderNumber } from "./invoiceHelpers.js";
import "./invoice.css";

const TABLE_COLUMNS = [
  { key: "srNo", label: "Sr No", align: "center", width: "8%" },
  { key: "name", label: "Product Name", align: "left", width: "42%" },
  { key: "qty", label: "Qty", align: "center", width: "10%" },
  { key: "rate", label: "Rate", align: "right", width: "18%" },
  { key: "amount", label: "Amount", align: "right", width: "22%" },
];

function SectionBar({ title }) {
  return <div className="invoice-section-bar">{title}</div>;
}

function cellAlign(align) {
  if (align === "center") return "invoice-align-center";
  if (align === "right") return "invoice-align-right";
  return "invoice-align-left";
}

function InfoRow({ label, value }) {
  return (
    <tr>
      <td className="invoice-info-label">{label}</td>
      <td className="invoice-info-value">{value}</td>
    </tr>
  );
}

function SummaryRow({ label, value, highlight = false }) {
  return (
    <tr className={highlight ? "invoice-summary-total" : "invoice-summary-row"}>
      <td className="invoice-summary-label">{label}</td>
      <td className="invoice-summary-value">{value}</td>
    </tr>
  );
}

function renderCellValue(item, key) {
  switch (key) {
    case "srNo":
      return item.srNo;
    case "name":
      return item.name;
    case "qty":
      return item.qty;
    case "rate":
      return formatInvoiceAmount(item.rate);
    case "amount":
      return formatInvoiceAmount(item.amount);
    default:
      return "";
  }
}

const TaxInvoiceDocument = forwardRef(function TaxInvoiceDocument(
  {
    order,
    customer,
    logoUrl,
    storeSettings,
    onAction,
    actionLabel = "Print / Save PDF",
    actionLoading = false,
  },
  ref
) {
  const config = mergeInvoiceConfig(storeSettings);
  const headerLogo = logoUrl || INVOICE_LOGO_URL || LOGO_URL;
  const orderNo = getOrderNumber(order);
  const invoiceNo = `INV-${orderNo}`;
  const addr = order?.deliveryAddress || {};
  const customerName = getAddressFullName(addr) || customer?.name || "—";
  const customerGst = customer?.gstNumber || addr?.gstNumber || "URP";
  const lineItems = buildInvoiceLineItems(order?.items || []);
  const totals = buildInvoiceTotals({
    lineItems,
    deliveryCharges: order?.deliveryCharges || 0,
    sellerState: config.stateName,
    customerState: addr?.state || "",
  });
  const grandTotal = order?.total ?? totals.grandTotal;

  const metaRows = [
    ["Invoice No", invoiceNo],
    ["Order No", orderNo],
    ["Order Status", STATUS_LABELS[order?.status] || order?.status || "—"],
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
    ["Account No", config.bank.accountNumber || "—"],
    ["UPI ID", config.bank.upiId || "—"],
  ];

  return (
    <div className="invoice-page">
      <div ref={ref} id="invoice-print-area">
        <div className="invoice-header">
          <img
            src={headerLogo}
            alt={config.companyName}
            className="invoice-logo"
            crossOrigin="anonymous"
          />
          <p className="invoice-header-tagline">{config.tagline}</p>
          <p className="invoice-header-meta">
            By: {config.legalEntity} | Email: {config.email}
            {config.gstNumber ? ` | GST No: ${config.gstNumber}` : ""}
            {` | State Code: ${config.stateCode}`}
          </p>
        </div>

        <div className="invoice-title-block">
          <h1 className="invoice-title">TAX INVOICE</h1>
          <div className="invoice-title-line" />
        </div>

        <div className="invoice-block">
          <SectionBar title="Invoice Detail" />
          <table className="invoice-info-table">
            <tbody>
              {metaRows.map(([label, value]) => (
                <InfoRow key={label} label={label} value={value} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-block">
          <SectionBar title="Bill To" />
          <div className="invoice-bill-to">
            <p className="invoice-bill-to-name">{customerName}</p>
            {addr?.shopName ? <p>{addr.shopName}</p> : null}
            {addr?.number ? <p>{addr.number}</p> : customer?.phone ? <p>{customer.phone}</p> : null}
            <p>{formatCustomerAddress(addr)}</p>
            <p className="invoice-bill-to-gst">GST No: {customerGst}</p>
          </div>
        </div>

        <div className="invoice-block">
          <SectionBar title="Order Detail" />
          <div className="invoice-product-scroll">
            <table className="invoice-product-table">
              <colgroup>
                {TABLE_COLUMNS.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {TABLE_COLUMNS.map((column) => (
                    <th key={column.key} className={cellAlign(column.align)}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.srNo}>
                    {TABLE_COLUMNS.map((column) => (
                      <td key={column.key} className={cellAlign(column.align)}>
                        {renderCellValue(item, column.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="invoice-block">
          <div className="invoice-amount-words">
            <span className="invoice-amount-words-label">Amount in Words:</span>{" "}
            {amountInWords(grandTotal)}
          </div>

          <div className="invoice-footer-layout">
            <div className="invoice-footer-notes">
              <p className="invoice-footer-notes-title">Bank Details:</p>
              {bankRows.map(([label, value]) => (
                <p key={label}>
                  <strong>{label}:</strong> {value}
                </p>
              ))}
              <p className="invoice-footer-disclaimer">
                This is a computer generated invoice. Reverse Charge: No
              </p>
            </div>

            <div className="invoice-footer-summary">
              <table className="invoice-summary-table">
                <colgroup>
                  <col style={{ width: "58%" }} />
                  <col style={{ width: "42%" }} />
                </colgroup>
                <tbody>
                  <SummaryRow label="Sub Total" value={formatInvoiceAmount(totals.subTotal)} />
                  {totals.gstBreakdown.map((row) => (
                    <SummaryRow key={row.label} label={row.label} value={formatInvoiceAmount(row.amount)} />
                  ))}
                  <SummaryRow
                    label="Shipping Charges"
                    value={
                      totals.deliveryCharges === 0
                        ? "Free"
                        : formatInvoiceAmount(totals.deliveryCharges)
                    }
                  />
                  <SummaryRow
                    label="Total Amount"
                    value={formatInvoiceAmount(grandTotal)}
                    highlight
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {onAction ? (
          <div className="invoice-action-bar no-print">
            <button
              type="button"
              onClick={onAction}
              disabled={actionLoading}
              className="invoice-print-btn"
            >
              {actionLoading ? "Preparing..." : actionLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default TaxInvoiceDocument;
