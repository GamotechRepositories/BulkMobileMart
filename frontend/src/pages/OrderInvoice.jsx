import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOrderById } from "../api/api";
import InvoiceDocument from "../components/invoice/InvoiceDocument";
import { downloadInvoicePdf } from "../utils/generateInvoicePdf";
import { getOrderNumber } from "../utils/orderNumber";

function OrderInvoice() {
  const { id } = useParams();
  const { user, openAuthModal } = useAuth();
  const [order, setOrder] = useState(null);
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
        const { data } = await getOrderById(id);
        setOrder(data.data);
      } catch {
        setError("Order not found");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [user, id]);

  const handleDownload = () => {
    if (!order || downloading) return;

    setDownloading(true);
    try {
      downloadInvoicePdf(order, user, `Invoice-${getOrderNumber(order)}.pdf`);
    } catch (err) {
      console.error("Invoice download failed:", err);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

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
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto max-w-3xl animate-pulse rounded-xl bg-white p-12" />
      </div>
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
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <InvoiceDocument
          order={order}
          user={user}
          onDownload={handleDownload}
          downloading={downloading}
        />
      </div>
    </div>
  );
}

export default OrderInvoice;
