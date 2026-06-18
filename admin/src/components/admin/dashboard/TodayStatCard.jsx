import { cardClass } from "../adminStyles";
import Sparkline from "./Sparkline";
import TrendArrow from "./TrendArrow";
import { getDayChange, getTrendClass } from "./dashboardUtils";

function TodayStatCard({
  label,
  value,
  yesterdayValue,
  trendValues = [],
  loading,
  iconBg,
  sparkColor = "#ff7a00",
  invertTrend = false,
  children,
}) {
  const change = getDayChange(value, yesterdayValue);
  const trendClass = getTrendClass(change, invertTrend);
  const trendLabel =
    change.direction === "flat" ? "No change" : `${change.percent}% vs yesterday`;

  return (
    <div className={`${cardClass} flex items-center gap-2.5 sm:gap-3`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${iconBg}`}
      >
        {children}
      </div>

      <div className="min-w-0 flex-1">
        <p className="whitespace-nowrap text-xs font-medium text-neutral-500 sm:text-sm">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-neutral-900 sm:text-2xl">
          {loading ? "—" : value}
        </p>
        {!loading && (
          <p
            className={`mt-1 flex items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold leading-tight sm:text-xs ${trendClass}`}
          >
            <TrendArrow direction={change.direction} />
            <span>{trendLabel}</span>
          </p>
        )}
      </div>

      {!loading && trendValues.length > 0 && (
        <Sparkline
          values={trendValues}
          color={sparkColor}
          height={36}
          className="hidden w-12 shrink-0 sm:block sm:w-14"
        />
      )}
    </div>
  );
}

export default TodayStatCard;
