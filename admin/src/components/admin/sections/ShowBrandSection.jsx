import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteBrand, getAllBrands } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  compactTableClass,
  tableClass,
  tdClass,
  thClass,
} from "../adminStyles";

function ShowBrandSection() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchBrands = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getAllBrands();
      setBrands(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

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
      fetchBrands();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete brand");
    }
  };

  return (
    <div>
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          All brands ({brands.length})
        </p>
        <button
          type="button"
          onClick={() => navigate("/brands/add")}
          className={btnPrimary}
        >
          Add Brand
        </button>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : brands.length === 0 ? (
        <p className="text-text-secondary">No brands yet.</p>
      ) : (
        <div className={tableClass}>
          <table className={compactTableClass}>
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[28%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[36%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border-light bg-mobile-surface">
                <th className={thClass}>Image</th>
                <th className={thClass}>Brand Name</th>
                <th className={thClass}>Order</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr
                  key={brand._id}
                  className="border-b border-border-light last:border-0"
                >
                  <td className={tdClass}>
                    <div className="flex h-10 w-14 items-center justify-center overflow-hidden rounded-lg border border-border-light bg-white">
                      <img
                        src={brand.brandImage}
                        alt={brand.brandName}
                        className="h-8 w-full object-contain p-0.5"
                      />
                    </div>
                  </td>
                  <td className={`${tdClass} font-medium`}>
                    <span className="block truncate">{brand.brandName}</span>
                  </td>
                  <td className={tdClass}>{brand.order ?? 0}</td>
                  <td className={tdClass}>
                    <span
                      className={
                        brand.isActive ? "text-green-600" : "text-red-500"
                      }
                    >
                      {brand.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(brand)}
                        className={btnSecondary}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(brand._id)}
                        className={btnDanger}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ShowBrandSection;
