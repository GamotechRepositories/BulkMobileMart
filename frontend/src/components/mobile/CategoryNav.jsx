import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../../api/api";
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

function CategoryIcon({ type, className = "h-8 w-8" }) {
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

function CategoryImage({ src, name, icon, className = "h-8 w-8" }) {
  const [failed, setFailed] = useState(false);

  if (!isUsableCategoryImage(src) || failed) {
    return <CategoryIcon type={icon} className={className} />;
  }

  return (
    <img
      src={src}
      alt={name}
      className="h-full w-full object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function CategoryNav() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

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

  return (
    <section className="bg-mobile-bg px-4 py-4 sm:px-6 sm:py-5 md:px-8 lg:py-6">
      {/* Mobile & tablet: horizontal scroll */}
      <div className="-mx-1 flex gap-4 overflow-x-auto hide-scrollbar scroll-smooth px-1 pb-1 lg:hidden">
        {categories.map((category) => (
          <Link
            key={category.name}
            to={`/product?categoryName=${encodeURIComponent(category.name)}`}
            className="flex w-[72px] shrink-0 flex-col items-center gap-2.5 sm:w-[80px]"
          >
            <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full border border-border-light bg-white p-2 shadow-sm sm:h-[68px] sm:w-[68px]">
              <CategoryImage
                src={category.image}
                name={category.name}
                icon={category.icon}
              />
            </div>
            <span className="w-full text-center text-[11px] font-medium leading-tight text-text-primary sm:text-xs">
              {category.name}
            </span>
          </Link>
        ))}
        <div className="w-1 shrink-0" aria-hidden="true" />
      </div>

      {/* Desktop: neat grid layout */}
      <div className="hidden lg:grid lg:grid-cols-5 lg:gap-x-6 lg:gap-y-8 xl:grid-cols-10 xl:gap-x-4 xl:gap-y-0">
        {categories.map((category) => (
          <Link
            key={category.name}
            to={`/product?categoryName=${encodeURIComponent(category.name)}`}
            className="group flex flex-col items-center gap-3 text-center"
          >
            <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border border-border-light bg-white p-2.5 shadow-sm transition group-hover:border-primary/40 group-hover:shadow-md xl:h-[84px] xl:w-[84px]">
              <CategoryImage
                src={category.image}
                name={category.name}
                icon={category.icon}
                className="h-9 w-9 xl:h-10 xl:w-10"
              />
            </div>
            <span className="min-h-[2.5rem] max-w-[100px] text-sm font-medium leading-snug text-text-primary xl:max-w-[110px] xl:text-[15px]">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default CategoryNav;
