import {
  adminFilterCardClass,
  adminFilterInputClass,
  adminFilterLabelClass,
} from "../adminStyles";
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from "./adminOrderUtils";

function AdminOrderFilters({
  startDate,
  endDate,
  orderStatus,
  paymentStatus,
  onStartDateChange,
  onEndDateChange,
  onOrderStatusChange,
  onPaymentStatusChange,
  onDownload,
  showOrderStatus = true,
  showPaymentStatus = true,
}) {
  return (
    <div className={adminFilterCardClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <label className={adminFilterLabelClass}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className={adminFilterInputClass}
            />
          </div>

          <div className="min-w-0">
            <label className={adminFilterLabelClass}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className={adminFilterInputClass}
            />
          </div>

          {showOrderStatus && (
            <div className="min-w-0">
              <label className={adminFilterLabelClass}>Order Status</label>
              <select
                value={orderStatus}
                onChange={(e) => onOrderStatusChange(e.target.value)}
                className={adminFilterInputClass}
              >
                {ORDER_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showPaymentStatus && (
            <div className="min-w-0">
              <label className={adminFilterLabelClass}>Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => onPaymentStatusChange(e.target.value)}
                className={adminFilterInputClass}
              >
                {PAYMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDownload}
          className="w-full shrink-0 rounded-lg bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 sm:w-auto lg:mb-0"
        >
          Download XLS
        </button>
      </div>
    </div>
  );
}

export default AdminOrderFilters;
