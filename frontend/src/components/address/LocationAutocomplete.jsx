import { useCallback, useEffect, useId, useRef, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none focus:border-primary";

function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  fetchSuggestions,
  disabled = false,
  required = false,
  name,
}) {
  const listId = useId();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSuggestions = useCallback(
    async (query) => {
      if (disabled) return;
      setLoading(true);
      try {
        const items = await fetchSuggestions(query);
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [disabled, fetchSuggestions]
  );

  useEffect(() => {
    if (!open) return undefined;

    const timer = setTimeout(() => {
      loadSuggestions(value);
    }, 200);

    return () => clearTimeout(timer);
  }, [open, value, loadSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onChange(item);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-70`}
      />

      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border-light bg-white py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2 text-xs text-text-secondary">Loading...</li>
          ) : suggestions.length ? (
            suggestions.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(item)}
                  className="block w-full px-3 py-2 text-left text-sm text-text-primary transition hover:bg-mobile-surface"
                >
                  {item}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-text-secondary">No suggestions found</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

export default LocationAutocomplete;
