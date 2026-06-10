import { Link } from "react-router-dom";
import { LOGO_URL } from "../layout/Header";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import DesktopSearchBar from "./DesktopSearchBar";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

function NavDivider() {
  return <div className="mx-1 h-10 w-px bg-border-light" aria-hidden="true" />;
}

function NavAction({ icon, title, subtitle, onClick, to, badge }) {
  const content = (
    <>
      <span className="relative shrink-0 text-text-primary">
        {icon}
        {badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="text-left">
        <span className="block text-sm font-bold leading-tight text-text-primary">
          {title}
        </span>
        <span className="block text-xs leading-tight text-text-secondary">{subtitle}</span>
      </span>
    </>
  );

  const className =
    "relative flex items-center gap-2.5 px-3 py-1 transition hover:opacity-80 xl:px-4";

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function TopNav() {
  const { user, openAuthModal } = useAuth();
  const { items, cartCount } = useCart();

  const cartTotal = items.reduce(
    (sum, item) => sum + item.discountedPrice * item.quantity,
    0
  );

  const handleCartClick = (e) => {
    if (!user) {
      e.preventDefault();
      openAuthModal("login");
    }
  };

  const handleLoginClick = () => {
    if (!user) openAuthModal("login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 hidden border-b border-border-light bg-white shadow-sm lg:block">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-5 py-3 xl:gap-6 xl:px-8">
        {/* Left: menu + logo */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            to="/product"
            className="flex h-10 w-10 items-center justify-center text-text-primary transition hover:text-primary"
            aria-label="Open categories menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Link>

          <Link to="/" className="flex items-center gap-2">
            <img
              src={LOGO_URL}
              alt="BulkMobileMart"
              className="h-11 w-auto object-contain xl:h-12"
            />
          </Link>
        </div>

        {/* Center: search */}
        <DesktopSearchBar className="mx-2 min-w-0 flex-1 xl:mx-4" />

        {/* Right: actions */}
        <div className="flex shrink-0 items-center">
          <NavAction
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m0 0l-2-2m2 2l2-2" />
              </svg>
            }
            title="Download App"
            subtitle="Get Exclusive Deals"
            onClick={() => {}}
          />

          <NavDivider />

          {user ? (
            <NavAction
              to="/profile"
              icon={
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              }
              title={user.name.split(" ")[0]}
              subtitle="My Account"
            />
          ) : (
            <NavAction
              icon={
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              }
              title="Login / Register"
              subtitle="For Dealers"
              onClick={handleLoginClick}
            />
          )}

          <NavDivider />

          <NavAction
            to="/cart"
            onClick={handleCartClick}
            badge={cartCount}
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
            }
            title="Cart"
            subtitle={formatPrice(cartTotal)}
          />
        </div>
      </div>
    </header>
  );
}

export default TopNav;
