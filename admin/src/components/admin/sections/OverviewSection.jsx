import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats } from "../../../api/api";
import MonthlySalesChart from "../MonthlySalesChart";
import RecentTodayOrders from "../RecentTodayOrders";
import { cardClass } from "../adminStyles";
import { IconCategory, IconOrder, IconProduct } from "../AdminIcons";

function TodayStatCard({ label, value, loading, iconBg, children }) {
  return (
    <div className={`${cardClass} flex items-center justify-between gap-3`}>
      <div>
        <p className="text-xs text-text-secondary sm:text-sm">{label}</p>
        <p className="mt-1 text-2xl font-bold text-text-primary sm:text-3xl">
          {loading ? "—" : value}
        </p>
      </div>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${iconBg}`}
      >
        {children}
      </div>
    </div>
  );
}

function TotalCard({ label, value, loading, to, icon: Icon }) {
  return (
    <div className={`${cardClass} flex items-start justify-between gap-4`}>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="mt-2 text-3xl font-bold text-text-primary">
          {loading ? "—" : value}
        </p>
        <Link to={to} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          View All →
        </Link>
      </div>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-primary">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

function OverviewSection() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today, setToday] = useState({
    orders: 0,
    pending: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [recentTodayOrders, setRecentTodayOrders] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [years, setYears] = useState([currentYear]);
  const [totals, setTotals] = useState({ products: 0, categories: 0 });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await getDashboardStats({ year });
        const stats = data.data || {};

        setToday(stats.today || { orders: 0, pending: 0, delivered: 0, cancelled: 0 });
        setRecentTodayOrders(stats.recentTodayOrders || []);
        setMonthlySales(stats.monthlySales || []);
        setYears(stats.years?.length ? stats.years : [currentYear]);
        setTotals(stats.totals || { products: 0, categories: 0 });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
        setRecentTodayOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [year, currentYear]);

  return (
    <div className="min-w-0 space-y-6">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TodayStatCard
          label="Today's Orders"
          value={today.orders}
          loading={loading}
          iconBg="bg-orange-50 text-primary"
        >
          <IconOrder className="h-5 w-5" />
        </TodayStatCard>
        <TodayStatCard
          label="Today's Pending"
          value={today.pending}
          loading={loading}
          iconBg="bg-amber-50 text-amber-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </TodayStatCard>
        <TodayStatCard
          label="Today's Delivered"
          value={today.delivered}
          loading={loading}
          iconBg="bg-green-50 text-green-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </TodayStatCard>
        <TodayStatCard
          label="Today's Cancelled"
          value={today.cancelled}
          loading={loading}
          iconBg="bg-red-50 text-red-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </TodayStatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TotalCard
          label="Total Products"
          value={totals.products}
          loading={loading}
          to="/products/show"
          icon={IconProduct}
        />
        <TotalCard
          label="Total Categories"
          value={totals.categories}
          loading={loading}
          to="/categories/show"
          icon={IconCategory}
        />
      </div>

      <MonthlySalesChart
        monthlySales={monthlySales}
        year={year}
        years={years}
        onYearChange={setYear}
        loading={loading}
      />

      <RecentTodayOrders orders={recentTodayOrders} loading={loading} />
    </div>
  );
}

export default OverviewSection;
