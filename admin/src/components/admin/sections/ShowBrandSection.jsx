import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteBrand, getAllBrands } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import { IconEdit, IconTrash } from "../AdminIcons";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  btnPrimary,
  iconBtnClass,
  iconBtnDangerClass,
  pageHeaderActionsClass,
  pageHeaderClass,
} from "../adminStyles";

function ShowBrandSection() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const fetchBrands = useCallback(async (pageToLoad = page) => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getAllBrands({ page: pageToLoad, limit: ADMIN_PAGE_SIZE });
      setBrands(data.data || []);
      setPagination(
        data.pagination || {
          page: pageToLoad,
          limit: ADMIN_PAGE_SIZE,
          total: data.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBrands(page);
  }, [fetchBrands, page]);

  const handleEdit = (brand) => {
    navigate("/brands/add", { state: { editBrand: brand } });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this brand?")) return;
    try {
      setError("");
      setSuccess("");
      await deleteBrand(id);
      setSuccess("Brand deleted");
      const nextPage = brands.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else fetchBrands(page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete brand");
    }
  };

  return (
    <div className="min-w-0">
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className={pageHeaderClass}>
        <p className="text-sm font-medium text-neutral-700">
          All brands ({pagination.total})
        </p>
        <div className={pageHeaderActionsClass}>
          <button
            type="button"
            onClick={() => navigate("/brands/add")}
            className={btnPrimary}
          >
            Add Brand
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : brands.length === 0 ? (
        <p className="text-text-secondary">No brands yet.</p>
      ) : (
        <div className={adminTableWrapperClass}>
          <table className={adminCompactTableClass}>
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[28%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[36%]" />
            </colgroup>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminCompactThClass}>Image</th>
                <th className={adminCompactThClass}>Brand Name</th>
                <th className={adminCompactThClass}>Order</th>
                <th className={adminCompactThClass}>Status</th>
                <th className={adminCompactThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr
                  key={brand._id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                >
                  <td className={adminCompactTdClass}>
                    <div className="flex h-9 w-12 items-center justify-center overflow-hidden rounded border border-neutral-200 bg-white">
                      <img
                        src={brand.brandImage}
                        alt={brand.brandName}
                        className="max-h-full max-w-full object-contain p-0.5"
                      />
                    </div>
                  </td>
                  <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                    <span className="block truncate">{brand.brandName}</span>
                  </td>
                  <td className={`${adminCompactTdClass} text-neutral-600`}>
                    {brand.order ?? 0}
                  </td>
                  <td className={adminCompactTdClass}>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        brand.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {brand.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={adminCompactTdClass}>
                    <div className="flex flex-nowrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(brand)}
                        className={iconBtnClass}
                        title="Edit brand"
                        aria-label="Edit brand"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(brand._id)}
                        className={iconBtnDangerClass}
                        title="Delete brand"
                        aria-label="Delete brand"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            loading={loading}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

export default ShowBrandSection;
