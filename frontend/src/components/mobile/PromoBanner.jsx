const BANNER_IMAGE =
  "https://res.cloudinary.com/dsafvwkrf/image/upload/v1781174304/d5d13f8c-05f4-4332-915a-c6f3a059e30a.png";

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
        <div className="absolute right-3 top-1/2 h-[108px] w-[38%] -translate-y-1/2 overflow-hidden rounded-lg sm:right-4 sm:h-[128px] md:right-5 md:h-[165px] md:w-[35%] lg:h-[200px]">
          <img
            src={BANNER_IMAGE}
            alt="Mobile accessories"
            className="h-full w-full object-contain object-right opacity-90"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

export default PromoBanner;
