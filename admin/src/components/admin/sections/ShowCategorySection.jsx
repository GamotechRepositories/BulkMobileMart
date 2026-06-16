import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteCategory, getAllCategories } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import { btnDanger, btnSecondary, compactTableClass, pageHeaderClass, tableClass, tdClass, thClass } from "../adminStyles";

function ShowCategorySection() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getAllCategories();
      setCategories(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (cat) => {
    navigate("/categories/add", { state: { editCategory: cat } });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      setError("");
      setSuccess("");
      await deleteCategory(id);
      setSuccess("Category deleted");
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete category");
    }
  };

  return (
    <div className="min-w-0">
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className={pageHeaderClass}>
        <p className="text-sm text-text-secondary">
          All categories ({categories.length})
        </p>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : categories.length === 0 ? (
        <p className="text-text-secondary">No categories yet.</p>
      ) : (
        <div className={tableClass}>
          <table className={compactTableClass}>
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[22%]" />
              <col className="w-[38%]" />
              <col className="w-[12%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border-light bg-mobile-surface">
                <th className={thClass}>Image</th>
                <th className={thClass}>Category Name</th>
                <th className={thClass}>Subcategories</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat._id}
                  className="border-b border-border-light last:border-0"
                >
                  <td className={tdClass}>
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border-light bg-white">
                      <img
                        src={cat.categoryImage}
                        alt={cat.categoryName}
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  </td>
                  <td className={`${tdClass} font-medium`}>
                    <span className="block truncate">{cat.categoryName}</span>
                  </td>
                  <td className={`${tdClass} text-text-secondary`}>
                    <span className="block truncate">
                      {(cat.subcategories || []).join(", ") || "—"}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span
                      className={
                        cat.isActive ? "text-green-600" : "text-red-500"
                      }
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(cat)}
                        className={btnSecondary}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat._id)}
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

export default ShowCategorySection;
