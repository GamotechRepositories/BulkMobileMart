import { useCallback, useEffect, useRef, useState } from "react";

const TESTIMONIALS = [
  {
    text: "BulkMobileMart is our trusted partner for all bulk mobile requirements. Genuine products, best prices and on-time delivery every time!",
    name: "Rajesh Kumar",
    role: "Mobile Retailer, Delhi",
    avatar: "https://i.pravatar.cc/100?img=12",
  },
  {
    text: "We order 100+ units every month. Their GST invoicing and pan-India delivery make bulk buying hassle-free for our stores.",
    name: "Priya Sharma",
    role: "Distributor, Mumbai",
    avatar: "https://i.pravatar.cc/100?img=45",
  },
  {
    text: "Best wholesale rates on Samsung and Apple. The sales team responds quickly and orders always arrive sealed and verified.",
    name: "Amit Patel",
    role: "Electronics Store Owner, Ahmedabad",
    avatar: "https://i.pravatar.cc/100?img=33",
  },
];

const STATS = [
  {
    value: "5000+",
    label: "Happy Clients",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    value: "100K+",
    label: "Units Sold",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    value: "500+",
    label: "Cities Served",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    value: "99%",
    label: "On-Time Delivery",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
  },
];

const AUTO_PLAY_MS = 5000;

function NavArrowButton({ direction, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-white hover:border-accent hover:text-accent transition text-sm"
    >
      {direction === "left" ? "‹" : "›"}
    </button>
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5 mb-2">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [next]);

  const item = TESTIMONIALS[current];

  return (
    <div>
      <h2 className="text-accent font-bold text-sm md:text-base tracking-wide mb-3">
        WHAT OUR CLIENTS SAY
      </h2>

      <div className="flex items-center gap-2 w-full lg:max-w-sm xl:max-w-md">
        <NavArrowButton direction="left" onClick={prev} label="Previous testimonial" />

        <div className="relative flex-1 min-w-0 rounded-xl bg-neutral-900 border border-neutral-600 px-3 py-3 sm:px-4 sm:py-4 flex flex-col justify-between overflow-hidden min-h-[160px]">
          <span className="absolute top-2 left-3 text-accent/40 text-3xl font-serif leading-none select-none">
            &ldquo;
          </span>
          <span className="absolute bottom-1 right-3 text-accent/40 text-3xl font-serif leading-none select-none">
            &rdquo;
          </span>

          <div className="relative z-10">
            <Stars />
            <p className="text-white text-xs sm:text-sm leading-snug mb-3 transition-opacity duration-500">
              {item.text}
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <img
              src={item.avatar}
              alt={item.name}
              className="w-8 h-8 rounded-full object-cover border border-neutral-700"
            />
            <div>
              <p className="text-white font-bold text-xs">{item.name}</p>
              <p className="text-neutral-400 text-[10px] leading-tight">{item.role}</p>
            </div>
          </div>
        </div>

        <NavArrowButton direction="right" onClick={next} label="Next testimonial" />
      </div>
    </div>
  );
}

function ImpactStats() {
  const scrollRef = useRef(null);

  const scrollStats = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -160 : 160;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-accent font-bold text-sm md:text-base tracking-wide">
          OUR IMPACT IN NUMBERS
        </h2>
        <div className="flex gap-2 lg:hidden">
          <NavArrowButton
            direction="left"
            onClick={() => scrollStats("left")}
            label="Scroll stats left"
          />
          <NavArrowButton
            direction="right"
            onClick={() => scrollStats("right")}
            label="Scroll stats right"
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory scroll-px-5 lg:overflow-visible lg:snap-none"
      >
        <div className="flex gap-3 pb-2 w-max lg:w-full lg:grid lg:grid-cols-4 lg:gap-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="shrink-0 w-[140px] sm:w-[150px] snap-start flex flex-col items-center justify-center text-center px-2 py-3 md:py-3.5 rounded-lg border border-neutral-600 bg-neutral-900 lg:w-auto"
            >
              <div className="text-accent mb-1.5">{stat.icon}</div>
              <p className="text-white text-lg md:text-xl font-bold leading-none mb-1">
                {stat.value}
              </p>
              <p className="text-neutral-400 text-[10px] md:text-xs leading-tight">{stat.label}</p>
            </div>
          ))}
          <div className="shrink-0 w-2 lg:hidden" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function TestimonialsImpact() {
  return (
    <section className="bg-black px-5 sm:px-6 md:px-8 lg:px-12 py-6 md:py-8">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-6 lg:gap-8 items-start lg:items-center">
        <TestimonialCarousel />
        <ImpactStats />
      </div>
    </section>
  );
}

export default TestimonialsImpact;
