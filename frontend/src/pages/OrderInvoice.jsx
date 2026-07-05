import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOrderById, getStoreSettings } from "../api/api";
import InvoiceDocument from "../components/invoice/InvoiceDocument";
import InvoicePageShell from "@shared/invoice/InvoicePageShell.jsx";
import { downloadInvoiceFromElement } from "@shared/invoice/downloadInvoiceFromElement.js";
import { getInvoiceFilename } from "@shared/invoice/invoiceHelpers.js";

function OrderInvoice() {
  const { id } = useParams();
  const { user, openAuthModal } = useAuth();
  const invoiceRef = useRef(null);
  const autoDownloadedRef = useRef(false);
  const [order, setOrder] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

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
  }, [user, id]);

  const handleDownload = useCallback(async () => {
    if (downloading || !order || !invoiceRef.current) return;

    try {
      setDownloading(true);
      await downloadInvoiceFromElement(
        invoiceRef.current,
        getInvoiceFilename(order)
      );
    } catch {
      setError("Failed to download invoice");
    } finally {
      setDownloading(false);
    }
  }, [downloading, order]);

  useEffect(() => {
    if (loading || !order || autoDownloadedRef.current) return;

    autoDownloadedRef.current = true;
    const timer = setTimeout(() => {
      handleDownload();
    }, 600);

    return () => clearTimeout(timer);
  }, [loading, order, handleDownload]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-16 text-center">
        <p className="mb-6 text-text-secondary">Please login to view invoice.</p>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white"
        >
          Login / Sign Up
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <InvoicePageShell backTo="/orders" backLabel="← Back to My Orders">
        <div className="animate-pulse rounded-xl bg-neutral-100 p-12" />
      </InvoicePageShell>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4 py-16 text-center">
        <p className="mb-6 text-text-secondary">{error || "Order not found"}</p>
        <Link to="/orders" className="text-sm font-semibold text-primary hover:underline">
          ← Back to My Orders
        </Link>
      </div>
    );
  }

  return (
    <InvoicePageShell backTo="/orders" backLabel="← Back to My Orders">
      <InvoiceDocument
        ref={invoiceRef}
        order={order}
        customer={user}
        storeSettings={storeSettings}
        onDownload={handleDownload}
        downloading={downloading}
      />
    </InvoicePageShell>
  );
}

export default OrderInvoice;
