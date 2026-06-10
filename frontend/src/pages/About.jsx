function About() {
  return (
    <div className="bg-black text-white">
      <section className="page-hero-section px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="page-title">About BulkMobileMart</h1>
          <p className="text-neutral-400 text-lg max-w-3xl leading-relaxed">
            BulkMobileMart was built for businesses that sell mobiles — not
            end-customers shopping one phone at a time. We connect retailers,
            online marketplace sellers, and regional distributors with genuine
            wholesale stock at prices that protect your margins.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-16 px-3 sm:px-4 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <h2 className="text-xl font-bold mb-3">Our Mission</h2>
            <p className="text-neutral-400 leading-relaxed">
              Make bulk smartphone sourcing simple, transparent, and reliable for
              every serious seller in India — with honest pricing, proper
              documentation, and support you can reach on a phone call.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
            <h2 className="text-xl font-bold mb-3">Who We Serve</h2>
            <ul className="text-neutral-400 space-y-2">
              <li>· Mobile retail shops & multi-brand stores</li>
              <li>· Amazon / Flipkart / Meesho resellers</li>
              <li>· Corporate gifting & bulk procurement</li>
              <li>· Regional distributors & sub-dealers</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-12 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">What We Offer</h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-neutral-300">
            {[
              "Latest smartphones — all major brands",
              "Mix-and-match bulk orders",
              "GST-compliant invoices",
              "IMEI-verified genuine units",
              "Warehouse pickup & courier delivery",
              "Repeat-order loyalty pricing",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <span className="text-accent">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

export default About;
