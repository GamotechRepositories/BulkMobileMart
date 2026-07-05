import { useEffect, useMemo, useState } from "react";
import {
  createAdminOrderShipment,
  getStoreSettings,
  linkAdminOrderShipment,
  quoteAdminOrderShipmentRates,
  syncAdminOrderShipment,
} from "../../api/api";
import { getOrderNumber } from "../../utils/orderNumber";
import {
  SHIPPING_SERVICES,
  getShippingServiceCarriers,
  mapQuotesToShippingServices,
  normalizePackageWeight,
} from "@shared/shipping/shippingServices.js";
import {
  DEFAULT_SHIPMENT_CONTENT,
  SHIPMENT_CONTENTS,
} from "@shared/shipping/shipmentContents.js";
import { adminFilterInputClass, cardClass } from "./adminStyles";
import { formatDateTime, formatPrice } from "./sections/adminOrderUtils";

const EMPTY_PACKAGE = {
  weight: "",
  weightUnit: "KG",
  length: "",
  width: "",
  height: "",
  content: DEFAULT_SHIPMENT_CONTENT,
};

function buildPackagePayload(form) {
  const normalized = normalizePackageWeight(form.weight, form.weightUnit);
  return {
    weight: normalized.weight,
    weightUnit: normalized.weightUnit,
    length: Number(form.length),
    width: Number(form.width),
    height: Number(form.height),
    content: String(form.content || "").trim(),
  };
}

export default function AdminOrderShipmentPanel({
  order,
  onOrderUpdated,
  onError,
  onSuccess,
}) {
  const [packageForm, setPackageForm] = useState(EMPTY_PACKAGE);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(SHIPPING_SERVICES[0]?.id || "");
  const [quoteErrors, setQuoteErrors] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [linkingTracking, setLinkingTracking] = useState(false);
  const [syncingTracking, setSyncingTracking] = useState(false);
  const [mode, setMode] = useState("create");

  const hasTracking = Boolean(order?.shipment?.trackingNumber);
  const orderId = getOrderNumber(order);

  useEffect(() => {
    let active = true;
    getStoreSettings()
      .then(({ data }) => {
        if (!active) return;
        const pkg = data?.data?.envia?.packageDefaults || {};
        setPackageForm({
          weight: String(pkg.weight ?? 1),
          weightUnit: "KG",
          length: String(pkg.length ?? 20),
          width: String(pkg.width ?? 15),
          height: String(pkg.height ?? 10),
          content: SHIPMENT_CONTENTS.includes(pkg.content)
            ? pkg.content
            : DEFAULT_SHIPMENT_CONTENT,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [order?._id]);

  const selectedService = useMemo(() => {
    const list = serviceOptions.length ? serviceOptions : SHIPPING_SERVICES;
    return list.find((entry) => entry.id === selectedServiceId);
  }, [serviceOptions, selectedServiceId]);

  const updatePackageField = (field, value) => {
    setPackageForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFetchRates = async () => {
    if (!order || loadingRates) return;
    setLoadingRates(true);
    onError("");
    onSuccess("");
    try {
      const carriers = getShippingServiceCarriers();

      const { data } = await quoteAdminOrderShipmentRates(order._id, {
        ...buildPackagePayload(packageForm),
        carriers,
      });

      const quotes = data?.data?.quotes || [];
      const mapped = mapQuotesToShippingServices(quotes);
      setServiceOptions(mapped);
      setQuoteErrors(data?.data?.errors || []);

      const firstAvailable =
        mapped.find((entry) => entry.quote)?.id || mapped[0]?.id || "";
      setSelectedServiceId(firstAvailable);

      const availableCount = mapped.filter((entry) => entry.quote).length;
      if (!availableCount) {
        onError("No rates returned for these services. Check weight, address, and Envia settings.");
      } else {
        onSuccess(`Rates loaded for ${availableCount} of ${mapped.length} services.`);
      }
    } catch (err) {
      onError(err.response?.data?.message || "Failed to fetch rates");
      setServiceOptions([]);
      setQuoteErrors([]);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!order || creatingLabel || !selectedService?.quote) return;
    setCreatingLabel(true);
    onError("");
    onSuccess("");
    try {
      const { data } = await createAdminOrderShipment(order._id, {
        ...buildPackagePayload(packageForm),
        carrier: selectedService.quote.carrier,
        service: selectedService.quote.service,
      });
      onOrderUpdated(data.data);
      onSuccess("Shipping label created. Tracking is linked to the order.");
      setServiceOptions([]);
    } catch (err) {
      onError(err.response?.data?.message || "Failed to create label");
    } finally {
      setCreatingLabel(false);
    }
  };

  const handleLinkTracking = async (event) => {
    event.preventDefault();
    if (!order || linkingTracking || !trackingInput.trim()) return;
    setLinkingTracking(true);
    onError("");
    onSuccess("");
    try {
      const { data } = await linkAdminOrderShipment(order._id, {
        trackingNumber: trackingInput.trim(),
      });
      onOrderUpdated(data.data);
      setTrackingInput("");
      onSuccess("Tracking linked. Customer will get live updates.");
    } catch (err) {
      onError(err.response?.data?.message || "Failed to link tracking");
    } finally {
      setLinkingTracking(false);
    }
  };

  const handleSyncTracking = async () => {
    if (!order || syncingTracking || !order.shipment?.trackingNumber) return;
    setSyncingTracking(true);
    onError("");
    onSuccess("");
    try {
      const { data } = await syncAdminOrderShipment(order._id);
      onOrderUpdated(data.data);
      onSuccess("Tracking updated from Envia.");
    } catch (err) {
      onError(err.response?.data?.message || "Failed to refresh tracking");
    } finally {
      setSyncingTracking(false);
    }
  };

  return (
    <div className={cardClass}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-neutral-900">Shipment</h3>
        {!hasTracking ? (
          <div className="flex rounded-md border border-neutral-200 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`rounded px-2.5 py-1 font-semibold ${
                mode === "create" ? "bg-neutral-900 text-white" : "text-neutral-600"
              }`}
            >
              Create label
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`rounded px-2.5 py-1 font-semibold ${
                mode === "link" ? "bg-neutral-900 text-white" : "text-neutral-600"
              }`}
            >
              Link tracking
            </button>
          </div>
        ) : null}
      </div>

      {hasTracking ? (
        <div className="space-y-3 text-sm text-neutral-700">
          <p>
            Tracking:{" "}
            <span className="font-semibold text-neutral-900">{order.shipment.trackingNumber}</span>
          </p>
          <p>
            Carrier/Service:{" "}
            <span className="font-medium">
              {[order.shipment.carrier, order.shipment.service].filter(Boolean).join(" / ") || "—"}
            </span>
          </p>
          <p>
            Status:{" "}
            <span className="font-medium">
              {order.shipment.status || order.shipment.statusMessage || "Not available"}
            </span>
          </p>
          {order.shipment.syncedAt ? (
            <p className="text-xs text-neutral-500">
              Last updated {formatDateTime(order.shipment.syncedAt)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSyncTracking}
              disabled={syncingTracking}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            >
              {syncingTracking ? "Refreshing…" : "Refresh tracking"}
            </button>
            {order.shipment.labelUrl ? (
              <a
                href={order.shipment.labelUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
              >
                Download label
              </a>
            ) : null}
            {order.shipment.trackUrl ? (
              <a
                href={order.shipment.trackUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
              >
                Open tracking
              </a>
            ) : null}
          </div>
          {order.shipment.events?.length > 0 ? (
            <div className="border-t border-neutral-200 pt-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                Tracking history
              </p>
              <ul className="space-y-2">
                {order.shipment.events.map((event, index) => (
                  <li key={`${event.date}-${index}`} className="text-xs text-neutral-600">
                    <span className="font-medium text-neutral-800">
                      {event.status || event.description || "Update"}
                    </span>
                    {event.date ? ` · ${event.date}` : ""}
                    {event.location ? ` · ${event.location}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : mode === "link" ? (
        <div className="space-y-3 text-sm text-neutral-600">
          <p>
            Shipment created outside the app (Envia portal, Delhivery, etc.)? Paste the tracking
            number for order #{orderId}.
          </p>
          <form onSubmit={handleLinkTracking} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Tracking number"
              className={adminFilterInputClass}
            />
            <button
              type="submit"
              disabled={linkingTracking || !trackingInput.trim()}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {linkingTracking ? "Linking…" : "Link tracking"}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4 text-sm text-neutral-700">
          <p className="text-neutral-600">
            Enter package details, compare shipping partners, then create the label you want.
          </p>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">
              Content <span className="text-red-600">*</span>
            </span>
            <select
              value={packageForm.content}
              onChange={(e) => updatePackageField("content", e.target.value)}
              className={adminFilterInputClass}
            >
              {SHIPMENT_CONTENTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-xs font-semibold text-neutral-500">Unit</span>
            <div className="inline-flex rounded-md border border-neutral-300 p-0.5">
              <button
                type="button"
                onClick={() => updatePackageField("weightUnit", "KG")}
                className={`rounded px-4 py-1.5 text-xs font-semibold ${
                  packageForm.weightUnit === "KG"
                    ? "bg-sky-600 text-white"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                KG / CM
              </button>
              <button
                type="button"
                onClick={() => updatePackageField("weightUnit", "G")}
                className={`rounded px-4 py-1.5 text-xs font-semibold ${
                  packageForm.weightUnit === "G"
                    ? "bg-sky-600 text-white"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                Gram / CM
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="mb-1 block text-xs font-semibold text-neutral-500">
                Weight <span className="text-red-600">*</span>
              </span>
              <div className="flex overflow-hidden rounded-md border border-neutral-300">
                <input
                  type="number"
                  min="0.01"
                  step={packageForm.weightUnit === "G" ? "1" : "0.01"}
                  value={packageForm.weight}
                  onChange={(e) => updatePackageField("weight", e.target.value)}
                  className={`${adminFilterInputClass} border-0 focus:ring-0`}
                />
                <span className="flex min-w-[3.5rem] items-center justify-center border-l border-neutral-300 bg-neutral-50 px-2 text-xs font-semibold text-neutral-600">
                  {packageForm.weightUnit === "G" ? "G" : "KG"}
                </span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-neutral-500">
                Length <span className="text-red-600">*</span>
              </span>
              <div className="flex overflow-hidden rounded-md border border-neutral-300">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={packageForm.length}
                  onChange={(e) => updatePackageField("length", e.target.value)}
                  className={`${adminFilterInputClass} border-0 focus:ring-0`}
                />
                <span className="flex min-w-[3rem] items-center justify-center border-l border-neutral-300 bg-neutral-50 px-2 text-xs font-semibold text-neutral-600">
                  CM
                </span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-neutral-500">
                Width <span className="text-red-600">*</span>
              </span>
              <div className="flex overflow-hidden rounded-md border border-neutral-300">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={packageForm.width}
                  onChange={(e) => updatePackageField("width", e.target.value)}
                  className={`${adminFilterInputClass} border-0 focus:ring-0`}
                />
                <span className="flex min-w-[3rem] items-center justify-center border-l border-neutral-300 bg-neutral-50 px-2 text-xs font-semibold text-neutral-600">
                  CM
                </span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-neutral-500">
                Height <span className="text-red-600">*</span>
              </span>
              <div className="flex overflow-hidden rounded-md border border-neutral-300">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={packageForm.height}
                  onChange={(e) => updatePackageField("height", e.target.value)}
                  className={`${adminFilterInputClass} border-0 focus:ring-0`}
                />
                <span className="flex min-w-[3rem] items-center justify-center border-l border-neutral-300 bg-neutral-50 px-2 text-xs font-semibold text-neutral-600">
                  CM
                </span>
              </div>
            </label>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold text-neutral-500">
              Shipping partner
            </span>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-neutral-200 p-3 lg:grid-cols-5">
              {(serviceOptions.length ? serviceOptions : SHIPPING_SERVICES).map((entry) => {
                const quote = entry.quote;
                const isSelected = selectedServiceId === entry.id;
                return (
                  <label
                    key={entry.id}
                    className={`flex h-full cursor-pointer flex-col gap-1.5 rounded-md border px-2 py-2 ${
                      isSelected
                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="shipping-service"
                        checked={isSelected}
                        onChange={() => setSelectedServiceId(entry.id)}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="min-w-0 text-xs font-medium leading-snug text-neutral-900 lg:text-[11px]">
                        {entry.label}
                      </span>
                    </span>
                    {quote ? (
                      <span className="pl-5 text-[10px] leading-snug text-neutral-600 lg:pl-0 lg:text-[10px]">
                        <span className="block font-semibold text-neutral-800">
                          {formatPrice(quote.totalPrice)}
                        </span>
                        {quote.deliveryEstimate ? (
                          <span className="block">{quote.deliveryEstimate}</span>
                        ) : null}
                      </span>
                    ) : serviceOptions.length > 0 ? (
                      <span className="pl-5 text-[10px] text-amber-700 lg:pl-0">
                        Not available
                      </span>
                    ) : (
                      <span className="pl-5 text-[10px] text-neutral-500 lg:pl-0">
                        Compare rates
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleFetchRates}
            disabled={loadingRates}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
          >
            {loadingRates ? "Fetching rates…" : "Compare rates"}
          </button>

          {quoteErrors.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {quoteErrors.map((entry) => (
                <p key={entry.carrier}>
                  {entry.carrier}: {entry.message}
                </p>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleCreateLabel}
            disabled={creatingLabel || !selectedService?.quote}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creatingLabel ? "Creating label…" : "Create label with selected service"}
          </button>
        </div>
      )}
    </div>
  );
}
