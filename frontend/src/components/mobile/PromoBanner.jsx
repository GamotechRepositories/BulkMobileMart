const BANNER_IMAGE =
  "https://images.unsplash.com/photo-1598327275661-3b45e4e4cb76?auto=format&fit=crop&w=800&q=80";

function PromoBanner() {
  return (
    <section className="bg-white px-4 py-4 sm:px-6 md:px-8">
      <div className="relative flex min-h-[140px] items-center overflow-hidden rounded-2xl bg-[#1a1a1a] px-4 py-5 sm:min-h-[160px] sm:px-6 sm:py-6 md:min-h-[200px] md:rounded-3xl md:px-8 lg:min-h-[240px]">
        <div className="relative z-10 max-w-[58%] sm:max-w-[50%] md:max-w-[45%]">
          <p className="text-sm font-semibold leading-snug text-white sm:text-base md:text-xl lg:text-2xl">
            India&apos;s Trusted{" "}
            <span className="text-primary">Mobile Accessories</span>{" "}
            <span className="text-white">Wholesale App</span>
          </p>
          <button
            type="button"
            className="mt-3 rounded-full bg-primary px-4 py-1.5 text-[10px] font-bold tracking-wide text-white sm:mt-4 sm:px-5 sm:py-2 sm:text-xs md:text-sm"
          >
            WHOLESALE ONLY
          </button>
        </div>
        <img
          src={BANNER_IMAGE}
          alt="Mobile accessories"
          className="absolute right-0 top-1/2 h-[120px] w-[42%] -translate-y-1/2 object-cover object-center opacity-90 sm:h-[140px] md:h-[180px] md:w-[38%] lg:h-[220px]"
          loading="lazy"
        />
      </div>
    </section>
  );
}

export default PromoBanner;
