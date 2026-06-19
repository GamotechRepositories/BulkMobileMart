import { Link } from "react-router-dom";
import { cardClass } from "../adminStyles";
import { formatNumber } from "./dashboardUtils";

function TotalMiniCard({ label, value, loading, to, icon: Icon, iconBg, className = "" }) {
  return (
    <div
      className={`${cardClass} flex h-full min-w-0 items-center gap-2 p-3 sm:gap-3 sm:p-5 ${className}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${iconBg}`}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium leading-tight text-neutral-500 sm:text-sm">{label}</p>
        <Link
          to={to}
          className="mt-0.5 inline-block text-[9px] font-medium text-primary hover:underline sm:text-xs"
        >
          View All →
        </Link>
      </div>

      <p className="shrink-0 text-lg font-bold text-neutral-900 sm:text-2xl">
        {loading ? "—" : formatNumber(value)}
      </p>
    </div>
  );
}

export default TotalMiniCard;
