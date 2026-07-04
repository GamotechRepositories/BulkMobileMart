import { forwardRef } from "react";
import TaxInvoiceDocument from "@shared/invoice/TaxInvoiceDocument.jsx";

const InvoiceDocument = forwardRef(function InvoiceDocument(
  { order, customer, storeSettings, onPrint, printing },
  ref
) {
  return (
    <TaxInvoiceDocument
      ref={ref}
      order={order}
      customer={customer}
      storeSettings={storeSettings}
      onAction={onPrint}
      actionLabel={printing ? "Preparing..." : "Print / Save PDF"}
      actionLoading={printing}
    />
  );
});

export default InvoiceDocument;
