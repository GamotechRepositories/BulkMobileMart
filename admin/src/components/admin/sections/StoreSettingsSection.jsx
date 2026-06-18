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
const EMPTY_UPI_ACCOUNT = { upiId: "", label: "BulkMobileMart", enabled: false };

function normalizeUpiAccounts(accounts = []) {
  let activeAssigned = false;

  return accounts.map((account) => {
    const normalized = {
      upiId: account.upiId || "",
      label: account.label || "BulkMobileMart",
      enabled: account.enabled !== false,
    };

    if (normalized.enabled && !activeAssigned) {
      activeAssigned = true;
      return normalized;
    }

    return { ...normalized, enabled: false };
  });
}

function serializeOrderSection(form) {
  return JSON.stringify({
    minimumOrderValue: String(form.minimumOrderValue ?? ""),
    minimumShippingCharge: String(form.minimumShippingCharge ?? ""),
  });
}

function serializeSlabsSection(form) {
  return JSON.stringify(
    (form.shippingSlabs || []).map((slab) => ({
      orderAmount: String(slab.orderAmount ?? ""),
      shippingCharge: String(slab.shippingCharge ?? ""),
    }))
  );
}

function serializeUpiSection(form) {
  return JSON.stringify(
    normalizeUpiAccounts(
      (form.merchantUpiAccounts || [])
        .map((account) => ({
          upiId: String(account.upiId || "").trim(),
          label: String(account.label || "").trim() || "BulkMobileMart",
          enabled: Boolean(account.enabled),
        }))
        .filter((account) => account.upiId)
    )
  );
}

function serializeCartSection(form) {
  return JSON.stringify({
    cartNoticeEn: String(form.cartNoticeEn ?? ""),
    cartNoticeHi: String(form.cartNoticeHi ?? ""),
  });
}

function buildSectionSnapshots(form) {
  return {
    order: serializeOrderSection(form),
    slabs: serializeSlabsSection(form),
    upi: serializeUpiSection(form),
    cart: serializeCartSection(form),
  };
}

function StoreSettingsSection() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState("");
  const [savedSnapshots, setSavedSnapshots] = useState(() => buildSectionSnapshots({}));
  const [form, setForm] = useState({
    minimumOrderValue: "3000",
    minimumShippingCharge: "280",
    shippingSlabs: [{ orderAmount: "3000", shippingCharge: "280" }],
    merchantUpiAccounts: [{ ...EMPTY_UPI_ACCOUNT }],
    cartNoticeEn: "",
    cartNoticeHi: "",
  });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getStoreSettings();
      const settings = data.data;
      const nextForm = {
        minimumOrderValue: String(settings.minimumOrderValue ?? 3000),
        minimumShippingCharge: String(settings.minimumShippingCharge ?? 280),
        shippingSlabs: (settings.shippingSlabs || []).map((slab) => ({
          orderAmount: String(slab.orderAmount),
          shippingCharge: String(slab.shippingCharge),
        })),
        cartNoticeEn: (settings.cartNoticeEn || []).join("\n"),
        cartNoticeHi: (settings.cartNoticeHi || []).join("\n"),
        merchantUpiAccounts: normalizeUpiAccounts(
          settings.merchantUpiAccounts?.length > 0
            ? settings.merchantUpiAccounts.map((account) => ({
                upiId: account.upiId || "",
                label: account.label || "BulkMobileMart",
                enabled: account.enabled !== false,
              }))
            : settings.merchantUpiId
              ? [
                  {
                    upiId: settings.merchantUpiId,
                    label: settings.merchantUpiName || "BulkMobileMart",
                    enabled: true,
                  },
                ]
              : [{ ...EMPTY_UPI_ACCOUNT, enabled: true }]
        ),
      };
      setForm(nextForm);
      setSavedSnapshots(buildSectionSnapshots(nextForm));
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

  const updateUpiAccount = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.merchantUpiAccounts];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, merchantUpiAccounts: next };
    });
  };

  const toggleUpiAccount = (index) => {
    setForm((prev) => {
      const isCurrentlyActive = prev.merchantUpiAccounts[index]?.enabled;

      return {
        ...prev,
        merchantUpiAccounts: prev.merchantUpiAccounts.map((account, i) => ({
          ...account,
          enabled: isCurrentlyActive ? false : i === index,
        })),
      };
    });
  };

  const addUpiAccount = () => {
    setForm((prev) => ({
      ...prev,
      merchantUpiAccounts: [...prev.merchantUpiAccounts, { ...EMPTY_UPI_ACCOUNT }],
    }));
  };

  const removeUpiAccount = (index) => {
    setForm((prev) => ({
      ...prev,
      merchantUpiAccounts: prev.merchantUpiAccounts.filter((_, i) => i !== index),
    }));
  };

  const sectionSaveLabels = {
    order: "Order & shipping rules",
    slabs: "Shipping slabs",
    upi: "UPI payment settings",
    cart: "Cart messages",
  };

  const sectionSerializers = {
    order: serializeOrderSection,
    slabs: serializeSlabsSection,
    upi: serializeUpiSection,
    cart: serializeCartSection,
  };

  const isSectionDirty = (section) =>
    sectionSerializers[section](form) !== savedSnapshots[section];

  const dirtySections = {
    order: isSectionDirty("order"),
    slabs: isSectionDirty("slabs"),
    upi: isSectionDirty("upi"),
    cart: isSectionDirty("cart"),
  };

  const saveSection = async (section) => {
    setSavingSection(section);
    setError("");
    setSuccess("");

    try {
      let payload = {};

      if (section === "order") {
        payload = {
          minimumOrderValue: Number(form.minimumOrderValue),
          minimumShippingCharge: Number(form.minimumShippingCharge),
        };
      } else if (section === "slabs") {
        payload = {
          shippingSlabs: form.shippingSlabs.map((slab) => ({
            orderAmount: Number(slab.orderAmount),
            shippingCharge: Number(slab.shippingCharge),
          })),
        };
      } else if (section === "upi") {
        payload = {
          merchantUpiAccounts: normalizeUpiAccounts(
            form.merchantUpiAccounts
              .map((account) => ({
                upiId: account.upiId.trim(),
                label: account.label.trim() || "BulkMobileMart",
                enabled: Boolean(account.enabled),
              }))
              .filter((account) => account.upiId)
          ),
        };
      } else if (section === "cart") {
        payload = {
          cartNoticeEn: form.cartNoticeEn
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          cartNoticeHi: form.cartNoticeHi
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        };
      }

      await updateStoreSettings(payload);
      setSuccess(`${sectionSaveLabels[section]} saved successfully`);
      setSavedSnapshots((prev) => ({
        ...prev,
        [section]: sectionSerializers[section](form),
      }));
      await loadSettings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save store settings");
    } finally {
      setSavingSection("");
    }
  };

  const SectionSaveButton = ({ section }) => {
    const dirty = dirtySections[section];
    const isSaving = savingSection === section;

    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${
          dirty ? "border-amber-200 bg-amber-50/60 -mx-1 rounded-b-xl px-1" : "border-neutral-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {dirty ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
              <span className="text-sm font-semibold text-amber-800">
                Unsaved changes — tap Save
              </span>
            </>
          ) : (
            <span className="text-sm text-neutral-500">All changes saved</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => saveSection(section)}
          disabled={!dirty || Boolean(savingSection)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            dirty
              ? "bg-amber-600 text-white shadow-md ring-2 ring-amber-300 hover:bg-amber-700"
              : "cursor-default bg-neutral-100 text-neutral-400"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isSaving ? "Saving..." : dirty ? "Save changes" : "Saved"}
        </button>
      </div>
    );
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

      <div className="space-y-6">
        <div
          className={`${cardClass} space-y-5 ${
            dirtySections.order ? "ring-2 ring-amber-200" : ""
          }`}
        >
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

          <SectionSaveButton section="order" />
        </div>

        <div
          className={`${cardClass} space-y-4 ${
            dirtySections.slabs ? "ring-2 ring-amber-200" : ""
          }`}
        >
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

          <SectionSaveButton section="slabs" />
        </div>

        <div
          className={`${cardClass} space-y-5 ${
            dirtySections.upi ? "ring-2 ring-amber-200" : ""
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-neutral-900">UPI Payment (COD Advance & QR)</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Add multiple UPI IDs. Only one can be active at a time for customer payments.
              </p>
            </div>
            <button
              type="button"
              onClick={addUpiAccount}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              + Add UPI ID
            </button>
          </div>

          <div className="space-y-4">
            {form.merchantUpiAccounts.map((account, index) => (
              <div
                key={`upi-${index}`}
                className={`rounded-xl border p-4 transition ${
                  account.enabled
                    ? "border-emerald-300 bg-emerald-50/50 shadow-sm"
                    : "border-neutral-200 bg-neutral-50/60"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-800">UPI ID #{index + 1}</p>
                    {account.enabled ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500">
                        {account.enabled ? "Active for payments" : "Set as active"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={account.enabled}
                        aria-label={`${account.enabled ? "Disable" : "Enable"} UPI ID ${index + 1}`}
                        onClick={() => toggleUpiAccount(index)}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 ${
                          account.enabled ? "bg-emerald-500" : "bg-neutral-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                            account.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUpiAccount(index)}
                      disabled={form.merchantUpiAccounts.length <= 1}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>UPI ID</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={account.upiId}
                      onChange={(e) => updateUpiAccount(index, "upiId", e.target.value)}
                      placeholder="merchant@upi"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Example: bulkmobilemart@okaxis, store@paytm
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Payee Name</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={account.label}
                      onChange={(e) => updateUpiAccount(index, "label", e.target.value)}
                      placeholder="BulkMobileMart"
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Shown in UPI apps when customer pays.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <SectionSaveButton section="upi" />
        </div>

        <div
          className={`${cardClass} space-y-5 ${
            dirtySections.cart ? "ring-2 ring-amber-200" : ""
          }`}
        >
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

          <SectionSaveButton section="cart" />
        </div>
      </div>
    </div>
  );
}

export default StoreSettingsSection;
