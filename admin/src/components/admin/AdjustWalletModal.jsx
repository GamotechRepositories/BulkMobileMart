import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { adjustAdminWalletBalance } from "../../api/api";
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  labelClass,
  modalBodyClass,
  modalFooterClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
} from "./adminStyles";

function AdjustWalletModal({ user, onClose, onSuccess }) {
  const [actionType, setActionType] = useState("credit"); // "credit" | "debit"
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const open = Boolean(user);

  useEffect(() => {
    if (!open) return;
    setActionType("credit");
    setPoints("");
    setDescription("");
    setError("");
  }, [user, open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const currentBalance = Number(
    user.walletBalance ?? user.wallet?.pointsBalance ?? user.pointsBalance ?? 0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pts = parseInt(points, 10);
    if (!Number.isSafeInteger(pts) || pts <= 0) {
      setError("Please enter a valid positive whole number of points.");
      return;
    }

    if (actionType === "debit" && pts > currentBalance) {
      setError(
        `Cannot debit ${pts} points. Current user balance is only ${currentBalance} points.`
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      const pointsDelta = actionType === "credit" ? pts : -pts;
      const userId = user._id || user.userId?._id || user.userId;

      await adjustAdminWalletBalance({
        userId,
        pointsDelta,
        description:
          description.trim() || `Admin manual ${actionType} adjustment`,
      });

      if (onSuccess) {
        onSuccess({
          userId,
          actionType,
          points: pts,
          newBalance: currentBalance + pointsDelta,
        });
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || `Failed to ${actionType} wallet points`
      );
    } finally {
      setSaving(false);
    }
  };

  const userName = user.name || user.userId?.name || "Customer";
  const userPhone = user.phone || user.userId?.phone || "";

  return createPortal(
    <div className={modalOverlayClass} onClick={onClose}>
      <div
        className={`${modalPanelClass} sm:max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={modalHeaderClass}>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Adjust Wallet Balance
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {userName} {userPhone ? `(${userPhone})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-light p-2 text-text-secondary hover:bg-mobile-surface"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className={`${modalBodyClass} space-y-4`}>
            {error ? (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 font-medium">
                {error}
              </div>
            ) : null}

            {/* Current Balance Display */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-700">
                  Current Balance
                </p>
                <p className="text-xl font-black text-indigo-950 mt-0.5">
                  {currentBalance}{" "}
                  <span className="text-sm font-semibold text-indigo-700">
                    points
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                  ₹{currentBalance} value
                </span>
              </div>
            </div>

            {/* Credit or Debit Selector */}
            <div>
              <label className={labelClass}>Action *</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setActionType("credit")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 px-3 text-sm font-bold transition ${
                    actionType === "credit"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <span className="text-base font-black text-emerald-600">
                    +
                  </span>
                  <span>Credit (Add)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType("debit")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 px-3 text-sm font-bold transition ${
                    actionType === "debit"
                      ? "border-red-600 bg-red-50 text-red-800 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <span className="text-base font-black text-red-600">-</span>
                  <span>Debit (Deduct)</span>
                </button>
              </div>
            </div>

            {/* Points Delta */}
            <div>
              <label className={labelClass}>
                Points Amount * (1 point = ₹1)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 50"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className={inputClass}
              />
              {points && !isNaN(Number(points)) && Number(points) > 0 ? (
                <p className="mt-1 text-xs text-neutral-500">
                  New balance after {actionType}:{" "}
                  <strong className="text-neutral-900">
                    {actionType === "credit"
                      ? currentBalance + Number(points)
                      : Math.max(0, currentBalance - Number(points))}{" "}
                    points (₹
                    {actionType === "credit"
                      ? currentBalance + Number(points)
                      : Math.max(0, currentBalance - Number(points))}
                    )
                  </strong>
                </p>
              ) : null}
            </div>

            {/* Description / Reason */}
            <div>
              <label className={labelClass}>Reason / Note *</label>
              <input
                type="text"
                required
                placeholder="e.g. Loyalty reward, Order compensation, Manual adjustment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className={modalFooterClass}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${btnPrimary} ${
                actionType === "debit" ? "!bg-red-600 hover:!bg-red-700" : ""
              }`}
            >
              {saving
                ? "Updating..."
                : actionType === "credit"
                ? `Credit ${points || "0"} Points`
                : `Debit ${points || "0"} Points`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default AdjustWalletModal;
