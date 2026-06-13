import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteTestimonial, getAllTestimonials } from "../../../api/api";
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

function ShowTestimonialSection() {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getAllTestimonials();
      setTestimonials(data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleEdit = (item) => {
    navigate("/testimonials/add", { state: { editTestimonial: item } });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this testimonial?")) return;
    try {
      setError("");
      setSuccess("");
      await deleteTestimonial(id);
      setSuccess("Testimonial deleted");
      fetchTestimonials();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete testimonial");
    }
  };

  return (
    <div>
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          All testimonials ({testimonials.length})
        </p>
        <button
          type="button"
          onClick={() => navigate("/testimonials/add")}
          className={btnPrimary}
        >
          Add Testimonial
        </button>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : testimonials.length === 0 ? (
        <p className="text-text-secondary">No testimonials yet.</p>
      ) : (
        <div className={tableClass}>
          <table className={compactTableClass}>
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[44%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border-light bg-mobile-surface">
                <th className={thClass}>Name</th>
                <th className={thClass}>Text</th>
                <th className={thClass}>Order</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-border-light last:border-0"
                >
                  <td className={`${tdClass} font-medium`}>
                    <span className="block truncate">{item.name}</span>
                    <span className="block truncate text-xs text-text-secondary">
                      {item.role || "—"}
                    </span>
                  </td>
                  <td className={`${tdClass} text-text-secondary`}>
                    <span className="line-clamp-2 text-xs">{item.text}</span>
                  </td>
                  <td className={tdClass}>{item.order ?? 0}</td>
                  <td className={tdClass}>
                    <span
                      className={
                        item.isActive ? "text-green-600" : "text-red-500"
                      }
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className={btnSecondary}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item._id)}
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

export default ShowTestimonialSection;
