import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductImageFrame from "../components/product/ProductImageFrame";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  getAddresses,
  addAddress,
  createRazorpayOrder,
  submitUpiPaymentProof,
  verifyRazorpayPayment,
  getStoreSettings,
} from "../api/api";
import PaymentModal from "../components/checkout/PaymentModal";
import { loadRazorpayScript, openRazorpayCheckout } from "../utils/razorpay";
import AddressForm, { ADDRESS_FORM_FIELDS } from "../components/address/AddressForm";
import {
  clearBuyNowCheckout,
  getBuyNowCheckout,
} from "../utils/checkoutSession";
import {
  formatAddressLine,
  getAddressFullName,
} from "../utils/addressDisplay";
import {
  calculateShippingCharge,
  getMinimumOrderShortfall,
  meetsMinimumOrder,
  mergeStoreSettings,
} from "../utils/orderSettings";

const MAX_ORDER_NOTE_LENGTH = 200;

const formatPrice = (amount, fractionDigits = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);

const safeTrim = (value) => String(value ?? "").trim();

function StepSection({ title, children }) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-3 shadow-sm sm:p-5 lg:p-6">
      <h2 className="mb-3 text-sm font-bold text-text-primary sm:mb-5 sm:text-base lg:text-lg">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const { items, loading: cartLoading, loadCart } = useCart();

  const buyNowItem = getBuyNowCheckout();
  const isBuyNow = Boolean(buyNowItem);
  const checkoutItems = isBuyNow ? [buyNowItem] : items;
  const paymentCheckoutItems = isBuyNow
    ? [
        {
          productId: buyNowItem.productId,
          quantity: buyNowItem.quantity,
          variantName: buyNowItem.variantName || "",
          colorName: buyNowItem.colorName || "",
        },
      ]
    : undefined;

  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [formError, setFormError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [bootstrapping, setBootstrapping] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderSuccessNote, setOrderSuccessNote] = useState("");
  const [message, setMessage] = useState("");
  const [storeSettings, setStoreSettings] = useState(null);
  const messageRef = useRef("");

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + item.discountedPrice * item.quantity,
    0
  );
  const deliveryCharges = calculateShippingCharge(subtotal, storeSettings);
  const orderTotal = subtotal + deliveryCharges;
  const minimumOrderMet = meetsMinimumOrder(subtotal, storeSettings);
  const minimumOrderShortfall = getMinimumOrderShortfall(subtotal, storeSettings);
  const minimumOrderValue = mergeStoreSettings(storeSettings).minimumOrderValue;
  const savings = checkoutItems.reduce((sum, item) => {
    const original = item.price ?? item.discountedPrice;
    const diff = Math.max(0, original - item.discountedPrice);
    return sum + diff * item.quantity;
  }, 0);

  const loadAddresses = async () => {
    setAddressesLoading(true);
    try {
      const { data } = await getAddresses();
      const list = data.data || [];
      setAddresses(list);
      const defaultAddr = list.find((a) => a.isDefault) || list[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr._id);
    } catch {
      setAddresses([]);
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      setBootstrapping(true);
      return;
    }

    let active = true;
    getStoreSettings()
      .then(({ data }) => {
        if (active) setStoreSettings(data.data);
      })
      .catch(() => {
        if (active) setStoreSettings(null);
      });

    return () => {
      active = false;
    };
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) {
      setBootstrapping(true);
      return;
    }

    if (user) {
      const bootstrap = async () => {
        setBootstrapping(true);
        try {
          await Promise.all([loadCart(), loadAddresses()]);
        } finally {
          setBootstrapping(false);
        }
      };
      bootstrap();
    } else {
      setBootstrapping(false);
    }
  }, [user, authLoading, loadCart]);

  useEffect(() => {
    if (
      !authLoading &&
      user &&
      !bootstrapping &&
      !cartLoading &&
      checkoutItems.length === 0 &&
      !orderPlaced
    ) {
      navigate(isBuyNow ? "/product" : "/cart", { replace: true });
    }
  }, [
    authLoading,
    user,
    bootstrapping,
    cartLoading,
    checkoutItems.length,
    navigate,
    orderPlaced,
    isBuyNow,
  ]);

  const completeOrderSuccess = async (note = "") => {
    setOrderSuccessNote(
      note || "Your order has been placed and will be delivered soon."
    );
    setOrderPlaced(true);
    clearBuyNowCheckout();
    await loadCart();
    setShowSuccessModal(true);
  };

  const handleRazorpayPayment = async () => {
    const paymentMode = paymentMethod === "cod" ? "cod_advance" : "online";

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error("Failed to load payment gateway");
    }

    const { data } = await createRazorpayOrder({
      addressId: selectedAddressId,
      paymentMode,
      checkoutItems: paymentCheckoutItems,
    });
    const paymentData = data.data;

    setPlacingOrder(false);

    openRazorpayCheckout({
      keyId: paymentData.keyId,
      amount: paymentData.amount,
      razorpayOrderId: paymentData.razorpayOrderId,
      user,
      description:
        paymentMode === "cod_advance"
          ? "COD advance payment (10%)"
          : "Order payment",
      onSuccess: async (response) => {
        setPlacingOrder(true);
        setOrderError("");
        try {
          await verifyRazorpayPayment({
            addressId: selectedAddressId,
            paymentMode,
            customerMessage: safeTrim(messageRef.current),
            checkoutItems: paymentCheckoutItems,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          setShowPaymentModal(false);
          await completeOrderSuccess();
        } catch (err) {
          setOrderError(
            err.response?.data?.message || "Payment verified but order failed. Contact support."
          );
        } finally {
          setPlacingOrder(false);
        }
      },
      onDismiss: () => {
        setPlacingOrder(false);
        setOrderError("Payment cancelled. Your order was not placed.");
      },
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || placingOrder || !minimumOrderMet) return;
    setOrderError("");
    await loadCart();
    setShowPaymentModal(true);
  };

  const handlePayWithRazorpay = async () => {
    setPlacingOrder(true);
    setOrderError("");
    try {
      await handleRazorpayPayment();
    } catch (err) {
      setOrderError(err.response?.data?.message || "Failed to start payment. Please try again.");
      setPlacingOrder(false);
    }
  };

  const handleSubmitUpiProof = async ({ screenshot, screenshotName, upiTransactionRef }) => {
    const paymentMode = paymentMethod === "cod" ? "cod_advance" : "online";

    setPlacingOrder(true);
    setOrderError("");
    try {
      await submitUpiPaymentProof({
        addressId: selectedAddressId,
        paymentMode,
        customerMessage: safeTrim(messageRef.current),
        checkoutItems: paymentCheckoutItems,
        screenshot,
        screenshotName,
        upiTransactionRef,
      });
      setShowPaymentModal(false);
      await completeOrderSuccess(
        "Your order is confirmed. We will verify your UPI payment screenshot shortly."
      );
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to submit payment proof. Please try again.";
      setOrderError(message);
      if (message.toLowerCase().includes("no longer available")) {
        await loadCart();
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleSaveAddress = async (formData) => {
    setSavingAddress(true);
    setFormError("");
    try {
      const { data } = await addAddress({ ...formData, isDefault: addresses.length === 0 });
      const newAddress = data.data;
      setAddresses((prev) => [newAddress, ...prev]);
      setSelectedAddressId(newAddress._id);
      setShowAddressForm(false);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] bg-mobile-bg px-4 py-16 text-text-primary sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-3 text-2xl font-bold sm:text-3xl">Checkout</h1>
          <p className="mb-6 text-text-secondary">Please login to proceed with checkout.</p>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="rounded-lg bg-primary px-8 py-3 text-sm font-bold tracking-wide text-white transition hover:brightness-110"
          >
            Login / Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mobile-bg text-text-primary">
      {placingOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-10 py-8 shadow-lg">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-border-light border-t-primary" />
            <p className="text-sm font-semibold text-text-primary">
              {paymentMethod === "online" ? "Processing payment..." : "Placing your order..."}
            </p>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-text-primary">Order Confirmed</h3>
            <p className="mb-6 text-sm text-text-secondary">{orderSuccessNote}</p>
            <button
              type="button"
              onClick={() => navigate("/orders")}
              className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              View My Orders
            </button>
          </div>
        </div>
      )}

      <section className="px-3 pb-24 pt-1 sm:px-4 sm:pb-14 lg:px-8 lg:pb-10 lg:pt-2">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-3 text-xs text-text-secondary sm:text-sm">
            <Link to="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-2">›</span>
            <Link to={isBuyNow ? "/product" : "/cart"} className="hover:text-primary">
              {isBuyNow ? "Products" : "Cart"}
            </Link>
            <span className="mx-2">›</span>
            <span className="text-text-primary">Checkout</span>
          </nav>

          <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl lg:text-3xl">Checkout</h1>

          {cartLoading && !isBuyNow ? (
            <div className="grid animate-pulse gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-4">
                <div className="h-44 rounded-xl border border-border-light bg-white" />
                <div className="h-36 rounded-xl border border-border-light bg-white" />
                <div className="h-32 rounded-xl border border-border-light bg-white" />
              </div>
              <div className="h-[480px] rounded-xl border border-border-light bg-white" />
            </div>
          ) : (
            <div className="grid items-start gap-3 sm:gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
              <div className="space-y-3 sm:space-y-4">
                <StepSection title="Payment Method">
                  <div className="space-y-3">
                    <label
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition sm:gap-4 sm:rounded-xl sm:p-4 lg:p-5 ${
                        paymentMethod === "cod"
                          ? "border-primary bg-primary/5"
                          : "border-border-light hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                      />
                      <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-primary sm:h-10 sm:w-10">
                          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.34 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary sm:text-base">Cash on Delivery</p>
                          <p className="mt-0.5 text-xs text-text-secondary sm:mt-1 sm:text-sm">
                            Pay 10% advance now · balance on delivery
                          </p>
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition sm:gap-4 sm:rounded-xl sm:p-4 lg:p-5 ${
                        paymentMethod === "online"
                          ? "border-primary bg-primary/5"
                          : "border-border-light hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="online"
                        checked={paymentMethod === "online"}
                        onChange={() => setPaymentMethod("online")}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                      />
                      <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 sm:h-10 sm:w-10">
                          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary sm:text-base">Pay Online</p>
                          <p className="mt-0.5 text-xs text-text-secondary sm:mt-1 sm:text-sm">
                            UPI, Cards, Net Banking via Razorpay
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </StepSection>

                <StepSection title="Delivery Details">
                  {addressesLoading ? (
                    <div className="h-24 animate-pulse rounded-lg bg-mobile-surface" />
                  ) : (
                    <>
                      {addresses.length === 0 && !showAddressForm && (
                        <p className="mb-4 text-sm text-text-secondary">
                          No saved address yet. Add one to continue.
                        </p>
                      )}

                      {addresses.length > 0 && !showAddressForm && (
                        <ul className="space-y-2">
                          {addresses.map((addr) => (
                            <li key={addr._id}>
                              <label
                                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                                  selectedAddressId === addr._id
                                    ? "border-primary bg-primary/5"
                                    : "border-border-light hover:border-primary/40"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="address"
                                  value={addr._id}
                                  checked={selectedAddressId === addr._id}
                                  onChange={() => setSelectedAddressId(addr._id)}
                                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                                />
                                <div className="min-w-0 flex-1 text-sm">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-text-primary">
                                      {getAddressFullName(addr)}
                                    </p>
                                    {addr.isDefault && (
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-text-secondary">{formatAddressLine(addr)}</p>
                                  <p className="text-text-secondary">+91 {addr.number}</p>
                                </div>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}

                      {showAddressForm ? (
                        <div>
                          {formError && (
                            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                              {formError}
                            </p>
                          )}
                          <AddressForm
                            initial={{
                              ...ADDRESS_FORM_FIELDS,
                              fullName: user.name || "",
                              number: user.phone || "",
                              email: user.email || "",
                            }}
                            onSubmit={handleSaveAddress}
                            onCancel={() => {
                              setShowAddressForm(false);
                              setFormError("");
                            }}
                            submitting={savingAddress}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAddressForm(true)}
                          className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                        >
                          <span className="text-base leading-none">+</span>
                          Add New Address
                        </button>
                      )}
                    </>
                  )}
                </StepSection>

                <StepSection title="Order Notes (Optional)">
                  <div className="relative">
                    <textarea
                      id="orderMessage"
                      value={message}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_ORDER_NOTE_LENGTH) {
                          setMessage(e.target.value);
                        }
                      }}
                      maxLength={MAX_ORDER_NOTE_LENGTH}
                      rows={4}
                      placeholder="Add delivery instructions or any note for your order..."
                      className="w-full resize-none rounded-xl border border-border-light px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-text-muted">
                      {message.length}/{MAX_ORDER_NOTE_LENGTH}
                    </span>
                  </div>
                </StepSection>
              </div>

              <div className="rounded-xl border border-border-light bg-white p-3 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:p-6">
                <h2 className="mb-3 text-sm font-bold sm:mb-5 sm:text-base lg:text-lg">Order Summary</h2>

                <ul className="mb-3 max-h-40 space-y-3 overflow-y-auto sm:mb-5 sm:max-h-56 sm:space-y-4">
                  {checkoutItems.map((item) => (
                    <li key={`${item.productId || item._id}-${item.variantName || "default"}-${item.colorName || "default"}`} className="flex items-center gap-3">
                      <div className="w-14 shrink-0 overflow-hidden rounded-lg border border-border-light">
                        <ProductImageFrame
                          src={item.productImages?.[0]}
                          alt={item.name}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-text-primary">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-text-secondary">Qty: {item.quantity}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-text-primary">
                        {formatPrice(item.discountedPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2.5 border-t border-border-light pt-4 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>Subtotal</span>
                    <span className="font-medium text-text-primary">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Delivery Charges</span>
                    <span className="font-semibold text-text-primary">
                      {formatPrice(deliveryCharges)}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">GST included in prices</p>
                  {!minimumOrderMet ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      Add {formatPrice(minimumOrderShortfall)} more to reach the minimum order of{" "}
                      {formatPrice(minimumOrderValue)}.
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border-light pt-3 sm:mt-4 sm:pt-4">
                  <span className="text-sm font-bold text-text-primary sm:text-base">Total Amount</span>
                  <span className="text-lg font-bold text-primary sm:text-xl lg:text-2xl">
                    {formatPrice(orderTotal)}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-2.5 py-2 text-[11px] font-medium text-green-700 sm:mt-4 sm:px-3 sm:py-2.5 sm:text-sm">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  You will save {formatPrice(savings)} on this order
                </div>

                {orderError && (
                  <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                    {orderError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={!selectedAddressId || placingOrder || !minimumOrderMet}
                  onClick={handlePlaceOrder}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-5 sm:px-6 sm:py-3.5"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0V10.5M4.5 10.5h15v8.25a1.5 1.5 0 01-1.5 1.5h-12a1.5 1.5 0 01-1.5-1.5V10.5z"
                    />
                  </svg>
                  {placingOrder ? "Please wait..." : "Place Order"}
                </button>

              </div>
            </div>
          )}
        </div>
      </section>

      <PaymentModal
        open={showPaymentModal}
        onClose={() => {
          if (!placingOrder) setShowPaymentModal(false);
        }}
        paymentMethod={paymentMethod}
        orderTotal={orderTotal}
        merchantUpiId={storeSettings?.merchantUpiId}
        merchantUpiName={storeSettings?.merchantUpiName}
        onPayWithRazorpay={handlePayWithRazorpay}
        onSubmitUpiProof={handleSubmitUpiProof}
        processing={placingOrder}
        error={orderError}
      />
    </div>
  );
}

export default Checkout;
