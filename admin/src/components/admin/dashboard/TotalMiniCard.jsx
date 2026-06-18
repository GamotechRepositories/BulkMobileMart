import { Link } from "react-router-dom";
import { cardClass } from "../adminStyles";
import { formatNumber } from "./dashboardUtils";

function TotalMiniCard({ label, value, loading, to, icon: Icon, iconBg }) {
  return (
    <div className={`${cardClass} flex h-full items-center gap-3`}>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${iconBg}`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">
          {loading ? "—" : formatNumber(value)}
        </p>
        <Link
          to={to}
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          View All →
        </Link>
      </div>
    </div>
  );
}

export default TotalMiniCard;
