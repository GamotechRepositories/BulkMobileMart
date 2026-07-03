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

function serializeEnviaSection(form) {
  return JSON.stringify({
    enabled: Boolean(form.enviaEnabled),
    useSandbox: Boolean(form.enviaUseSandbox),
    apiToken: String(form.enviaApiToken ?? "").trim(),
    defaultCarrier: String(form.enviaDefaultCarrier ?? "").trim(),
    defaultService: String(form.enviaDefaultService ?? "").trim(),
    origin: {
      name: String(form.enviaOriginName ?? "").trim(),
      company: String(form.enviaOriginCompany ?? "").trim(),
      email: String(form.enviaOriginEmail ?? "").trim(),
      phone: String(form.enviaOriginPhone ?? "").trim(),
      street: String(form.enviaOriginStreet ?? "").trim(),
      city: String(form.enviaOriginCity ?? "").trim(),
      state: String(form.enviaOriginState ?? "").trim(),
      country: String(form.enviaOriginCountry ?? "").trim().toUpperCase(),
      postalCode: String(form.enviaOriginPostalCode ?? "").trim(),
    },
    packageDefaults: {
      type: String(form.enviaPackageType ?? "").trim(),
      content: String(form.enviaPackageContent ?? "").trim(),
      amount: String(form.enviaPackageAmount ?? "").trim(),
      weightUnit: String(form.enviaWeightUnit ?? "").trim().toUpperCase(),
      lengthUnit: String(form.enviaLengthUnit ?? "").trim().toUpperCase(),
      weight: String(form.enviaWeight ?? "").trim(),
      length: String(form.enviaLength ?? "").trim(),
      width: String(form.enviaWidth ?? "").trim(),
      height: String(form.enviaHeight ?? "").trim(),
    },
  });
}

function buildSectionSnapshots(form) {
  return {
    order: serializeOrderSection(form),
    slabs: serializeSlabsSection(form),
    upi: serializeUpiSection(form),
    cart: serializeCartSection(form),
    envia: serializeEnviaSection(form),
  };
}

function StoreSettingsSection() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState("");
  const [savedSnapshots, setSavedSnapshots] = useState(() => buildSectionSnapshots({}));
  const [enviaHasSavedToken, setEnviaHasSavedToken] = useState(false);
  const [form, setForm] = useState({
    minimumOrderValue: "3000",
    minimumShippingCharge: "280",
    shippingSlabs: [{ orderAmount: "3000", shippingCharge: "280" }],
    merchantUpiAccounts: [{ ...EMPTY_UPI_ACCOUNT }],
    cartNoticeEn: "",
    cartNoticeHi: "",
    enviaEnabled: false,
    enviaUseSandbox: true,
    enviaApiToken: "",
    enviaDefaultCarrier: "",
    enviaDefaultService: "",
    enviaOriginName: "",
    enviaOriginCompany: "BulkMobileMart",
    enviaOriginEmail: "",
    enviaOriginPhone: "",
    enviaOriginStreet: "",
    enviaOriginCity: "",
    enviaOriginState: "",
    enviaOriginCountry: "IN",
    enviaOriginPostalCode: "",
    enviaPackageType: "box",
    enviaPackageContent: "Mobile accessories",
    enviaPackageAmount: "1",
    enviaWeightUnit: "KG",
    enviaLengthUnit: "CM",
    enviaWeight: "1",
    enviaLength: "20",
    enviaWidth: "15",
    enviaHeight: "10",
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
        enviaEnabled: Boolean(settings.envia?.enabled),
        enviaUseSandbox: settings.envia?.useSandbox !== false,
        enviaApiToken: settings.envia?.apiToken || "",
        enviaDefaultCarrier: settings.envia?.defaultCarrier || "",
        enviaDefaultService: settings.envia?.defaultService || "",
        enviaOriginName: settings.envia?.origin?.name || "",
        enviaOriginCompany: settings.envia?.origin?.company || "BulkMobileMart",
        enviaOriginEmail: settings.envia?.origin?.email || "",
        enviaOriginPhone: settings.envia?.origin?.phone || "",
        enviaOriginStreet: settings.envia?.origin?.street || "",
        enviaOriginCity: settings.envia?.origin?.city || "",
        enviaOriginState: settings.envia?.origin?.state || "",
        enviaOriginCountry: settings.envia?.origin?.country || "IN",
        enviaOriginPostalCode: settings.envia?.origin?.postalCode || "",
        enviaPackageType: settings.envia?.packageDefaults?.type || "box",
        enviaPackageContent: settings.envia?.packageDefaults?.content || "Mobile accessories",
        enviaPackageAmount: String(settings.envia?.packageDefaults?.amount ?? 1),
        enviaWeightUnit: settings.envia?.packageDefaults?.weightUnit || "KG",
        enviaLengthUnit: settings.envia?.packageDefaults?.lengthUnit || "CM",
        enviaWeight: String(settings.envia?.packageDefaults?.weight ?? 1),
        enviaLength: String(settings.envia?.packageDefaults?.length ?? 20),
        enviaWidth: String(settings.envia?.packageDefaults?.width ?? 15),
        enviaHeight: String(settings.envia?.packageDefaults?.height ?? 10),
      };
      setForm(nextForm);
      setEnviaHasSavedToken(Boolean(settings.envia?.hasApiToken));
      setSavedSnapshots(buildSectionSnapshots(nextForm));
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to load store settings"
      );
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
    envia: "Parcel partner settings",
  };

  const sectionSerializers = {
    order: serializeOrderSection,
    slabs: serializeSlabsSection,
    upi: serializeUpiSection,
    cart: serializeCartSection,
    envia: serializeEnviaSection,
  };

  const isSectionDirty = (section) =>
    sectionSerializers[section](form) !== savedSnapshots[section];

  const dirtySections = {
    order: isSectionDirty("order"),
    slabs: isSectionDirty("slabs"),
    upi: isSectionDirty("upi"),
    cart: isSectionDirty("cart"),
    envia: isSectionDirty("envia"),
  };

  const saveSection = async (section) => {
    setSavingSection(section);
    setError("");
    setSuccess("");

    if (
      section === "envia" &&
      form.enviaEnabled &&
      !form.enviaApiToken.trim() &&
      !enviaHasSavedToken
    ) {
      setError("Envia API token is required when Envia is enabled");
      setSavingSection("");
      return;
    }

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
      } else if (section === "envia") {
        payload = {
          envia: {
            enabled: Boolean(form.enviaEnabled),
            useSandbox: Boolean(form.enviaUseSandbox),
            apiToken: form.enviaApiToken.trim(),
            defaultCarrier: form.enviaDefaultCarrier.trim(),
            defaultService: form.enviaDefaultService.trim(),
            origin: {
              name: form.enviaOriginName.trim(),
              company: form.enviaOriginCompany.trim(),
              email: form.enviaOriginEmail.trim(),
              phone: form.enviaOriginPhone.trim(),
              street: form.enviaOriginStreet.trim(),
              city: form.enviaOriginCity.trim(),
              state: form.enviaOriginState.trim(),
              country: form.enviaOriginCountry.trim().toUpperCase(),
              postalCode: form.enviaOriginPostalCode.trim(),
            },
            packageDefaults: {
              type: form.enviaPackageType.trim(),
              content: form.enviaPackageContent.trim(),
              amount: Number(form.enviaPackageAmount),
              weightUnit: form.enviaWeightUnit.trim().toUpperCase(),
              lengthUnit: form.enviaLengthUnit.trim().toUpperCase(),
              weight: Number(form.enviaWeight),
              length: Number(form.enviaLength),
              width: Number(form.enviaWidth),
              height: Number(form.enviaHeight),
            },
          },
        };
      }

      await updateStoreSettings(payload);
      setSuccess(`${sectionSaveLabels[section]} saved successfully`);
      if (section === "envia" && form.enviaApiToken.trim()) {
        setEnviaHasSavedToken(true);
      }
      setSavedSnapshots((prev) => ({
        ...prev,
        [section]: sectionSerializers[section](form),
      }));
      await loadSettings();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to save store settings"
      );
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
          disabled={!dirty || isSaving}
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

        <div
          className={`${cardClass} space-y-5 ${
            dirtySections.envia ? "ring-2 ring-amber-200" : ""
          }`}
        >
          <div>
            <h3 className="font-semibold text-neutral-900">Parcel Partner (Envia)</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Generate shipping labels and tracking directly from Admin orders.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={form.enviaEnabled}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enviaEnabled: e.target.checked }))
                }
              />
              Enable Envia shipping
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={form.enviaUseSandbox}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enviaUseSandbox: e.target.checked }))
                }
              />
              Use sandbox (recommended for testing)
            </label>
          </div>

          {form.enviaEnabled && !form.enviaApiToken.trim() && !enviaHasSavedToken ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Enable is ON but API Token is empty. Paste your Envia token below, or turn
              Enable OFF until settings are ready.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>API Token</label>
              <input
                type="text"
                className={inputClass}
                value={form.enviaApiToken}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enviaApiToken: e.target.value }))
                }
                placeholder={
                  enviaHasSavedToken && !form.enviaApiToken.trim()
                    ? "Token saved — leave blank to keep"
                    : "Paste Envia API token"
                }
              />
              {enviaHasSavedToken && !form.enviaApiToken.trim() ? (
                <p className="mt-1 text-xs text-neutral-500">
                  A token is already saved on the server.
                </p>
              ) : null}
            </div>
            <div>
              <label className={labelClass}>Default Carrier / Service</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  className={inputClass}
                  value={form.enviaDefaultCarrier}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, enviaDefaultCarrier: e.target.value }))
                  }
                  placeholder="xpressBees"
                />
                <input
                  type="text"
                  className={inputClass}
                  value={form.enviaDefaultService}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, enviaDefaultService: e.target.value }))
                  }
                  placeholder="surface"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-900">Origin Address (From Warehouse)</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                value={form.enviaOriginName}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaOriginName: e.target.value }))}
                placeholder="Contact name"
              />
              <input
                className={inputClass}
                value={form.enviaOriginCompany}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaOriginCompany: e.target.value }))}
                placeholder="Company name"
              />
              <input
                className={inputClass}
                value={form.enviaOriginEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaOriginEmail: e.target.value }))}
                placeholder="Email"
              />
              <input
                className={inputClass}
                value={form.enviaOriginPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaOriginPhone: e.target.value }))}
                placeholder="Phone"
              />
              <input
                className={`${inputClass} sm:col-span-2`}
                value={form.enviaOriginStreet}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaOriginStreet: e.target.value }))}
                placeholder="Street address"
              />
              <input
                className={inputClass}
                value={form.enviaOriginCity}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaOriginCity: e.target.value }))}
                placeholder="City"
              />
              <input
                className={inputClass}
                value={form.enviaOriginState}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaOriginState: e.target.value }))}
                placeholder="State"
              />
              <input
                className={inputClass}
                value={form.enviaOriginCountry}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaOriginCountry: e.target.value }))}
                placeholder="Country code (IN)"
              />
              <input
                className={inputClass}
                value={form.enviaOriginPostalCode}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enviaOriginPostalCode: e.target.value }))
                }
                placeholder="Postal code"
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-900">Default Package</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                className={inputClass}
                value={form.enviaPackageType}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaPackageType: e.target.value }))}
                placeholder="Type (box)"
              />
              <input
                className={inputClass}
                value={form.enviaPackageContent}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enviaPackageContent: e.target.value }))
                }
                placeholder="Content"
              />
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.enviaPackageAmount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enviaPackageAmount: e.target.value }))
                }
                placeholder="Amount"
              />
              <input
                className={inputClass}
                value={form.enviaWeightUnit}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaWeightUnit: e.target.value }))}
                placeholder="Weight unit (KG)"
              />
              <input
                className={inputClass}
                value={form.enviaLengthUnit}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaLengthUnit: e.target.value }))}
                placeholder="Length unit (CM)"
              />
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={inputClass}
                value={form.enviaWeight}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaWeight: e.target.value }))}
                placeholder="Weight"
              />
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.enviaLength}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaLength: e.target.value }))}
                placeholder="Length"
              />
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.enviaWidth}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaWidth: e.target.value }))}
                placeholder="Width"
              />
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.enviaHeight}
                onChange={(e) => setForm((prev) => ({ ...prev, enviaHeight: e.target.value }))}
                placeholder="Height"
              />
            </div>
          </div>

          <SectionSaveButton section="envia" />
        </div>
      </div>
    </div>
  );
}

export default StoreSettingsSection;
