import { Link } from "react-router-dom";
import { LOGO_URL } from "./Header";

const essentialLinks = [
  { to: "/", label: "Home" },
  { to: "/product", label: "Products" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
];

const legalLinks = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms-and-conditions", label: "Terms & Conditions" },
  { to: "/shipping-details", label: "Shipping Details" },
];

function Footer() {
  return (
    <footer className="bg-black text-neutral-400 border-t border-neutral-800">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-10 lg:py-12">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-2">
            <img
              src={LOGO_URL}
              alt="BulkMobileMart"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <p className="mt-4 text-sm leading-relaxed">
            Your trusted partner for wholesale smartphones, tablets, and accessories.
            Serving retailers and distributors across India.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
            Essential Links
          </h4>
          <ul className="space-y-2.5 text-sm">
            {essentialLinks.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="transition hover:text-primary">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
            Legal
          </h4>
          <ul className="space-y-2.5 text-sm">
            {legalLinks.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="transition hover:text-primary">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
            Contact
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li>Mumbai · Delhi · Bangalore</li>
            <li>
              <a href="mailto:sales@bulkmobilemart.com" className="transition hover:text-primary">
                sales@bulkmobilemart.com
              </a>
            </li>
            <li>
              <a href="tel:+919876543210" className="transition hover:text-primary">
                +91 98765 43210
              </a>
            </li>
            <li className="text-neutral-500">Mon – Sat: 10:00 AM – 7:00 PM</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-500 sm:text-sm">
        © {new Date().getFullYear()} BulkMobileMart. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
