import { cardClass } from "../adminStyles";

function TodayStatCard({ label, value, loading, iconBg, children }) {
  return (
    <div className={`${cardClass} flex items-center gap-2 p-3 sm:gap-3 sm:p-5`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&_svg]:h-4 [&_svg]:w-4 sm:h-11 sm:w-11 sm:[&_svg]:h-5 sm:[&_svg]:w-5 ${iconBg}`}
      >
        {children}
      </div>

      <p className="min-w-0 flex-1 text-[10px] font-medium leading-tight text-neutral-500 sm:text-sm">
        {label}
      </p>

      <p className="shrink-0 text-lg font-bold text-neutral-900 sm:text-2xl">
        {loading ? "—" : value}
      </p>
    </div>
  );
}

export default TodayStatCard;
