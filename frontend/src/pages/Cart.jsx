import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function QuantityControl({ quantity, onDecrease, onIncrease, disabled }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-border-light">
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        aria-label="Decrease quantity"
        className="flex h-9 w-9 items-center justify-center text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span className="flex h-9 min-w-[2.5rem] items-center justify-center border-x border-border-light px-2 text-sm font-semibold text-text-primary">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex h-9 w-9 items-center justify-center text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function OrderSummary({ items, total, cartCount }) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
      <h2 className="mb-4 border-b border-border-light pb-3 text-lg font-bold text-text-primary">
        Order Summary
      </h2>

      <ul className="mb-4 max-h-[240px] space-y-3 overflow-y-auto hide-scrollbar">
        {items.map((item) => (
          <li
            key={item._id}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 leading-snug text-text-primary">{item.name}</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {formatPrice(item.discountedPrice)} × {item.quantity}
              </p>
            </div>
            <span className="shrink-0 font-medium text-text-primary">
              {formatPrice(item.discountedPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-border-light pt-4 text-sm">
        <div className="flex items-center justify-between text-text-secondary">
          <span>Items ({cartCount})</span>
          <span>{items.length} products</span>
        </div>
        <div className="flex items-center justify-between text-text-secondary">
          <span>Subtotal</span>
          <span>{formatPrice(total)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 text-base font-bold text-text-primary">
          <span>Order Total</span>
          <span className="text-xl text-primary">{formatPrice(total)}</span>
        </div>
      </div>

      <p className="mb-5 mt-3 text-xs text-text-secondary">
        GST invoice available · Bulk orders welcome
      </p>

      <Link
        to="/checkout"
        className="flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:brightness-110"
      >
        Buy Now
      </Link>

      <Link
        to="/product"
        className="mt-3 flex w-full items-center justify-center text-sm text-text-secondary transition hover:text-primary"
      >
        Continue shopping
      </Link>
    </div>
  );
}

function Cart() {
  const { user, openAuthModal } = useAuth();
  const { items, cartCount, removeFromCart, updateQuantity, loading, loadCart } =
    useCart();

  useEffect(() => {
    if (user) loadCart();
  }, [user, loadCart]);

  const total = items.reduce(
    (sum, item) => sum + item.discountedPrice * item.quantity,
    0
  );

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
    <div className="min-h-screen bg-mobile-bg text-text-primary">
      <section className="px-4 pb-24 pt-6 sm:px-6 sm:pb-14 lg:px-8 lg:pb-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-bold sm:text-3xl">My Cart</h1>
            <p className="mt-1 text-sm text-text-secondary">{user.email}</p>
          </div>

          {loading ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
              <div className="animate-pulse space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-xl border border-border-light bg-mobile-surface"
                  />
                ))}
              </div>
              <div className="h-80 animate-pulse rounded-xl border border-border-light bg-mobile-surface" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border-light py-16 text-center">
              <p className="mb-6 text-text-secondary">Your cart is empty.</p>
              <Link
                to="/product"
                className="inline-block rounded-lg bg-primary px-8 py-3 text-sm font-bold tracking-wide text-white transition hover:brightness-110"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
              <ul className="divide-y divide-border-light overflow-hidden rounded-xl border border-border-light bg-white">
                {items.map((item) => (
                  <li
                    key={item._id}
                    className="flex flex-col gap-4 bg-white p-4 sm:flex-row sm:items-center sm:p-5"
                  >
                    <Link
                      to={`/product/${item._id}`}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border-light bg-mobile-surface sm:h-24 sm:w-24"
                    >
                      {item.productImages?.[0] ? (
                        <img
                          src={item.productImages[0]}
                          alt={item.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <div className="h-full w-full bg-mobile-surface" />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-xs uppercase tracking-wide text-primary">
                        {item.brandName}
                      </p>
                      <Link
                        to={`/product/${item._id}`}
                        className="line-clamp-2 font-semibold text-text-primary transition hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-sm text-text-secondary">
                        {formatPrice(item.discountedPrice)} each
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <QuantityControl
                          quantity={item.quantity}
                          disabled={loading}
                          onDecrease={() => {
                            if (item.quantity <= 1) {
                              removeFromCart(item._id);
                            } else {
                              updateQuantity(item._id, item.quantity - 1);
                            }
                          }}
                          onIncrease={() =>
                            updateQuantity(item._id, item.quantity + 1)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeFromCart(item._id)}
                          className="text-xs text-text-secondary transition hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="shrink-0 sm:text-right lg:hidden">
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(item.discountedPrice * item.quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <OrderSummary items={items} total={total} cartCount={cartCount} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Cart;
