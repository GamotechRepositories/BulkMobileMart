import { useEffect, useState } from "react";
import { getCategories } from "../../api/api";

function DesktopSearchBar({ className = "" }) {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await getCategories();
        setCategories(
          (data.data || []).filter(
            (cat) => cat.categoryName?.toLowerCase() !== "most purchase"
          )
        );
      } catch {
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  return (
    <form
      className={`flex h-11 items-stretch overflow-hidden rounded-md border border-border-light bg-[#f3f3f3] ${className}`}
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="relative flex shrink-0 items-center border-r border-border-light bg-[#ebebeb]">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-full cursor-pointer appearance-none bg-transparent py-0 pl-4 pr-8 text-sm font-medium text-text-primary focus:outline-none"
          aria-label="All Categories"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat.categoryName}>
              {cat.categoryName}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 h-4 w-4 text-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <input
        type="search"
        placeholder="Search for products, brands and more..."
        className="min-w-0 flex-1 bg-transparent px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
      />

      <button
        type="submit"
        className="shrink-0 bg-primary px-6 text-sm font-bold text-white transition hover:brightness-110"
      >
        Search
      </button>
    </form>
  );
}

export default DesktopSearchBar;
