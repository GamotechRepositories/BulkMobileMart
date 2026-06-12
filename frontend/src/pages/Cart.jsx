import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const FREE_DELIVERY_THRESHOLD = 999;

const formatPrice = (amount, fractionDigits = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);

function QuantityControl({ quantity, onDecrease, onIncrease, disabled, compact = false }) {
  const btnClass = compact ? "h-7 w-7 text-sm" : "h-8 w-8";
  return (
    <div className="inline-flex items-center overflow-hidden rounded-md border border-border-light bg-white">
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        aria-label="Decrease quantity"
        className={`flex items-center justify-center text-text-secondary transition hover:bg-mobile-surface disabled:cursor-not-allowed disabled:opacity-40 ${btnClass}`}
      >
        −
      </button>
      <span
        className={`flex min-w-[1.75rem] items-center justify-center border-x border-border-light px-1.5 text-xs font-semibold text-text-primary ${compact ? "h-7" : "h-8 text-sm"}`}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        aria-label="Increase quantity"
        className={`flex items-center justify-center text-text-secondary transition hover:bg-mobile-surface disabled:cursor-not-allowed disabled:opacity-40 ${btnClass}`}
      >
        +
      </button>
    </div>
  );
}

function CartItemsTable({ items, loading, onRemove, onUpdateQuantity }) {
  return (
    <div className="flex flex-col rounded-xl border border-border-light bg-white shadow-sm">
      <div className="hidden grid-cols-[1fr_100px_120px_100px_auto] items-center gap-4 border-b border-border-light bg-mobile-surface/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary lg:grid">
        <span>Product</span>
        <span className="text-center">Price</span>
        <span className="text-center">Quantity</span>
        <span className="text-right">Subtotal</span>
        <span className="w-6" />
      </div>

      <ul className="divide-y divide-border-light">
        {items.map((item) => {
          const lineTotal = item.discountedPrice * item.quantity;

          return (
            <li
              key={item._id}
              className="flex items-center gap-2 px-3 py-2.5 lg:grid lg:grid-cols-[1fr_100px_120px_100px_auto] lg:items-center lg:gap-4 lg:px-5 lg:py-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
                <Link
                  to={`/product/${item._id}`}
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border-light bg-mobile-surface lg:h-[72px] lg:w-[72px] lg:rounded-lg"
                >
                  {item.productImages?.[0] ? (
                    <img
                      src={item.productImages[0]}
                      alt={item.name}
                      className="h-full w-full object-contain p-0.5 lg:p-1"
                    />
                  ) : (
                    <div className="h-full w-full bg-mobile-surface" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    to={`/product/${item._id}`}
                    className="line-clamp-1 text-xs font-bold text-text-primary transition hover:text-primary lg:line-clamp-2 lg:text-sm"
                  >
                    {item.name}
                  </Link>
                  <div className="mt-1 flex items-center justify-between gap-2 lg:hidden">
                    <QuantityControl
                      quantity={item.quantity}
                      disabled={loading}
                      compact
                      onDecrease={() => {
                        if (item.quantity <= 1) onRemove(item._id);
                        else onUpdateQuantity(item._id, item.quantity - 1);
                      }}
                      onIncrease={() => onUpdateQuantity(item._id, item.quantity + 1)}
                    />
                    <span className="shrink-0 text-xs font-bold text-text-primary">
                      {formatPrice(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="hidden text-sm font-semibold text-text-primary lg:block lg:text-center">
                {formatPrice(item.discountedPrice)}
              </p>

              <div className="hidden lg:flex lg:justify-center">
                <QuantityControl
                  quantity={item.quantity}
                  disabled={loading}
                  onDecrease={() => {
                    if (item.quantity <= 1) onRemove(item._id);
                    else onUpdateQuantity(item._id, item.quantity - 1);
                  }}
                  onIncrease={() => onUpdateQuantity(item._id, item.quantity + 1)}
                />
              </div>

              <p className="hidden text-sm font-bold text-text-primary lg:block lg:text-right">
                {formatPrice(lineTotal)}
              </p>

              <button
                type="button"
                onClick={() => onRemove(item._id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center text-lg leading-none text-text-muted transition hover:text-red-500 lg:h-7 lg:w-7 lg:rounded-full lg:hover:bg-red-50"
                aria-label="Remove item"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OrderSummary({ items }) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce(
    (sum, item) => sum + item.discountedPrice * item.quantity,
    0
  );

  const savings = items.reduce((sum, item) => {
    const original = item.price ?? item.discountedPrice;
    const diff = Math.max(0, original - item.discountedPrice);
    return sum + diff * item.quantity;
  }, 0);

  const shippingFree = subtotal >= FREE_DELIVERY_THRESHOLD;
  const hasItems = items.length > 0;

  return (
    <div className="shrink-0 rounded-xl border border-border-light bg-white p-3 shadow-sm lg:sticky lg:top-24 lg:p-6">
      <h2 className="mb-2 text-sm font-bold text-text-primary lg:mb-4 lg:text-lg">Order Summary</h2>

      <div className="space-y-1 text-xs lg:space-y-2.5 lg:text-sm">
        <div className="flex justify-between text-text-secondary">
          <span>Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})</span>
          <span className="font-medium text-text-primary">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-text-secondary">
          <span>Shipping</span>
          <span className={`font-semibold ${shippingFree ? "text-green-600" : "text-text-primary"}`}>
            {shippingFree ? "FREE" : formatPrice(49)}
          </span>
        </div>
        <p className="text-[10px] text-text-muted lg:text-xs">GST included in prices</p>
      </div>

      <hr className="my-2 border-border-light lg:my-4" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-text-primary lg:text-base">Order Total</span>
        <span className="text-lg font-bold text-primary lg:text-2xl">{formatPrice(subtotal)}</span>
      </div>

      <div className="mt-2 hidden items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 lg:mt-4 lg:flex lg:py-2.5 lg:text-sm">
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        You will save {formatPrice(savings)} on this order
      </div>

      <Link
        to="/checkout"
        className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-110 lg:mt-5 lg:gap-2 lg:py-3.5 lg:text-sm ${
          !hasItems ? "pointer-events-none opacity-50" : ""
        }`}
        aria-disabled={!hasItems}
      >
        Proceed to Checkout
        <svg className="h-3.5 w-3.5 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-3">
        <Link
          to="/product"
          className="flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-border-light px-1.5 py-2 text-[11px] font-semibold text-text-primary transition hover:border-primary hover:text-primary lg:gap-1.5 lg:px-2 lg:py-2.5 lg:text-sm"
        >
          <svg className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          Continue Shopping
        </Link>

        <Link
          to="/support"
          className="flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-primary px-1.5 py-2 text-[11px] font-semibold text-primary transition hover:bg-primary/5 lg:gap-1.5 lg:px-2 lg:py-2.5 lg:text-sm"
        >
          <svg className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          Support
        </Link>
      </div>
    </div>
  );
}

function Cart() {
  const { user, openAuthModal } = useAuth();
  const { items, removeFromCart, updateQuantity, loading, loadCart } = useCart();

  useEffect(() => {
    if (user) loadCart();
  }, [user, loadCart]);

  if (!user) {
    return (
      <div className="min-h-[60vh] bg-mobile-bg px-4 py-16 text-text-primary sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-3 text-2xl font-bold sm:text-3xl">My Cart</h1>
          <p className="mb-6 text-text-secondary">
            Please login to view your cart and bulk orders.
          </p>
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
    <div className="bg-mobile-bg text-text-primary lg:min-h-screen">
      <section className="px-3 pb-4 pt-3 sm:px-4 lg:px-8 lg:pb-8 lg:pt-6">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="mb-2 shrink-0 text-lg font-bold lg:mb-8 lg:text-3xl">My Cart</h1>

          {loading ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
              <div className="h-64 animate-pulse rounded-xl border border-border-light bg-white" />
              <div className="h-96 animate-pulse rounded-xl border border-border-light bg-white" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border-light bg-white py-16 text-center shadow-sm">
              <p className="mb-6 text-text-secondary">Your cart is empty.</p>
              <Link
                to="/product"
                className="inline-block rounded-lg bg-primary px-8 py-3 text-sm font-bold tracking-wide text-white transition hover:brightness-110"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-8">
              <CartItemsTable
                items={items}
                loading={loading}
                onRemove={removeFromCart}
                onUpdateQuantity={updateQuantity}
              />

              <OrderSummary items={items} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Cart;
