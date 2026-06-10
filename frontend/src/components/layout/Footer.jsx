import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="bg-black border-t border-neutral-800 text-neutral-400">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10">
        <div>
          <h3 className="text-white font-bold text-lg mb-3">BulkMobileMart</h3>
          <p className="text-sm leading-relaxed">
            Your trusted partner for wholesale smartphones, tablets, and
            accessories. Serving retailers, distributors, and resellers across
            India.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/" className="hover:text-accent transition">
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-accent transition">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/product" className="hover:text-accent transition">
                Products
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-accent transition">
                Blog
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-accent transition">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/privacy-policy" className="hover:text-accent transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms-and-conditions" className="hover:text-accent transition">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>Mumbai · Delhi · Bangalore</li>
            <li>
              <a
                href="mailto:sales@bulkmobilemart.com"
                className="hover:text-accent transition"
              >
                sales@bulkmobilemart.com
              </a>
            </li>
            <li>
              <a
                href="tel:+919876543210"
                className="hover:text-accent transition"
              >
                +91 98765 43210
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-800 py-4 text-center text-sm">
        © {new Date().getFullYear()} BulkMobileMart. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
