import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAllHeroBanners,
  getAllCategories,
  getAllProducts,
  getUsers,
} from "../../../api/api";
import { cardClass } from "../adminStyles";
import {
  IconBanner,
  IconCategory,
  IconProduct,
  IconUsers,
} from "../AdminIcons";

function StatCard({ label, value, loading, icon: Icon, iconBg }) {
  return (
    <div className={`${cardClass} flex items-start justify-between gap-4`}>
      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="mt-2 text-3xl font-bold text-text-primary">
          {loading ? "—" : value}
        </p>
      </div>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

function OverviewSection() {
  const [stats, setStats] = useState({
    banners: 0,
    categories: 0,
    products: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bannersRes, categoriesRes, productsRes, usersRes] =
          await Promise.allSettled([
            getAllHeroBanners(),
            getAllCategories(),
            getAllProducts(),
            getUsers(),
          ]);

        setStats({
          banners:
            bannersRes.status === "fulfilled"
              ? bannersRes.value.data.data?.length || 0
              : 0,
          categories:
            categoriesRes.status === "fulfilled"
              ? categoriesRes.value.data.data?.length || 0
              : 0,
          products:
            productsRes.status === "fulfilled"
              ? productsRes.value.data.data?.length || 0
              : 0,
          users:
            usersRes.status === "fulfilled"
              ? usersRes.value.data.data?.length || 0
              : 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Hero Banners"
          value={stats.banners}
          loading={loading}
          icon={IconBanner}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Categories"
          value={stats.categories}
          loading={loading}
          icon={IconCategory}
          iconBg="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Products"
          value={stats.products}
          loading={loading}
          icon={IconProduct}
          iconBg="bg-green-50 text-green-600"
        />
        <StatCard
          label="Registered Users"
          value={stats.users}
          loading={loading}
          icon={IconUsers}
          iconBg="bg-red-50 text-red-600"
        />
      </div>

      <div className={cardClass}>
        <h3 className="font-semibold text-text-primary mb-4">Quick links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { to: "/admin/banners", label: "Manage Hero Banners" },
            { to: "/admin/categories/show", label: "Manage Categories" },
            { to: "/admin/products/show", label: "Manage Products" },
            { to: "/admin/users", label: "View Users" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg border border-border-light px-4 py-3 text-sm font-medium text-text-primary transition hover:border-accent hover:text-accent"
            >
              {link.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OverviewSection;
