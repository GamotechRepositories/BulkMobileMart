import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrderById, getStoreSettings } from "../api/api";
import InvoiceDocument from "../components/invoice/InvoiceDocument";
import InvoicePageShell from "@shared/invoice/InvoicePageShell.jsx";

function AdminOrderInvoice() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true);
      setError("");
      try {
        const [orderRes, settingsRes] = await Promise.all([
          getOrderById(id),
          getStoreSettings().catch(() => null),
        ]);
        setOrder(orderRes.data.data);
        setStoreSettings(settingsRes?.data?.data || null);
      } catch {
        setError("Order not found");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const handlePrint = () => {
    if (printing) return;
    setPrinting(true);
    window.print();
    setTimeout(() => setPrinting(false), 500);
  };

  if (loading) {
    return (
      <InvoicePageShell backTo={`/orders/${id}`} backLabel="← Back to Order">
        <div className="animate-pulse rounded-xl bg-neutral-100 p-12" />
      </InvoicePageShell>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-16 text-center">
        <p className="mb-6 text-text-secondary">{error || "Order not found"}</p>
        <Link to={`/orders/${id}`} className="text-sm font-semibold text-primary hover:underline">
          ← Back to Order
        </Link>
      </div>
    );
  }

  return (
    <InvoicePageShell backTo={`/orders/${id}`} backLabel="← Back to Order">
      <InvoiceDocument
        order={order}
        customer={order.user}
        storeSettings={storeSettings}
        onPrint={handlePrint}
        printing={printing}
      />
    </InvoicePageShell>
  );
}

export default AdminOrderInvoice;
