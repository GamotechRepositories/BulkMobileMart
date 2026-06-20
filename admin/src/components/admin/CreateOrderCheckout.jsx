import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createAdminOrder, getAllProducts, getStoreSettings } from "../../api/api";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminFilterInputClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  btnPrimary,
  btnSecondary,
  cardClass,
  labelClass,
} from "./adminStyles";
import { formatPrice } from "./sections/adminOrderUtils";
import {
  buildLineItemKey,
  getAvailableColors,
  getCartAdjustStep,
  getMinOrderQuantity,
  getUnitPriceForQuantity,
  isMultiVariant,
} from "../../utils/productPricing";
import {
  calculateShippingCharge,
  getMinimumOrderShortfall,
  meetsMinimumOrder,
} from "../../utils/orderSettings";
import {
  calculateOrderTotal,
  GST_EXCLUDED_NOTE,
  GST_PERCENT_LABEL,
} from "../../utils/gst";
import {
  calculateAdvanceAmount,
  PAYMENT_STATUS,
} from "../../utils/payment";

const btnCompactPrimary = `${btnPrimary} !px-2.5 !py-1.5 text-xs`;
const btnCompactSecondary = `${btnSecondary} !px-2.5 !py-1.5 text-xs`;
const btnAddedClass =
  "inline-flex w-full items-center justify-center rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 sm:w-auto";

function getProductImage(product) {
  return product?.productImages?.[0] || "";
}

function ProductThumb({ product, className = "h-12 w-12" }) {
  const image = getProductImage(product);
  return (
    <div
      className={`${className} shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50`}
    >
      {image ? (
        <img src={image} alt={product?.name || "Product"} className="h-full w-full object-contain p-0.5" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">—</div>
      )}
    </div>
  );
}

function getDefaultDraft(product) {
  const variantName = isMultiVariant(product) ? product.variants?.[0]?.name || "" : "";
  const colors = getAvailableColors(product, variantName);
  return {
    variantName,
    colorName: colors.length === 1 ? colors[0].name || "" : "",
    quantity: getMinOrderQuantity(product, variantName),
  };
}

function needsConfiguration(product) {
  if (isMultiVariant(product)) return true;
  return getAvailableColors(product).length > 0;
}

function ProductSearchCard({
  product,
  draft,
  isExpanded,
  isInOrder,
  onToggleExpand,
  onQuickAdd,
  onDraftChange,
  onConfirmAdd,
  onError,
}) {
  const colors = useMemo(
    () => getAvailableColors(product, draft.variantName),
    [product, draft.variantName]
  );
  const step = getCartAdjustStep(product, draft.variantName);
  const minQty = getMinOrderQuantity(product, draft.variantName);
  const unitPrice = getUnitPriceForQuantity(product, draft.quantity, draft.variantName);
  const configurable = needsConfiguration(product);

  const adjustQty = (delta) => {
    onDraftChange({
      ...draft,
      quantity: Math.max(minQty, draft.quantity + delta * step),
    });
  };

  const handleConfirm = () => {
    if (isMultiVariant(product) && !draft.variantName.trim()) {
      onError?.("Select a variant");
      return;
    }
    if (colors.length > 0 && !draft.colorName.trim()) {
      onError?.("Select a color");
      return;
    }
    onConfirmAdd(product, draft);
  };

  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm sm:p-3">
      <div className="flex min-w-0 gap-2.5">
        <ProductThumb product={product} />

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-text-primary">
              {product.name}
            </h3>
            <p className="mt-0.5 truncate text-[10px] text-text-secondary">
              {product.brandName || "No brand"}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-text-primary">
              From {formatPrice(getUnitPriceForQuantity(product, minQty, draft.variantName))}{" "}
              <span className="text-text-secondary">(excl. GST)</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-col sm:items-stretch">
            {isInOrder ? (
              <span className={btnAddedClass}>Added</span>
            ) : configurable ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className={`${isExpanded ? btnCompactSecondary : btnCompactPrimary} w-full sm:w-auto`}
              >
                {isExpanded ? "Close" : "Add"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onQuickAdd}
                className={`${btnCompactPrimary} w-full sm:w-auto`}
              >
                Add
              </button>
            )}
            {isInOrder && configurable ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className={`${btnCompactSecondary} w-full sm:w-auto`}
              >
                {isExpanded ? "Close" : "Add variant"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-2.5 space-y-2.5 border-t border-neutral-100 pt-2.5">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {isMultiVariant(product) ? (
              <div className="col-span-2 min-w-0 lg:col-span-1">
                <label className={labelClass}>Variant</label>
                <select
                  value={draft.variantName}
                  onChange={(e) => {
                    const variantName = e.target.value;
                    const nextColors = getAvailableColors(product, variantName);
                    onDraftChange({
                      variantName,
                      colorName: nextColors.length === 1 ? nextColors[0].name || "" : "",
                      quantity: getMinOrderQuantity(product, variantName),
                    });
                  }}
                  className={adminFilterInputClass}
                >
                  <option value="">Select variant</option>
                  {product.variants.map((variant) => (
                    <option key={variant.name} value={variant.name}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {colors.length > 0 ? (
              <div className="col-span-2 min-w-0 lg:col-span-1">
                <label className={labelClass}>Color</label>
                <select
                  value={draft.colorName}
                  onChange={(e) => onDraftChange({ ...draft, colorName: e.target.value })}
                  className={adminFilterInputClass}
                >
                  <option value="">Select color</option>
                  {colors.map((color) => (
                    <option key={color.name} value={color.name}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="col-span-2 min-w-0 lg:col-span-1">
              <label className={labelClass}>Quantity</label>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button type="button" onClick={() => adjustQty(-1)} className={btnCompactSecondary}>
                  −
                </button>
                <input
                  type="number"
                  min={minQty}
                  step={step}
                  value={draft.quantity}
                  onChange={(e) =>
                    onDraftChange({
                      ...draft,
                      quantity: Math.max(minQty, Number(e.target.value) || minQty),
                    })
                  }
                  className={`${adminFilterInputClass} min-w-0 flex-1 text-center`}
                />
                <button type="button" onClick={() => adjustQty(1)} className={btnCompactSecondary}>
                  +
                </button>
              </div>
            </div>

            <div className="col-span-2 flex items-end lg:col-span-1">
              <button
                type="button"
                onClick={handleConfirm}
                className={`${btnCompactPrimary} w-full sm:w-auto`}
              >
                Add to Order
              </button>
            </div>
          </div>
          <p className="text-[10px] text-text-secondary">
            Unit price: {formatPrice(unitPrice)} · Line total:{" "}
            {formatPrice(unitPrice * draft.quantity)}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function CreateOrderCheckout({ userId, addressId, onSuccess, onError }) {
  const [lineItems, setLineItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [hasSearchedProducts, setHasSearchedProducts] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState(() => new Set());
  const [productDrafts, setProductDrafts] = useState({});
  const [storeSettings, setStoreSettings] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [orderMessage, setOrderMessage] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    getStoreSettings()
      .then(({ data }) => setStoreSettings(data.data))
      .catch(() => setStoreSettings(null));
  }, []);

  const productIdsInOrder = useMemo(
    () => new Set(lineItems.map((item) => item.product._id)),
    [lineItems]
  );

  const subtotal = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) =>
          sum +
          getUnitPriceForQuantity(item.product, item.quantity, item.variantName) * item.quantity,
        0
      ),
    [lineItems]
  );

  const deliveryCharges = useMemo(
    () => calculateShippingCharge(subtotal, storeSettings),
    [subtotal, storeSettings]
  );

  const { gstAmount, total } = useMemo(
    () => calculateOrderTotal(subtotal, deliveryCharges),
    [subtotal, deliveryCharges]
  );
  const minimumMet = meetsMinimumOrder(subtotal, storeSettings);
  const minimumShortfall = getMinimumOrderShortfall(subtotal, storeSettings);

  const addToLineItems = useCallback((product, draft) => {
    const { variantName = "", colorName = "", quantity } = draft;
    const key = buildLineItemKey(product._id, variantName, colorName);

    setLineItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          key,
          product,
          variantName,
          colorName,
          quantity,
        },
      ];
    });
    onError?.("");
  }, [onError]);

  const handleProductSearch = async () => {
    if (!productSearch.trim()) {
      onError?.("Enter a product name or SKU to search");
      return;
    }
    try {
      setSearchingProducts(true);
      setHasSearchedProducts(true);
      setExpandedProductIds(new Set());
      const { data } = await getAllProducts({
        page: 1,
        limit: 24,
        search: productSearch.trim(),
        sortBy: "name",
        sortDir: "asc",
      });
      const products = (data.data || []).filter((product) => product.isActive !== false);
      setSearchResults(products);
      setProductDrafts(
        Object.fromEntries(products.map((product) => [product._id, getDefaultDraft(product)]))
      );
    } catch (err) {
      onError?.(err.response?.data?.message || "Failed to search products");
      setSearchResults([]);
      setProductDrafts({});
    } finally {
      setSearchingProducts(false);
    }
  };

  const toggleProductExpand = (productId) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
    setProductDrafts((prev) => {
      if (prev[productId]) return prev;
      const product = searchResults.find((item) => item._id === productId);
      return product ? { ...prev, [productId]: getDefaultDraft(product) } : prev;
    });
  };

  const handleQuickAdd = (product) => {
    const draft = getDefaultDraft(product);
    addToLineItems(product, draft);
  };

  const handleConfirmAdd = (product, draft) => {
    addToLineItems(product, draft);
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      next.delete(product._id);
      return next;
    });
  };

  const updateLineQty = useCallback((key, delta) => {
    setLineItems((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const step = getCartAdjustStep(item.product, item.variantName);
          const minQty = getMinOrderQuantity(item.product, item.variantName);
          const nextQty = item.quantity + delta * step;
          return { ...item, quantity: Math.max(minQty, nextQty) };
        })
        .filter((item) => item.quantity >= getMinOrderQuantity(item.product, item.variantName))
    );
  }, []);

  const removeLineItem = (key) => {
    setLineItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handlePlaceOrder = async () => {
    if (!lineItems.length) {
      onError?.("Add at least one product");
      return;
    }
    if (!minimumMet) {
      onError?.(`Minimum order value is ${formatPrice(minimumShortfall + subtotal)}. Add more items.`);
      return;
    }

    try {
      setPlacingOrder(true);
      onError?.("");
      const adminPaymentMethod =
        paymentStatus === PAYMENT_STATUS.PAID ? "online" : "cod";
      const { data } = await createAdminOrder({
        userId,
        addressId,
        paymentMethod: adminPaymentMethod,
        paymentStatus,
        message: orderMessage.trim(),
        checkoutItems: lineItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          variantName: item.variantName || "",
          colorName: item.colorName || "",
        })),
      });
      setPlacedOrder(data.data);
      onSuccess?.(data.data);
    } catch (err) {
      onError?.(err.response?.data?.message || "Failed to create order");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (placedOrder) {
    return (
      <div className={cardClass}>
        <h2 className="text-base font-bold text-text-primary">Order Created</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Order #{placedOrder.orderNumber || placedOrder._id?.slice(-6)} placed for{" "}
          {formatPrice(placedOrder.total)}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/orders/${placedOrder._id}`} className={btnPrimary}>
            View Order
          </Link>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              setPlacedOrder(null);
              setLineItems([]);
              setOrderMessage("");
              setPaymentStatus("unpaid");
              setProductSearch("");
              setSearchResults([]);
              setHasSearchedProducts(false);
              setExpandedProductIds(new Set());
              setProductDrafts({});
            }}
          >
            Create Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className={cardClass}>
        <h2 className="text-sm font-bold text-text-primary">Add Products</h2>
        <p className="mt-1 text-[10px] text-text-secondary">{GST_EXCLUDED_NOTE}</p>

        <div className="mt-4 grid grid-cols-2 items-end gap-2 sm:gap-3 lg:grid-cols-[1fr_auto]">
          <div className="col-span-2 min-w-0 lg:col-span-1">
            <label className={labelClass}>Search products</label>
            <input
              type="search"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleProductSearch()}
              placeholder="Name, brand, or SKU"
              className={adminFilterInputClass}
            />
          </div>
          <button
            type="button"
            onClick={handleProductSearch}
            disabled={searchingProducts}
            className={`${btnSecondary} col-span-2 w-full lg:col-span-1 lg:w-auto`}
          >
            {searchingProducts ? "Searching..." : "Search Products"}
          </button>
        </div>

        {hasSearchedProducts && !searchingProducts ? (
          searchResults.length === 0 ? (
            <p className="mt-4 text-sm text-text-secondary">No products found.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {searchResults.map((product) => (
                <ProductSearchCard
                  key={product._id}
                  product={product}
                  draft={productDrafts[product._id] || getDefaultDraft(product)}
                  isExpanded={expandedProductIds.has(product._id)}
                  isInOrder={productIdsInOrder.has(product._id)}
                  onToggleExpand={() => toggleProductExpand(product._id)}
                  onQuickAdd={() => handleQuickAdd(product)}
                  onDraftChange={(draft) =>
                    setProductDrafts((prev) => ({ ...prev, [product._id]: draft }))
                  }
                  onConfirmAdd={handleConfirmAdd}
                  onError={onError}
                />
              ))}
            </div>
          )
        ) : null}
      </div>

      {lineItems.length > 0 ? (
        <div className={cardClass}>
          <h2 className="text-sm font-bold text-text-primary">
            Order Items ({lineItems.length})
          </h2>

          <div className="mt-3 space-y-2 md:hidden">
            {lineItems.map((item) => {
              const unitPrice = getUnitPriceForQuantity(
                item.product,
                item.quantity,
                item.variantName
              );
              const step = getCartAdjustStep(item.product, item.variantName);
              return (
                <div
                  key={item.key}
                  className="rounded-xl border border-neutral-200 bg-neutral-50/40 p-2.5"
                >
                  <div className="flex items-start gap-2">
                    <ProductThumb product={item.product} className="h-10 w-10" />
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-semibold leading-snug text-text-primary">
                          {item.product.name}
                        </p>
                        {item.variantName ? (
                          <p className="text-[10px] text-text-secondary">{item.variantName}</p>
                        ) : null}
                        {item.colorName ? (
                          <p className="text-[10px] text-text-secondary">{item.colorName}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.key)}
                        className={`${btnSecondary} !px-2 !py-1 text-[10px]`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-[2.875rem]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateLineQty(item.key, -1)}
                        className={`${btnSecondary} !px-2 !py-1 text-xs`}
                      >
                        −
                      </button>
                      <span className="min-w-[1.75rem] text-center text-xs font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateLineQty(item.key, 1)}
                        className={`${btnSecondary} !px-2 !py-1 text-xs`}
                      >
                        +
                      </button>
                      {step > 1 ? (
                        <span className="text-[10px] text-text-secondary">Step {step}</span>
                      ) : null}
                    </div>
                    <div className="text-right text-[10px] sm:text-xs">
                      <p className="text-text-secondary">{formatPrice(unitPrice)} each</p>
                      <p className="text-xs font-semibold text-text-primary">
                        {formatPrice(unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-3 hidden md:block ${adminTableWrapperClass}`}>
            <table className={adminCompactTableClass}>
              <thead>
                <tr className={adminTableHeaderClass}>
                  <th className={adminCompactThClass}>Image</th>
                  <th className={adminCompactThClass}>Product</th>
                  <th className={adminCompactThClass}>Variant</th>
                  <th className={adminCompactThClass}>Qty</th>
                  <th className={adminCompactThClass}>Price</th>
                  <th className={adminCompactThClass}>Total</th>
                  <th className={adminCompactThClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => {
                  const unitPrice = getUnitPriceForQuantity(
                    item.product,
                    item.quantity,
                    item.variantName
                  );
                  const step = getCartAdjustStep(item.product, item.variantName);
                  return (
                    <tr
                      key={item.key}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                    >
                      <td className={adminCompactTdClass}>
                        <ProductThumb product={item.product} className="h-8 w-8" />
                      </td>
                      <td className={`${adminCompactTdClass} text-xs font-medium text-neutral-900`}>
                        <span className="line-clamp-2">{item.product.name}</span>
                        {item.colorName ? (
                          <span className="block truncate text-[10px] text-neutral-500">
                            {item.colorName}
                          </span>
                        ) : null}
                      </td>
                      <td className={`${adminCompactTdClass} text-[10px] text-neutral-600`}>
                        {item.variantName || "—"}
                      </td>
                      <td className={adminCompactTdClass}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateLineQty(item.key, -1)}
                            className={btnSecondary}
                          >
                            −
                          </button>
                          <span className="min-w-[1.75rem] text-center text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateLineQty(item.key, 1)}
                            className={btnSecondary}
                          >
                            +
                          </button>
                        </div>
                        {step > 1 ? (
                          <span className="mt-1 block text-[10px] text-neutral-500">Step: {step}</span>
                        ) : null}
                      </td>
                      <td className={`${adminCompactTdClass} text-xs`}>{formatPrice(unitPrice)}</td>
                      <td className={`${adminCompactTdClass} text-xs font-medium`}>
                        {formatPrice(unitPrice * item.quantity)}
                      </td>
                      <td className={adminCompactTdClass}>
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.key)}
                          className={btnSecondary}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {lineItems.length > 0 ? (
        <div className={cardClass}>
          <h2 className="text-sm font-bold text-text-primary">Order Summary</h2>
          <dl className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Subtotal</dt>
              <dd className="font-medium text-text-primary">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Delivery</dt>
              <dd className="font-medium text-text-primary">{formatPrice(deliveryCharges)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">{GST_PERCENT_LABEL} GST</dt>
              <dd className="font-medium text-text-primary">{formatPrice(gstAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-neutral-100 pt-2 text-sm">
              <dt className="font-semibold text-text-primary">Total</dt>
              <dd className="font-bold text-text-primary">{formatPrice(total)}</dd>
            </div>
          </dl>

          {!minimumMet ? (
            <p className="mt-3 text-sm text-amber-700">
              Add {formatPrice(minimumShortfall)} more to meet the minimum order value.
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <label className={labelClass}>Payment status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className={adminFilterInputClass}
              >
                <option value="unpaid">Unpaid</option>
                <option value={PAYMENT_STATUS.PAID_10}>Paid 10%</option>
                <option value={PAYMENT_STATUS.PAID}>Paid (100%)</option>
              </select>
            </div>
            <div className="col-span-2 min-w-0">
              <label className={labelClass}>Order note (optional)</label>
              <textarea
                value={orderMessage}
                onChange={(e) => setOrderMessage(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="Customer message or internal note"
                className={adminFilterInputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placingOrder || !minimumMet}
              className={`${btnPrimary} w-full sm:w-auto`}
            >
              {placingOrder ? "Creating Order..." : "Create Order"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CreateOrderCheckout;
