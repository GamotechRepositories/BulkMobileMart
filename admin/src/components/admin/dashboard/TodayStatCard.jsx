import { Link } from "react-router-dom";
import { cardClass } from "../adminStyles";

function TodayStatCard({ label, value, loading, iconBg, to, children }) {
  const content = (
    <div
      className={`${cardClass} flex items-center gap-2 p-3 sm:gap-3 sm:p-5 xl:gap-2 xl:p-3 ${
        to ? "transition hover:border-neutral-300 hover:shadow-sm" : ""
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&_svg]:h-4 [&_svg]:w-4 sm:h-11 sm:w-11 sm:[&_svg]:h-5 sm:[&_svg]:w-5 xl:h-9 xl:w-9 xl:[&_svg]:h-4 xl:[&_svg]:w-4 ${iconBg}`}
      >
        {children}
      </div>

      <p className="min-w-0 flex-1 break-words text-[10px] font-medium leading-tight text-neutral-500 sm:text-sm xl:text-xs">
        {label}
      </p>

      <p className="shrink-0 text-lg font-bold text-neutral-900 sm:text-2xl xl:text-xl">
        {loading ? "—" : value}
      </p>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
}

export default TodayStatCard;
