function MobileSearchBar({ className = "" }) {
  return (
    <form
      className={`flex items-center gap-2 rounded-full border border-border-light bg-white px-3 py-2 shadow-sm sm:px-4 sm:py-2.5 ${className}`}
      onSubmit={(e) => e.preventDefault()}
    >
      <svg
        className="h-4 w-4 shrink-0 text-text-secondary sm:h-5 sm:w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        placeholder="Search Products..."
        className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none sm:text-base"
      />
      <button
        type="button"
        aria-label="Filter products"
        className="shrink-0 text-text-secondary transition hover:text-primary"
      >
        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
      </button>
    </form>
  );
}

export default MobileSearchBar;
