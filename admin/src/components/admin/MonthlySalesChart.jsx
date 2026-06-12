import { useMemo } from "react";
import { cardClass } from "./adminStyles";

const yearSelectClass =
  "ml-auto h-9 w-[92px] shrink-0 cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-white bg-[length:12px] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-sm font-medium text-neutral-800 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatBarValue(amount) {
  const value = Number(amount) || 0;
  if (!value) return "0";
  const hasDecimals = Math.abs(value % 1) > 0.001;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(value);
}

function formatAxisLabel(amount) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

function getChartMax(peak) {
  if (peak <= 0) return 10000;

  const padded = peak * 1.1;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;

  let nice;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 2.5) nice = 2.5;
  else if (normalized <= 5) nice = 5;
  else nice = 10;

  return nice * magnitude;
}

function MonthlySalesChart({ monthlySales, year, years, onYearChange, loading }) {
  const normalizedSales = useMemo(
    () =>
      (monthlySales || []).map((item) => ({
        month: item.month,
        revenue: Number(item.revenue) || 0,
      })),
    [monthlySales]
  );

  const chartMax = useMemo(() => {
    const peak = Math.max(...normalizedSales.map((item) => item.revenue), 0);
    return getChartMax(peak);
  }, [normalizedSales]);

  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, index) => (chartMax / steps) * index);
  }, [chartMax]);

  const padding = { top: 28, right: 16, bottom: 36, left: 56 };
  const width = 900;
  const height = 320;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const slotWidth = chartWidth / 12;
  const barWidth = Math.min(44, slotWidth * 0.55);

  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-base font-semibold text-neutral-900">Monthly Sales</h3>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className={yearSelectClass}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
          }}
          disabled={loading}
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-80 items-center justify-center text-sm text-text-secondary">
          Loading chart...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto w-full min-w-[680px]"
            role="img"
            aria-label={`Monthly sales chart for ${year}`}
          >
            <defs>
              <linearGradient id="salesBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff9a4d" />
                <stop offset="100%" stopColor="#e56a00" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => {
              const y = padding.top + chartHeight - (tick / chartMax) * chartHeight;
              return (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#6b7280"
                    fontSize="11"
                  >
                    {formatAxisLabel(tick)}
                  </text>
                </g>
              );
            })}

            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={width - padding.right}
              y2={padding.top + chartHeight}
              stroke="#d1d5db"
              strokeWidth="1"
            />

            {normalizedSales.map((item, index) => {
              const barHeight =
                item.revenue > 0 ? Math.max((item.revenue / chartMax) * chartHeight, 6) : 0;
              const x = padding.left + index * slotWidth + (slotWidth - barWidth) / 2;
              const y = padding.top + chartHeight - barHeight;
              const labelX = x + barWidth / 2;

              return (
                <g key={item.month}>
                  <text
                    x={labelX}
                    y={padding.top + chartHeight + 22}
                    textAnchor="middle"
                    fill="#4b5563"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {MONTH_LABELS[index]}
                  </text>
                  <text
                    x={labelX}
                    y={item.revenue > 0 ? y - 8 : padding.top + chartHeight - 8}
                    textAnchor="middle"
                    fill="#374151"
                    fontSize="10"
                    fontWeight="600"
                  >
                    {formatBarValue(item.revenue)}
                  </text>
                  {barHeight > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill="url(#salesBarGradient)"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

export default MonthlySalesChart;
