import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ADMIN_TAB_OPTIONS } from "../../utils/adminPermissions";
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

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  adminType: "limited",
  adminTabs: [],
};

function AdminUserEditModal({ admin, isAdd = false, onClose, onSave, saving }) {
  const [form, setForm] = useState(emptyForm);
  const open = isAdd || Boolean(admin);

  useEffect(() => {
    if (!open) return;
    if (isAdd) {
      setForm(emptyForm);
      return;
    }

    setForm({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      password: "",
      adminType: admin.adminType === "limited" ? "limited" : "super",
      adminTabs: Array.isArray(admin.adminTabs) ? admin.adminTabs : [],
    });
  }, [admin, isAdd, open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const isLimited = form.adminType === "limited";

  const toggleTab = (tabKey) => {
    setForm((prev) => {
      const selected = new Set(prev.adminTabs);
      if (selected.has(tabKey)) {
        selected.delete(tabKey);
      } else {
        selected.add(tabKey);
      }
      return { ...prev, adminTabs: Array.from(selected) };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      adminType: form.adminType,
      adminTabs: isLimited ? form.adminTabs : [],
    };

    if (form.password.trim()) {
      payload.password = form.password.trim();
    }

    onSave(isAdd ? null : admin._id, payload);
  };

  return createPortal(
    <div className={modalOverlayClass} onClick={onClose}>
      <div
        className={`${modalPanelClass} sm:max-w-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={modalHeaderClass}>
          <h2 className="text-lg font-bold text-text-primary">
            {isAdd ? "Add Admin User" : "Edit Admin User"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-light p-2 text-text-secondary hover:bg-mobile-surface"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={`${modalBodyClass} space-y-4`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Password {isAdd ? "*" : "(leave blank to keep current)"}
              </label>
              <input
                type="password"
                required={isAdd}
                minLength={6}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Access Type *</label>
              <select
                value={form.adminType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    adminType: event.target.value,
                    adminTabs: event.target.value === "limited" ? prev.adminTabs : [],
                  }))
                }
                className={inputClass}
              >
                <option value="limited">Limited access</option>
                <option value="super">Full access (super admin)</option>
              </select>
            </div>

            {isLimited ? (
              <div>
                <label className={labelClass}>Allowed Sidebar Tabs *</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {ADMIN_TAB_OPTIONS.map((option) => {
                    const checked = form.adminTabs.includes(option.key);
                    return (
                      <label
                        key={option.key}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTab(option.key)}
                          className="h-4 w-4 rounded border-neutral-300 text-accent focus:ring-accent"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                Super admins can access every sidebar section, including Admin Users.
              </p>
            )}
          </div>

          <div className={modalFooterClass}>
            <button type="button" onClick={onClose} className={btnSecondary} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : isAdd ? "Create Admin" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default AdminUserEditModal;
