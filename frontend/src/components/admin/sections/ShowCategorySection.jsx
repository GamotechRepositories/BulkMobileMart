import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteCategory, getAllCategories } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import { btnDanger, btnSecondary, tableClass } from "../adminStyles";

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
    navigate("/admin/categories/add", { state: { editCategory: cat } });
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
    <div>
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className="mb-4 flex items-center justify-between gap-3">
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-light bg-mobile-surface">
                <th className="px-4 py-3 font-semibold">Image</th>
                <th className="px-4 py-3 font-semibold">Category Name</th>
                <th className="px-4 py-3 font-semibold">Subcategories</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat._id}
                  className="border-b border-border-light last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border-light bg-white">
                      <img
                        src={cat.categoryImage}
                        alt={cat.categoryName}
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{cat.categoryName}</td>
                  <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                    {(cat.subcategories || []).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        cat.isActive ? "text-green-600" : "text-red-500"
                      }
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
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
