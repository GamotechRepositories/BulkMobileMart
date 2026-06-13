import { useState } from "react";

function GridIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}

function SidebarCategoryImage({ image, name, showGrid = false }) {
  const [failed, setFailed] = useState(false);

  if (showGrid || (!image && name === "All Categories")) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-light bg-mobile-surface">
        <GridIcon className="h-5 w-5 text-text-secondary" />
      </div>
    );
  }

  if (!image || failed) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-light bg-mobile-surface">
        <span className="text-xs font-bold uppercase text-text-muted">
          {name?.charAt(0) || "?"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={name}
      className="h-9 w-9 shrink-0 rounded-lg border border-border-light bg-white object-contain p-0.5"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default SidebarCategoryImage;
