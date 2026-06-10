import { useCallback, useEffect, useState } from "react";
import { getHeroBanners } from "../../api/api";

const AUTO_PLAY_MS = 5000;
const DESKTOP_BREAKPOINT = 1024;

const DEFAULT_PRODUCT_IMAGE = "/hero-banner.webp";

const FALLBACK_SLIDES = [
  {
    id: "fallback-1",
    src: DEFAULT_PRODUCT_IMAGE,
    alt: "Mobile accessories wholesale - chargers, earphones, watches and more",
  },
];

function HeroBanner() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches
      ? "desktop"
      : "mobile"
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const handleChange = (event) => {
      setDevice(event.matches ? "desktop" : "mobile");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const fetchBanners = async () => {
      setLoading(true);

      try {
        const { data } = await getHeroBanners(device);
        let banners = (data.data || []).map((b) => ({
          id: b._id,
          src: b.imageUrl,
          alt: b.alt || "Mobile accessories",
        }));

        if (banners.length === 0 && device === "mobile") {
          const fallback = await getHeroBanners("desktop");
          banners = (fallback.data.data || []).map((b) => ({
            id: b._id,
            src: b.imageUrl,
            alt: b.alt || "Mobile accessories",
          }));
        }

        setSlides(banners.length > 0 ? banners : FALLBACK_SLIDES);
        setCurrent(0);
      } catch {
        setSlides(FALLBACK_SLIDES);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, [device]);

  const goTo = useCallback(
    (index) => {
      if (slides.length === 0) return;
      setCurrent((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  const bannerShellClass =
    "relative w-full overflow-hidden bg-[#1a1a1a]";

  if (loading) {
    return (
      <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
        <div className={`${bannerShellClass} min-h-[140px] animate-pulse sm:min-h-[180px]`} />
      </section>
    );
  }

  return (
    <section
      className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2"
      aria-label="Promotional banners"
    >
      <div className={bannerShellClass}>
        {slides.map((slide, index) => (
          <img
            key={slide.id}
            src={slide.src}
            alt={slide.alt}
            className={`block w-full h-auto max-w-full transition-opacity duration-700 ease-in-out ${
              index === current
                ? "relative z-10 opacity-100"
                : "pointer-events-none absolute left-0 top-0 opacity-0"
            }`}
            loading={index === 0 ? "eager" : "lazy"}
            draggable={false}
          />
        ))}

        {slides.length > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === current ? "true" : undefined}
                  onClick={() => goTo(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === current
                      ? "w-6 bg-primary"
                      : "w-2 bg-white/60 hover:bg-white/90"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(current - 1)}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-lg text-white transition hover:bg-black/55 sm:left-3"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-lg text-white transition hover:bg-black/55 sm:right-3"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export default HeroBanner;
