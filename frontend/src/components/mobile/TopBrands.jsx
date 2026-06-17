import { useEffect, useMemo, useState } from "react";
import { getBrands } from "../../api/api";
import SectionHeader from "./SectionHeader";

function BrandCard({ brand }) {
  return (
    <div className="flex h-[72px] w-[100px] shrink-0 items-center justify-center rounded-xl border border-border-light bg-white px-3 shadow-sm transition hover:border-primary/30 hover:shadow-md sm:h-20 sm:w-[110px] md:h-24 md:w-[120px]">
      <img
        src={brand.brandImage}
        alt={brand.brandName}
        className="max-h-10 max-w-full object-contain sm:max-h-12"
        loading="lazy"
      />
    </div>
  );
}

function TopBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const { data } = await getBrands();
        setBrands(data.data || []);
      } catch {
        setBrands([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const marqueeBrands = useMemo(
    () => (brands.length > 0 ? [...brands, ...brands] : []),
    [brands],
  );

  const marqueeDuration = `${Math.max(20, brands.length * 4)}s`;

  if (loading || brands.length === 0) {
    return null;
  }

  return (
    <section className="bg-white px-4 py-4 sm:px-6 md:px-8">
      <SectionHeader title="Top Brands" viewAllTo="/product" />
      <div className="brand-marquee-viewport">
        <div
          className="brand-marquee-track gap-3 sm:gap-4"
          style={{ "--brand-marquee-duration": marqueeDuration }}
        >
          {marqueeBrands.map((brand, index) => (
            <BrandCard key={`${brand._id}-${index}`} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default TopBrands;
