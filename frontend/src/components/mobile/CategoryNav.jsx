import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../../api/api";

const BATCH_SIZE = 12;

const DEFAULT_CATEGORIES = [
  { name: "Chargers", icon: "charger" },
  { name: "Earphones", icon: "earphone" },
  { name: "Cables", icon: "cable" },
  { name: "Neckbands", icon: "neckband" },
  { name: "Power Banks", icon: "powerbank" },
  { name: "Smart Watches", icon: "watch" },
  { name: "Bluetooth Speakers", icon: "speaker" },
  { name: "Mobile Covers", icon: "cover" },
  { name: "Tempered Glass", icon: "glass" },
  { name: "Adapters", icon: "adapter" },
];

const ICON_TYPES = [
  "charger",
  "earphone",
  "cable",
  "neckband",
  "powerbank",
  "watch",
  "speaker",
  "cover",
  "glass",
  "adapter",
];

function chunkCategories(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function CategoryIcon({ type, className = "h-10 w-10" }) {
  const icons = {
    charger: (
      <>
        <rect x="8" y="3" width="8" height="5" rx="1" />
        <rect x="10" y="8" width="4" height="3" />
        <rect x="9" y="11" width="6" height="8" rx="1" />
        <rect x="11" y="14" width="2" height="3" rx="0.5" />
      </>
    ),
    earphone: (
      <>
        <path d="M7 10a5 5 0 0110 0v4a2.5 2.5 0 01-2.5 2.5h-.5v3h-3v-3H9A2.5 2.5 0 016.5 14V10z" />
        <circle cx="9" cy="9" r="1.5" />
        <circle cx="15" cy="9" r="1.5" />
      </>
    ),
    cable: (
      <>
        <rect x="4" y="9" width="4" height="6" rx="1" />
        <rect x="16" y="9" width="4" height="6" rx="1" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="2" fill="none" />
      </>
    ),
    neckband: (
      <>
        <path d="M6 11a6 6 0 0112 0v3a2 2 0 01-2 2h-1.5v2h-3v-2H8a2 2 0 01-2-2v-3z" />
        <rect x="5" y="10" width="3" height="4" rx="1.5" />
        <rect x="16" y="10" width="3" height="4" rx="1.5" />
      </>
    ),
    powerbank: (
      <>
        <rect x="7" y="5" width="10" height="14" rx="2" />
        <rect x="17" y="9" width="2" height="6" rx="0.5" />
      </>
    ),
    watch: (
      <>
        <rect x="8" y="6" width="8" height="12" rx="2" />
        <rect x="10" y="4" width="4" height="2" rx="0.5" />
        <rect x="10" y="18" width="4" height="2" rx="0.5" />
        <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
    speaker: (
      <>
        <rect x="7" y="8" width="6" height="10" rx="3" />
        <rect x="13" y="10" width="4" height="6" rx="1" />
      </>
    ),
    cover: (
      <>
        <rect x="8" y="4" width="8" height="16" rx="2" />
        <circle cx="12" cy="17" r="1" />
      </>
    ),
    glass: (
      <>
        <rect x="8" y="4" width="8" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 7h6M9 10h6" stroke="currentColor" strokeWidth="1" fill="none" />
      </>
    ),
    adapter: (
      <>
        <rect x="5" y="9" width="14" height="8" rx="1.5" />
        <rect x="7" y="6" width="3" height="3" rx="0.5" />
        <rect x="11.5" y="6" width="3" height="3" rx="0.5" />
        <rect x="16" y="6" width="3" height="3" rx="0.5" />
      </>
    ),
    default: <circle cx="12" cy="12" r="7" />,
  };

  return (
    <svg
      className={`text-text-primary ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {icons[type] || icons.default}
    </svg>
  );
}

function isUsableCategoryImage(url) {
  if (!url?.trim()) return false;
  if (url.includes("res.cloudinary.com/demo")) return false;
  return true;
}

function CategoryImage({ src, name, icon, className = "h-10 w-10" }) {
  const [failed, setFailed] = useState(false);

  if (!isUsableCategoryImage(src) || failed) {
    return (
      <CategoryIcon
        type={icon}
        className={`${className} transition-transform duration-300 ease-out group-hover:scale-110`}
      />
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out group-hover:scale-110"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function CategoryCard({ category }) {
  return (
    <Link
      to={`/product?categoryName=${encodeURIComponent(category.name)}`}
      className="group flex min-h-[96px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors hover:border-primary sm:min-h-[120px] lg:min-h-[180px]"
    >
      <div className="flex flex-1 items-center justify-center overflow-hidden px-2 pt-2 pb-1 sm:px-3 sm:pt-3 lg:px-4 lg:pt-6">
        <div className="flex h-12 w-12 items-center justify-center sm:h-16 sm:w-16 lg:h-28 lg:w-28">
          <CategoryImage
            src={category.image}
            name={category.name}
            icon={category.icon}
            className="h-9 w-9 sm:h-12 sm:w-12 lg:h-20 lg:w-20"
          />
        </div>
      </div>
      <p className="px-2 pb-2 text-center text-[10px] font-bold leading-tight text-neutral-900 transition-colors duration-300 group-hover:text-primary sm:pb-3 sm:text-xs lg:px-4 lg:pb-4 lg:text-left lg:text-base">
        {category.name}
      </p>
    </Link>
  );
}

function CategoryGrid({ categories, compact = false, className = "" }) {
  const gridClass = compact
    ? "grid grid-cols-3 gap-2 sm:gap-3"
    : "grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6 lg:gap-4";

  return (
    <div className={`${gridClass} ${className}`}>
      {categories.map((category) => (
        <CategoryCard key={category.name} category={category} />
      ))}
    </div>
  );
}

function CategoryBatchCarousel({ batches }) {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth scroll-px-4 sm:scroll-px-6 lg:scroll-px-8">
        {batches.map((batch, batchIndex) => (
          <div
            key={`category-batch-${batchIndex}`}
            className="w-full shrink-0 snap-start px-4 sm:px-6 lg:px-8"
          >
            <CategoryGrid categories={batch} compact />
          </div>
        ))}
      </div>

      {batches.length > 1 ? (
        <p className="mt-3 text-center text-xs text-text-muted">
          Swipe for more categories · {batches.length} pages
        </p>
      ) : null}
    </div>
  );
}

function CategoryNav() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await getCategories();
        const apiCategories = (data.data || []).filter(
          (cat) => cat.categoryName?.toLowerCase() !== "most purchase"
        );

        if (apiCategories.length > 0) {
          setCategories(
            apiCategories.map((cat, index) => ({
              name: cat.categoryName,
              image: isUsableCategoryImage(cat.categoryImage)
                ? cat.categoryImage
                : undefined,
              icon: ICON_TYPES[index % ICON_TYPES.length],
            }))
          );
        }
      } catch {
        /* keep defaults */
      }
    };

    fetchCategories();
  }, []);

  const batches = useMemo(
    () => chunkCategories(categories, BATCH_SIZE),
    [categories]
  );

  const hasMultipleBatches = batches.length > 1;

  return (
    <section className="bg-mobile-bg px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5 lg:mb-6">
          <h2 className="text-lg font-bold text-text-primary sm:text-xl lg:text-2xl">
            Explore Our Categories
          </h2>
          <Link
            to="/product"
            className="hidden shrink-0 text-sm font-semibold text-primary transition hover:underline lg:inline-flex"
          >
            View All
          </Link>
          {hasMultipleBatches ? (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="shrink-0 text-sm font-semibold text-primary transition hover:underline lg:hidden"
            >
              {showAll ? "Show Less" : "View All"}
            </button>
          ) : (
            <Link
              to="/product"
              className="shrink-0 text-sm font-semibold text-primary transition hover:underline lg:hidden"
            >
              View All
            </Link>
          )}
        </div>

        <div className="hidden lg:block">
          <CategoryGrid categories={categories} />
        </div>

        <div className="lg:hidden">
          {showAll ? (
            <CategoryGrid categories={categories} />
          ) : (
            <CategoryBatchCarousel batches={batches} />
          )}
        </div>
      </div>
    </section>
  );
}

export default CategoryNav;
