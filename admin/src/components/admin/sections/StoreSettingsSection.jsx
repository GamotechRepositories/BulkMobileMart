import { useCallback, useEffect, useState } from "react";
import { getStoreSettings, updateStoreSettings } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import {
  btnPrimary,
  cardClass,
  formHeaderClass,
  inputClass,
  labelClass,
} from "../adminStyles";

const EMPTY_SLAB = { orderAmount: "", shippingCharge: "" };

function StoreSettingsSection() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    minimumOrderValue: "3000",
    minimumShippingCharge: "280",
    shippingSlabs: [{ orderAmount: "3000", shippingCharge: "280" }],
    merchantUpiId: "",
    merchantUpiName: "BulkMobileMart",
    cartNoticeEn: "",
    cartNoticeHi: "",
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getStoreSettings();
      const settings = data.data;
      setForm({
        minimumOrderValue: String(settings.minimumOrderValue ?? 3000),
        minimumShippingCharge: String(settings.minimumShippingCharge ?? 280),
        shippingSlabs: (settings.shippingSlabs || []).map((slab) => ({
          orderAmount: String(slab.orderAmount),
          shippingCharge: String(slab.shippingCharge),
        })),
        cartNoticeEn: (settings.cartNoticeEn || []).join("\n"),
        cartNoticeHi: (settings.cartNoticeHi || []).join("\n"),
        merchantUpiId: settings.merchantUpiId || "",
        merchantUpiName: settings.merchantUpiName || "BulkMobileMart",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load store settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSlab = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.shippingSlabs];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, shippingSlabs: next };
    });
  };

  const addSlab = () => {
    setForm((prev) => ({
      ...prev,
      shippingSlabs: [...prev.shippingSlabs, { ...EMPTY_SLAB }],
    }));
  };

  const removeSlab = (index) => {
    setForm((prev) => ({
      ...prev,
      shippingSlabs: prev.shippingSlabs.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        minimumOrderValue: Number(form.minimumOrderValue),
        minimumShippingCharge: Number(form.minimumShippingCharge),
        shippingSlabs: form.shippingSlabs.map((slab) => ({
          orderAmount: Number(slab.orderAmount),
          shippingCharge: Number(slab.shippingCharge),
        })),
        cartNoticeEn: form.cartNoticeEn
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        cartNoticeHi: form.cartNoticeHi
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        merchantUpiId: form.merchantUpiId.trim(),
        merchantUpiName: form.merchantUpiName.trim() || "BulkMobileMart",
      };

      await updateStoreSettings(payload);
      setSuccess("Store settings saved successfully");
      await loadSettings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save store settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-w-0">
        <div className={`${cardClass} animate-pulse space-y-4`}>
          <div className="h-6 w-48 rounded bg-neutral-200" />
          <div className="h-10 rounded bg-neutral-200" />
          <div className="h-10 rounded bg-neutral-200" />
          <div className="h-32 rounded bg-neutral-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <AdminAlert
        error={error}
        success={success}
        onClear={() => {
          setError("");
          setSuccess("");
        }}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`${cardClass} space-y-5`}>
          <div className={formHeaderClass}>
            <div>
              <h3 className="font-semibold text-neutral-900">Order & Shipping Rules</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Control minimum order value and shipping charges shown on cart and checkout.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Minimum Order Value (₹)</label>
              <input
                type="number"
                min="0"
                required
                className={inputClass}
                value={form.minimumOrderValue}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, minimumOrderValue: e.target.value }))
                }
              />
              <p className="mt-1 text-xs text-neutral-500">
                Users cannot checkout below this cart subtotal.
              </p>
            </div>

            <div>
              <label className={labelClass}>Minimum Shipping Charge (₹)</label>
              <input
                type="number"
                min="0"
                required
                className={inputClass}
                value={form.minimumShippingCharge}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    minimumShippingCharge: e.target.value,
                  }))
                }
              />
              <p className="mt-1 text-xs text-neutral-500">
                Used when order value is below the first slab.
              </p>
            </div>
          </div>
        </div>

        <div className={`${cardClass} space-y-4`}>
          <div className={formHeaderClass}>
            <div>
              <h3 className="font-semibold text-neutral-900">Shipping Charge Slabs</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Higher order values use the matching slab. Slabs are sorted by order amount.
              </p>
            </div>
            <button type="button" onClick={addSlab} className={btnPrimary}>
              Add Slab
            </button>
          </div>

          <div className="space-y-3">
            {form.shippingSlabs.map((slab, index) => (
              <div
                key={`slab-${index}`}
                className="grid gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-[1fr_1fr_auto]"
              >
                <div>
                  <label className={labelClass}>Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className={inputClass}
                    value={slab.orderAmount}
                    onChange={(e) => updateSlab(index, "orderAmount", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Shipping Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className={inputClass}
                    value={slab.shippingCharge}
                    onChange={(e) => updateSlab(index, "shippingCharge", e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeSlab(index)}
                    disabled={form.shippingSlabs.length <= 1}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardClass} space-y-5`}>
          <div>
            <h3 className="font-semibold text-neutral-900">UPI Payment (COD Advance & QR)</h3>
            <p className="mt-1 text-sm text-neutral-500">
              This UPI ID is used to generate the payment QR code and open the UPI app for COD
              advance payments on the website and mobile app.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Merchant UPI ID *</label>
              <input
                type="text"
                required
                className={inputClass}
                value={form.merchantUpiId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, merchantUpiId: e.target.value }))
                }
                placeholder="merchant@upi"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Example: bulkmobilemart@okaxis, store@paytm
              </p>
            </div>
            <div>
              <label className={labelClass}>Merchant / Payee Name</label>
              <input
                type="text"
                className={inputClass}
                value={form.merchantUpiName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, merchantUpiName: e.target.value }))
                }
                placeholder="BulkMobileMart"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Shown in UPI apps when customer pays.
              </p>
            </div>
          </div>
        </div>

        <div className={`${cardClass} space-y-5`}>
          <div>
            <h3 className="font-semibold text-neutral-900">Cart Important Messages</h3>
            <p className="mt-1 text-sm text-neutral-500">
              One line per bullet. Use placeholders: {"{{minOrder}}"}, {"{{minShipping}}"}.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className={labelClass}>English bullets</label>
              <textarea
                rows={8}
                className={inputClass}
                value={form.cartNoticeEn}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cartNoticeEn: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Hindi bullets</label>
              <textarea
                rows={8}
                className={inputClass}
                value={form.cartNoticeHi}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cartNoticeHi: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StoreSettingsSection;
