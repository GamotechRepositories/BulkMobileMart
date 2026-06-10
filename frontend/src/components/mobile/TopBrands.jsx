import SectionHeader from "./SectionHeader";

const BRANDS = [
  { name: "boAt", style: "font-black italic tracking-tight text-lg md:text-xl" },
  { name: "UBON", style: "font-bold tracking-[0.2em] text-sm md:text-base" },
  { name: "PORTRONICS", style: "font-bold text-[10px] tracking-wide md:text-xs" },
  { name: "realme", style: "font-semibold text-base lowercase md:text-lg" },
  { name: "Noise", style: "font-bold text-sm tracking-wide md:text-base" },
  { name: "pTron", style: "font-bold text-sm tracking-wide md:text-base" },
];

function TopBrands() {
  return (
    <section className="bg-white px-4 py-4 sm:px-6 md:px-8">
      <SectionHeader title="Top Brands" viewAllTo="/product" />
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-6">
        {BRANDS.map((brand) => (
          <div
            key={brand.name}
            className="flex h-[72px] w-[100px] shrink-0 items-center justify-center rounded-xl border border-border-light bg-white px-3 shadow-sm transition hover:border-primary/30 hover:shadow-md sm:h-20 sm:w-[110px] md:h-24 md:w-auto"
          >
            <span className={`text-text-primary ${brand.style}`}>{brand.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TopBrands;
