import { useEffect, useState } from "react";
import { getBrands } from "../../api/api";
import SectionHeader from "./SectionHeader";

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

  if (loading || brands.length === 0) {
    return null;
  }

  return (
    <section className="bg-white px-4 py-4 sm:px-6 md:px-8">
      <SectionHeader title="Top Brands" viewAllTo="/product" />
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-6">
        {brands.map((brand) => (
          <div
            key={brand._id}
            className="flex h-[72px] w-[100px] shrink-0 items-center justify-center rounded-xl border border-border-light bg-white px-3 shadow-sm transition hover:border-primary/30 hover:shadow-md sm:h-20 sm:w-[110px] md:h-24 md:w-auto"
          >
            <img
              src={brand.brandImage}
              alt={brand.brandName}
              className="max-h-10 max-w-full object-contain sm:max-h-12"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default TopBrands;
