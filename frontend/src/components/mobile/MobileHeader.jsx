import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../../api/api";
import { LOGO_URL } from "../layout/Header";
import MobileMenuDrawer from "./MobileMenuDrawer";
import MobileSearchBar from "./MobileSearchBar";

function MobileHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data } = await getCategories();
        if (!active) return;
        setCategories(
          (data.data || []).filter(
            (cat) => cat.categoryName?.toLowerCase() !== "most purchase"
          )
        );
      } catch {
        if (active) setCategories([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const toggleSearch = () => {
    setMenuOpen(false);
    setSearchOpen((prev) => !prev);
  };

  const openMenu = () => {
    setSearchOpen(false);
    setMenuOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white px-4 pt-3 pb-3 sm:px-6 md:px-8 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="shrink-0">
            <img
              src={LOGO_URL}
              alt="BulkMobileMart"
              className="h-11 w-auto object-contain sm:h-12"
            />
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleSearch}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                searchOpen ? "bg-primary/10 text-primary" : "text-text-primary hover:text-primary"
              }`}
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={openMenu}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-primary transition hover:text-primary"
              aria-label="Open menu"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="19" r="1.75" />
              </svg>
            </button>
          </div>
        </div>

        {searchOpen ? (
          <div className="mt-3">
            <MobileSearchBar
              className="w-full"
              autoFocus
              onSubmit={() => setSearchOpen(false)}
            />
          </div>
        ) : null}
      </header>

      <MobileMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        categories={categories}
      />
    </>
  );
}

export default MobileHeader;
