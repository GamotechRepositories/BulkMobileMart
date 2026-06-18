import { Link } from "react-router-dom";
import { cardClass } from "../adminStyles";
import { formatCompactCurrency, formatNumber } from "./dashboardUtils";

const CATEGORY_COLORS = ["#ff7a00", "#2563eb", "#16a34a", "#eab308"];

function buildDonutSegments(categories, total) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return categories.map((item, index) => {
    const value = Number(item.value) || 0;
    const share = total > 0 ? value / total : 0;
    const dash = share * circumference;
    const segment = {
      ...item,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      percent: item.percent ?? (total > 0 ? Math.round(share * 100) : 0),
      dash,
      offset,
    };
    offset += dash;
    return segment;
  });
}

function TopCategoriesChart({ categories = [], loading }) {
  const total = categories.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const segments = buildDonutSegments(categories, total);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={`${cardClass} flex h-full w-full min-h-0 flex-col`}>
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-neutral-900">Top Categories</h3>
          {!loading && total > 0 && (
            <p className="mt-0.5 text-xs text-neutral-500">Top 3 + other categories</p>
          )}
        </div>
        <Link
          to="/categories/show"
          className="shrink-0 text-xs font-medium text-primary hover:underline sm:text-sm"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <p className="flex min-h-[300px] flex-1 items-center justify-center text-sm text-neutral-500">
          Loading categories...
        </p>
      ) : categories.length === 0 ? (
        <p className="flex min-h-[300px] flex-1 items-center justify-center text-sm text-neutral-500">
          No category sales yet.
        </p>
      ) : (
        <div className="flex min-h-[300px] flex-1 items-center gap-3 sm:gap-4">
          <div className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center sm:h-44 sm:w-44">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="15" />
              {segments.map((segment) => (
                <circle
                  key={segment.name}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="15"
                  strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
                  strokeDashoffset={-segment.offset}
                  strokeLinecap="butt"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
              <p className="text-[10px] font-medium text-neutral-500">Total Sales</p>
              <p className="mt-0.5 text-xs font-bold text-neutral-900 sm:text-sm">
                {formatCompactCurrency(total)}
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {segments.map((segment) => (
              <div
                key={segment.name}
                className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-2 py-2 sm:px-2.5"
              >
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium leading-snug text-neutral-800 break-words sm:text-[11px]">
                    {segment.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-neutral-600">
                    <span className="font-semibold text-neutral-900">{segment.percent}%</span>
                    <span className="text-neutral-400"> · </span>
                    <span>({formatNumber(segment.units || 0)})</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TopCategoriesChart;
