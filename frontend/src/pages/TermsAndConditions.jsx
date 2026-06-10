function TermsAndConditions() {
  return (
    <div className="bg-black text-white">
      <section className="page-hero-section px-3 sm:px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="page-title">Terms & Conditions</h1>
          <p className="text-neutral-400">Last updated: June 5, 2026</p>
        </div>
      </section>

      <section className="py-10 sm:py-12 px-3 sm:px-4 pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto space-y-8 text-neutral-300 leading-relaxed">
          <div>
            <h2 className="text-xl font-bold text-white mb-3">General</h2>
            <p>
              By using BulkMobileMart, you agree to these terms. Our platform is
              intended for businesses, retailers, and distributors purchasing mobile
              devices in bulk — not for individual retail consumers.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Orders & Minimum Quantity</h2>
            <p>
              Minimum order quantity is 10 units unless otherwise stated. All orders
              are subject to stock availability and confirmation by our sales team.
              Prices quoted are valid for the period specified in your bulk quote.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Payment & Invoicing</h2>
            <p>
              Payment terms will be communicated at the time of order confirmation.
              GST-compliant invoices are provided for all eligible business purchases.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Delivery</h2>
            <p>
              We ship pan-India through trusted courier partners. Delivery timelines
              vary by location and order size. Risk of loss passes to the buyer upon
              delivery to the specified address.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Warranty & Returns</h2>
            <p>
              Products are covered by manufacturer warranty where applicable. Return
              and replacement policies for defective or damaged goods must be reported
              within the timeframe specified at the time of purchase.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-3">Contact</h2>
            <p>
              Questions about these terms? Reach us at{" "}
              <a href="mailto:sales@bulkmobilemart.com" className="text-accent hover:underline">
                sales@bulkmobilemart.com
              </a>{" "}
              or call +91 98765 43210.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TermsAndConditions;
