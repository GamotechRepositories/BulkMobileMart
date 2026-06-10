import { useState } from "react";

function Contact() {
  const [form, setForm] = useState({
    name: "",
    business: "",
    phone: "",
    email: "",
    message: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      "Thank you! Our sales team will contact you shortly with a bulk quote."
    );
    setForm({ name: "", business: "", phone: "", email: "", message: "" });
  };

  const inputClass =
    "w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3 text-white placeholder-neutral-500 focus:border-accent focus:outline-none";

  return (
    <div className="bg-black text-white">
      <section className="page-hero-section px-3 sm:px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16">
          <div>
            <h1 className="page-title">Contact Us</h1>
            <p className="text-neutral-400 mb-8 leading-relaxed">
              Tell us the brands, models, and quantity you need. We respond to
              bulk enquiries within one business day.
            </p>

            <div className="space-y-6 text-neutral-300">
              <div>
                <h3 className="text-white font-semibold mb-1">Phone / WhatsApp</h3>
                <a
                  href="tel:+919876543210"
                  className="text-accent hover:underline"
                >
                  +91 98765 43210
                </a>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Email</h3>
                <a
                  href="mailto:sales@bulkmobilemart.com"
                  className="text-accent hover:underline"
                >
                  sales@bulkmobilemart.com
                </a>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Office Hours</h3>
                <p>Mon – Sat · 10:00 AM – 7:00 PM IST</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Locations</h3>
                <p>Mumbai · Delhi NCR · Bangalore</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-8 space-y-4 sm:space-y-5"
          >
            <h2 className="text-xl font-bold mb-2">Request Bulk Quote</h2>
            <input
              type="text"
              name="name"
              placeholder="Your name *"
              required
              value={form.name}
              onChange={handleChange}
              className={inputClass}
            />
            <input
              type="text"
              name="business"
              placeholder="Business / shop name"
              value={form.business}
              onChange={handleChange}
              className={inputClass}
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone / WhatsApp *"
              required
              value={form.phone}
              onChange={handleChange}
              className={inputClass}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className={inputClass}
            />
            <textarea
              name="message"
              rows={4}
              placeholder="Brands, models, quantity (e.g. 50x Redmi Note, 20x Samsung A15) *"
              required
              value={form.message}
              onChange={handleChange}
              className={`${inputClass} resize-none`}
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-accent text-white py-3 font-semibold hover:brightness-110 transition"
            >
              Send Enquiry
            </button>
          </form>
        </div>
      </section>

      <section className="py-8 sm:py-12 px-3 sm:px-4 text-center border-t border-neutral-800">
        <p className="text-neutral-400 max-w-xl mx-auto">
          Prefer WhatsApp? Message us at{" "}
          <a href="tel:+919876543210" className="text-accent hover:underline">
            +91 98765 43210
          </a>{" "}
          for fastest bulk pricing.
        </p>
      </section>
    </div>
  );
}

export default Contact;
