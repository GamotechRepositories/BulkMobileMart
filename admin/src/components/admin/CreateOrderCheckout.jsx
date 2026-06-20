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

function CreateOrderCheckout({ userId, addressId, onSuccess, onError }) {
  const [lineItems, setLineItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [hasSearchedProducts, setHasSearchedProducts] = useState(false);
  const [draftProduct, setDraftProduct] = useState(null);
  const [draftVariant, setDraftVariant] = useState("");
  const [draftColor, setDraftColor] = useState("");
  const [draftQty, setDraftQty] = useState(1);
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

  const draftColors = useMemo(() => {
    if (!draftProduct) return [];
    return getAvailableColors(draftProduct, draftVariant);
  }, [draftProduct, draftVariant]);

  const draftStep = useMemo(() => {
    if (!draftProduct) return 1;
    return getCartAdjustStep(draftProduct, draftVariant);
  }, [draftProduct, draftVariant]);

  const draftMinQty = useMemo(() => {
    if (!draftProduct) return 1;
    return getMinOrderQuantity(draftProduct, draftVariant);
  }, [draftProduct, draftVariant]);

  useEffect(() => {
    if (!draftProduct) return;
    setDraftQty((prev) => Math.max(draftMinQty, prev));
  }, [draftProduct, draftVariant, draftMinQty]);

  useEffect(() => {
    if (draftProduct && isMultiVariant(draftProduct) && !draftVariant) {
      setDraftColor("");
      return;
    }
    if (draftColors.length === 1) {
      setDraftColor(draftColors[0].name || "");
    } else if (draftColors.length === 0) {
      setDraftColor("");
    }
  }, [draftProduct, draftVariant, draftColors]);

  const subtotal = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) => sum + getUnitPriceForQuantity(item.product, item.quantity, item.variantName) * item.quantity,
        0
      ),
    [lineItems]
  );

  const deliveryCharges = useMemo(
    () => calculateShippingCharge(subtotal, storeSettings),
    [subtotal, storeSettings]
  );

  const total = subtotal + deliveryCharges;
  const minimumMet = meetsMinimumOrder(subtotal, storeSettings);
  const minimumShortfall = getMinimumOrderShortfall(subtotal, storeSettings);

  const handleProductSearch = async () => {
    if (!productSearch.trim()) {
      onError?.("Enter a product name or SKU to search");
      return;
    }
    try {
      setSearchingProducts(true);
      setHasSearchedProducts(true);
      setDraftProduct(null);
      const { data } = await getAllProducts({
        page: 1,
        limit: 15,
        search: productSearch.trim(),
        sortBy: "name",
        sortDir: "asc",
      });
      setSearchResults((data.data || []).filter((product) => product.isActive !== false));
    } catch (err) {
      onError?.(err.response?.data?.message || "Failed to search products");
      setSearchResults([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  const startAddProduct = (product) => {
    setDraftProduct(product);
    if (isMultiVariant(product)) {
      const firstVariant = product.variants?.[0];
      setDraftVariant(firstVariant?.name || "");
    } else {
      setDraftVariant("");
    }
    setDraftColor("");
    setDraftQty(getMinOrderQuantity(product, isMultiVariant(product) ? product.variants?.[0]?.name : ""));
  };

  const cancelDraft = () => {
    setDraftProduct(null);
    setDraftVariant("");
    setDraftColor("");
    setDraftQty(1);
  };

  const adjustDraftQty = (delta) => {
    setDraftQty((prev) => Math.max(draftMinQty, prev + delta * draftStep));
  };

  const addDraftToOrder = () => {
    if (!draftProduct) return;

    if (isMultiVariant(draftProduct) && !draftVariant.trim()) {
      onError?.("Select a variant");
      return;
    }

    if (draftColors.length > 0 && !draftColor.trim()) {
      onError?.("Select a color");
      return;
    }

    const key = buildLineItemKey(draftProduct._id, draftVariant, draftColor);
    setLineItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + draftQty }
            : item
        );
      }
      return [
        ...prev,
        {
          key,
          product: draftProduct,
          variantName: draftVariant,
          colorName: draftColor,
          quantity: draftQty,
        },
      ];
    });
    cancelDraft();
    onError?.("");
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
      const { data } = await createAdminOrder({
        userId,
        addressId,
        paymentMethod: "cod",
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
            }}
          >
            Create Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <h2 className="text-base font-bold text-text-primary">Add Products</h2>

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
            <div className={`mt-4 ${adminTableWrapperClass}`}>
              <table className={adminCompactTableClass}>
                <thead>
                  <tr className={adminTableHeaderClass}>
                    <th className={adminCompactThClass}>Product</th>
                    <th className={adminCompactThClass}>Brand</th>
                    <th className={adminCompactThClass}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((product) => (
                    <tr
                      key={product._id}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                    >
                      <td className={`${adminCompactTdClass} font-medium text-neutral-900`}>
                        <span className="block truncate">{product.name}</span>
                      </td>
                      <td className={`${adminCompactTdClass} text-neutral-600`}>
                        <span className="block truncate">{product.brandName || "—"}</span>
                      </td>
                      <td className={adminCompactTdClass}>
                        <button
                          type="button"
                          onClick={() => startAddProduct(product)}
                          className={btnSecondary}
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {draftProduct ? (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
            <p className="text-sm font-semibold text-text-primary">{draftProduct.name}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {isMultiVariant(draftProduct) ? (
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <label className={labelClass}>Variant</label>
                  <select
                    value={draftVariant}
                    onChange={(e) => setDraftVariant(e.target.value)}
                    className={adminFilterInputClass}
                  >
                    <option value="">Select variant</option>
                    {draftProduct.variants.map((variant) => (
                      <option key={variant.name} value={variant.name}>
                        {variant.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {draftColors.length > 0 ? (
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <label className={labelClass}>Color</label>
                  <select
                    value={draftColor}
                    onChange={(e) => setDraftColor(e.target.value)}
                    className={adminFilterInputClass}
                  >
                    <option value="">Select color</option>
                    {draftColors.map((color) => (
                      <option key={color.name} value={color.name}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="col-span-2 min-w-0 lg:col-span-1">
                <label className={labelClass}>Quantity</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => adjustDraftQty(-1)} className={btnSecondary}>
                    −
                  </button>
                  <input
                    type="number"
                    min={draftMinQty}
                    step={draftStep}
                    value={draftQty}
                    onChange={(e) =>
                      setDraftQty(Math.max(draftMinQty, Number(e.target.value) || draftMinQty))
                    }
                    className={`${adminFilterInputClass} text-center`}
                  />
                  <button type="button" onClick={() => adjustDraftQty(1)} className={btnSecondary}>
                    +
                  </button>
                </div>
              </div>
              <div className="col-span-2 flex flex-wrap gap-2 lg:col-span-1 lg:items-end">
                <button type="button" onClick={addDraftToOrder} className={btnPrimary}>
                  Add to Order
                </button>
                <button type="button" onClick={cancelDraft} className={btnSecondary}>
                  Cancel
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              Unit price:{" "}
              {formatPrice(getUnitPriceForQuantity(draftProduct, draftQty, draftVariant))}
            </p>
          </div>
        ) : null}
      </div>

      {lineItems.length > 0 ? (
        <div className={cardClass}>
          <h2 className="text-base font-bold text-text-primary">Order Items</h2>
          <div className={`mt-4 ${adminTableWrapperClass}`}>
            <table className={adminCompactTableClass}>
              <thead>
                <tr className={adminTableHeaderClass}>
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
                      <td className={`${adminCompactTdClass} font-medium text-neutral-900`}>
                        <span className="block truncate">{item.product.name}</span>
                        {item.colorName ? (
                          <span className="block truncate text-xs text-neutral-500">
                            {item.colorName}
                          </span>
                        ) : null}
                      </td>
                      <td className={`${adminCompactTdClass} text-neutral-600`}>
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
                          <span className="min-w-[2rem] text-center text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateLineQty(item.key, 1)}
                            className={btnSecondary}
                          >
                            +
                          </button>
                        </div>
                        {step > 1 ? (
                          <span className="mt-1 block text-xs text-neutral-500">Step: {step}</span>
                        ) : null}
                      </td>
                      <td className={adminCompactTdClass}>{formatPrice(unitPrice)}</td>
                      <td className={`${adminCompactTdClass} font-medium`}>
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
          <h2 className="text-base font-bold text-text-primary">Order Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Subtotal</dt>
              <dd className="font-medium text-text-primary">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Delivery</dt>
              <dd className="font-medium text-text-primary">{formatPrice(deliveryCharges)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-2 text-base">
              <dt className="font-semibold text-text-primary">Total</dt>
              <dd className="font-bold text-text-primary">{formatPrice(total)}</dd>
            </div>
          </dl>

          {!minimumMet ? (
            <p className="mt-3 text-sm text-amber-700">
              Add {formatPrice(minimumShortfall)} more to meet the minimum order value.
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-2">
            <div className="min-w-0">
              <label className={labelClass}>Payment status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className={adminFilterInputClass}
              >
                <option value="unpaid">Unpaid (COD)</option>
                <option value="paid">Paid</option>
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
              className={btnPrimary}
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
