import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const WHATSAPP_CONTACT = {
  name: "Ashok Modi",
  phone: "917400222233",
};
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_CONTACT.phone}?text=${encodeURIComponent(
  "Hi Ashok, I need help with my cart on Bulk Mobile Mart."
)}`;
const FREE_DELIVERY_THRESHOLD = 999;

const formatPrice = (amount, fractionDigits = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);

function WhatsAppIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
  const gstIncluded = subtotal > 0 ? subtotal * (18 / 118) : 0;
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
        <div className="hidden justify-between text-text-secondary lg:flex">
          <span>GST (Included)</span>
          <span className="font-medium text-text-primary">{formatPrice(gstIncluded, 2)}</span>
        </div>
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

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-[#25D366] px-1.5 py-2 text-[11px] font-semibold text-[#128C7E] transition hover:bg-[#25D366]/10 lg:gap-1.5 lg:px-2 lg:py-2.5 lg:text-sm"
        >
          <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" />
          WhatsApp
        </a>
      </div>

      <p className="mt-2 hidden items-center justify-center gap-1.5 text-center text-xs text-text-muted lg:mt-4 lg:flex">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0V10.5M4.5 10.5h15v8.25a1.5 1.5 0 01-1.5 1.5h-12a1.5 1.5 0 01-1.5-1.5V10.5z" />
        </svg>
        Secure Payments · Easy Returns
      </p>
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
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2 lg:mb-8 lg:flex-wrap lg:justify-start lg:gap-3">
            <h1 className="text-lg font-bold lg:text-3xl">My Cart</h1>
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-text-secondary lg:gap-2 lg:text-sm">
              <span className="truncate">{user.email}</span>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary lg:px-2.5 lg:text-xs">
                Retail Customer
              </span>
            </div>
          </div>

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
