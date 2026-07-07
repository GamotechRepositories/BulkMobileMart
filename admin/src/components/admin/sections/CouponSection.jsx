import { useCallback, useEffect, useState } from "react";
import {
  createCoupon,
  deleteCoupon,
  getAllCoupons,
  updateCoupon,
} from "../../../api/api";
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
  btnSecondary,
  cardClass,
  iconBtnClass,
  iconBtnDangerClass,
  inputClass,
  labelClass,
  pageHeaderActionsClass,
  pageHeaderClass,
} from "../adminStyles";

const EMPTY_FORM = {
  code: "",
  title: "",
  discountType: "percentage",
  discountValue: "",
  startDate: "",
  endDate: "",
  minOrderAmount: "0",
  isActive: true,
};

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getCouponStatusLabel(coupon) {
  if (!coupon.isActive) return { label: "Inactive", className: "bg-neutral-100 text-neutral-600" };
  const now = new Date();
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);
  if (now < start) return { label: "Scheduled", className: "bg-blue-100 text-blue-700" };
  if (now > end) return { label: "Expired", className: "bg-red-100 text-red-700" };
  return { label: "Active", className: "bg-green-100 text-green-700" };
}

function formatDiscount(coupon) {
  if (coupon.discountType === "percentage") {
    return `${coupon.discountValue}% off`;
  }
  return `₹${coupon.discountValue} off`;
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CouponSection() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getAllCoupons({ page, limit: ADMIN_PAGE_SIZE });
      setCoupons(data.data || []);
      setPagination(
        data.pagination || {
          page,
          limit: ADMIN_PAGE_SIZE,
          total: data.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load coupons");
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEdit = (coupon) => {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code || "",
      title: coupon.title || "",
      discountType: coupon.discountType || "percentage",
      discountValue: String(coupon.discountValue ?? ""),
      startDate: toDatetimeLocalValue(coupon.startDate),
      endDate: toDatetimeLocalValue(coupon.endDate),
      minOrderAmount: String(coupon.minOrderAmount ?? 0),
      isActive: coupon.isActive !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      code: form.code.trim(),
      title: form.title.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      minOrderAmount: Number(form.minOrderAmount) || 0,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await updateCoupon(editingId, payload);
        setSuccess("Coupon updated");
      } else {
        await createCoupon(payload);
        setSuccess("Coupon created");
      }
      resetForm();
      fetchCoupons();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      setError("");
      setSuccess("");
      await deleteCoupon(id);
      setSuccess("Coupon deleted");
      if (editingId === id) resetForm();
      fetchCoupons();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete coupon");
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <AdminAlert
        error={error}
        success={success}
        onClear={() => {
          setError("");
          setSuccess("");
        }}
      />

      <div className={pageHeaderClass}>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Coupons</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Create store-wide coupons for all products with start and end time.
          </p>
        </div>
        {editingId ? (
          <div className={pageHeaderActionsClass}>
            <button type="button" onClick={resetForm} className={btnSecondary}>
              Cancel Edit
            </button>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
        <h3 className="text-sm font-bold text-text-primary">
          {editingId ? "Edit Coupon" : "Create Coupon"}
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="coupon-code">
              Coupon Code
            </label>
            <input
              id="coupon-code"
              name="code"
              value={form.code}
              onChange={handleChange}
              required
              placeholder="SAVE10"
              className={`${inputClass} uppercase`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="coupon-title">
              Title (optional)
            </label>
            <input
              id="coupon-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Summer sale"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="coupon-discount-type">
              Discount Type
            </label>
            <select
              id="coupon-discount-type"
              name="discountType"
              value={form.discountType}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (₹)</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="coupon-discount-value">
              Discount Value
            </label>
            <input
              id="coupon-discount-value"
              name="discountValue"
              type="number"
              min="0"
              step={form.discountType === "percentage" ? "1" : "0.01"}
              max={form.discountType === "percentage" ? "100" : undefined}
              value={form.discountValue}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="coupon-start-date">
              Start Date & Time
            </label>
            <input
              id="coupon-start-date"
              name="startDate"
              type="datetime-local"
              value={form.startDate}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="coupon-end-date">
              End Date & Time
            </label>
            <input
              id="coupon-end-date"
              name="endDate"
              type="datetime-local"
              value={form.endDate}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="coupon-min-order">
              Minimum Order Amount (₹)
            </label>
            <input
              id="coupon-min-order"
              name="minOrderAmount"
              type="number"
              min="0"
              step="1"
              value={form.minOrderAmount}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="h-4 w-4 accent-primary"
              />
              Active
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-text-secondary">Loading coupons...</p>
      ) : coupons.length === 0 ? (
        <p className="text-text-secondary">No coupons yet.</p>
      ) : (
        <div className={adminTableWrapperClass}>
          <table className={adminCompactTableClass}>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminCompactThClass}>Code</th>
                <th className={adminCompactThClass}>Discount</th>
                <th className={adminCompactThClass}>Valid From</th>
                <th className={adminCompactThClass}>Valid Until</th>
                <th className={adminCompactThClass}>Min Order</th>
                <th className={adminCompactThClass}>Status</th>
                <th className={adminCompactThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const status = getCouponStatusLabel(coupon);
                return (
                  <tr key={coupon._id} className="border-b border-neutral-100 last:border-0">
                    <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                      <span className="block">{coupon.code}</span>
                      {coupon.title ? (
                        <span className="mt-0.5 block text-[10px] font-normal text-neutral-500">
                          {coupon.title}
                        </span>
                      ) : null}
                    </td>
                    <td className={adminCompactTdClass}>{formatDiscount(coupon)}</td>
                    <td className={adminCompactTdClass}>{formatDateTime(coupon.startDate)}</td>
                    <td className={adminCompactTdClass}>{formatDateTime(coupon.endDate)}</td>
                    <td className={adminCompactTdClass}>₹{coupon.minOrderAmount || 0}</td>
                    <td className={adminCompactTdClass}>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className={adminCompactTdClass}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(coupon)}
                          className={iconBtnClass}
                          title="Edit coupon"
                          aria-label="Edit coupon"
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(coupon._id)}
                          className={iconBtnDangerClass}
                          title="Delete coupon"
                          aria-label="Delete coupon"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

export default CouponSection;
