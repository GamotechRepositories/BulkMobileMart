import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { getAddresses, addAddress, placeOrder } from "../api/api";
import AddressForm, { ADDRESS_FORM_FIELDS } from "../components/address/AddressForm";

const FREE_DELIVERY_THRESHOLD = 999;
const DELIVERY_CHARGE = 49;

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function Checkout() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const { items, loading: cartLoading, loadCart } = useCart();

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

  const subtotal = items.reduce(
    (sum, item) => sum + item.discountedPrice * item.quantity,
    0
  );
  const deliveryCharges = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const orderTotal = subtotal + deliveryCharges;
  const freeDeliveryGap = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

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
    if (user) {
      loadCart();
      loadAddresses();
    }
  }, [user, loadCart]);

  useEffect(() => {
    if (user && !cartLoading && items.length === 0 && !orderPlaced) {
      navigate("/cart", { replace: true });
    }
  }, [user, cartLoading, items.length, navigate, orderPlaced]);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || placingOrder) return;

    setPlacingOrder(true);
    setOrderError("");

    const minDelay = new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      await Promise.all([
        placeOrder({
          addressId: selectedAddressId,
          paymentMethod,
        }),
        minDelay,
      ]);
      setOrderPlaced(true);
      await loadCart();
      setShowSuccessModal(true);
    } catch (err) {
      setOrderError(err.response?.data?.message || "Failed to place order. Please try again.");
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
      {/* Placing order loader */}
      {placingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-10 py-8 shadow-lg">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-border-light border-t-primary" />
            <p className="text-sm font-semibold text-text-primary">Placing your order...</p>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-text-primary">Successfully Placed Order</h3>
            <p className="mb-6 text-sm text-text-secondary">
              Your order has been placed and will be delivered soon.
            </p>
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

      <section className="px-4 pb-24 pt-8 sm:px-6 sm:pb-14 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-center text-2xl font-bold sm:text-3xl">Checkout</h1>

          {cartLoading ? (
            <div className="grid animate-pulse gap-8 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <div className="h-44 rounded-xl border border-border-light bg-white" />
                <div className="h-36 rounded-xl border border-border-light bg-white" />
              </div>
              <div className="h-[480px] rounded-xl border border-border-light bg-white" />
            </div>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
              {/* Left column */}
              <div className="space-y-6">
                {/* Payment Method */}
                <div className="rounded-xl border border-border-light bg-white p-6 shadow-sm">
                  <h2 className="mb-5 text-base font-bold sm:text-lg">Payment Method</h2>
                  <div className="space-y-3">
                    <label
                      className={`flex cursor-pointer items-center gap-4 rounded-lg border px-5 py-4 transition ${
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
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <div>
                        <p className="font-semibold text-text-primary">Cash on Delivery</p>
                        <p className="text-sm text-text-secondary">Pay when you receive your order</p>
                      </div>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-4 rounded-lg border px-5 py-4 transition ${
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
                        className="h-4 w-4 shrink-0 accent-primary"
                      />
                      <div>
                        <p className="font-semibold text-text-primary">Pay Online</p>
                        <p className="text-sm text-text-secondary">UPI, Cards, Net Banking</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Deliver To */}
                <div className="rounded-xl border border-border-light bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-base font-bold sm:text-lg">Deliver To</h2>

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
                        <ul className="mb-4 space-y-3">
                          {addresses.map((addr) => (
                            <li key={addr._id}>
                              <label
                                className={`flex cursor-pointer gap-4 rounded-lg border px-4 py-3 transition ${
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
                                  <p className="font-semibold text-text-primary">{addr.name}</p>
                                  {addr.landmark && (
                                    <p className="text-text-secondary">{addr.landmark}</p>
                                  )}
                                  <p className="text-text-secondary">
                                    {addr.city}, {addr.state} — {addr.pincode}
                                  </p>
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
                              name: user.name || "",
                              number: user.phone || "",
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
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-light py-4 text-sm font-medium text-text-secondary transition hover:border-primary hover:text-primary"
                        >
                          <span className="text-lg leading-none">+</span>
                          Add New Address
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right column — Order Summary */}
              <div className="rounded-xl border border-border-light bg-white p-6 shadow-sm lg:sticky lg:top-24">
                <h2 className="mb-5 text-base font-bold sm:text-lg">Order Summary</h2>

                <ul className="mb-5 max-h-[220px] space-y-4 overflow-y-auto hide-scrollbar">
                  {items.map((item) => (
                    <li key={item._id} className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border-light bg-mobile-surface">
                        {item.productImages?.[0] ? (
                          <img
                            src={item.productImages[0]}
                            alt={item.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <div className="h-full w-full bg-mobile-surface" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-snug">{item.name}</p>
                        <p className="mt-0.5 text-xs text-text-secondary">Qty: {item.quantity}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatPrice(item.discountedPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Price breakdown */}
                <div className="space-y-2.5 border-t border-border-light pt-4 text-sm">
                  <div className="flex justify-between text-text-secondary">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Delivery Charges</span>
                    <span>{deliveryCharges === 0 ? "Free" : formatPrice(deliveryCharges)}</span>
                  </div>
                  {freeDeliveryGap > 0 && (
                    <p className="text-xs text-text-secondary">
                      Add {formatPrice(freeDeliveryGap)} more for free delivery!
                    </p>
                  )}
                  <div className="flex justify-between border-t border-border-light pt-3 text-base font-bold">
                    <span>Total</span>
                    <span className="text-lg text-primary">{formatPrice(orderTotal)}</span>
                  </div>
                </div>

                {orderError && (
                  <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                    {orderError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={!selectedAddressId || placingOrder}
                  onClick={handlePlaceOrder}
                  className="mt-6 flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3.5 text-sm font-bold tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {placingOrder ? "Placing Order..." : "Place Order"}
                </button>

                <Link
                  to="/cart"
                  className="mt-4 flex items-center justify-center gap-1 text-sm text-text-secondary transition hover:text-primary"
                >
                  ← Back to Cart
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Checkout;
