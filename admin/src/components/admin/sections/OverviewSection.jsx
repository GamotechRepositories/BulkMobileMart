import { useEffect, useState } from "react";
import { getDashboardStats } from "../../../api/api";
import MonthlySalesChart from "../MonthlySalesChart";
import DashboardRecentOrders from "../dashboard/DashboardRecentOrders";
import RevenueCard from "../dashboard/RevenueCard";
import StoreOverview from "../dashboard/StoreOverview";
import TodayStatCard from "../dashboard/TodayStatCard";
import TopCategoriesChart from "../dashboard/TopCategoriesChart";
import TotalMiniCard from "../dashboard/TotalMiniCard";
import { IconCategory, IconOrder, IconProduct } from "../AdminIcons";

const EMPTY_DAY_STATS = { orders: 0, pending: 0, delivered: 0, cancelled: 0 };

function OverviewSection() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today, setToday] = useState(EMPTY_DAY_STATS);
  const [recentOrders, setRecentOrders] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [years, setYears] = useState([currentYear]);
  const [totals, setTotals] = useState({ products: 0, categories: 0, users: 0, totalRevenue: 0 });
  const [revenue, setRevenue] = useState({ currentMonth: 0, lastMonth: 0, monthlyTrend: [] });
  const [storeOverview, setStoreOverview] = useState({
    activeProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    activeUsers: 0,
  });
  const [topCategories, setTopCategories] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await getDashboardStats({ year });
        const stats = data.data || {};

        setToday(stats.today || EMPTY_DAY_STATS);
        setRecentOrders(stats.recentOrders || []);
        setMonthlySales(stats.monthlySales || []);
        setYears(stats.years?.length ? stats.years : [currentYear]);
        setTotals(stats.totals || { products: 0, categories: 0, users: 0, totalRevenue: 0 });
        setRevenue(stats.revenue || { currentMonth: 0, lastMonth: 0, monthlyTrend: [] });
        setStoreOverview(
          stats.storeOverview || {
            activeProducts: 0,
            outOfStock: 0,
            lowStock: 0,
            activeUsers: 0,
          }
        );
        setTopCategories(stats.topCategories || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          iconBg="bg-amber-50 text-amber-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          iconBg="bg-red-50 text-red-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </TodayStatCard>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 xl:grid xl:grid-cols-4 xl:items-stretch">
        <div className="flex gap-3 sm:gap-4 xl:contents">
          <TotalMiniCard
            className="flex-1"
            label="Total Products"
            value={totals.products}
            loading={loading}
            to="/products/show"
            icon={IconProduct}
            iconBg="bg-violet-50 text-violet-600"
          />
          <TotalMiniCard
            className="flex-1"
            label="Total Categories"
            value={totals.categories}
            loading={loading}
            to="/categories/show"
            icon={IconCategory}
            iconBg="bg-blue-50 text-blue-600"
          />
        </div>
        <RevenueCard
          totalRevenue={totals.totalRevenue}
          currentMonth={revenue.currentMonth}
          lastMonth={revenue.lastMonth}
          monthlyTrend={revenue.monthlyTrend}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <div className="flex h-full min-h-0 xl:col-span-2">
          <MonthlySalesChart
            monthlySales={monthlySales}
            year={year}
            years={years}
            onYearChange={setYear}
            loading={loading}
          />
        </div>
        <div className="flex h-full min-h-0">
          <TopCategoriesChart categories={topCategories} loading={loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardRecentOrders orders={recentOrders} loading={loading} />
        </div>
        <StoreOverview overview={storeOverview} loading={loading} />
      </div>
    </div>
  );
}

export default OverviewSection;
