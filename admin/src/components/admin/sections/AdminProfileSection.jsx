import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { changeMyPassword, getCurrentUser } from "../../../api/api";
import { STORE_URL } from "../../../constants/brand";
import { useAuth } from "../../../context/AuthContext";
import AdminAlert from "../AdminAlert";
import { IconExternalLink, IconLogout } from "../AdminIcons";
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  cardClass,
  inputClass,
  labelClass,
} from "../adminStyles";

function formatMemberSince(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function DetailRow({ label, value, children }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 border-b border-border-light py-2.5 text-sm last:border-0 sm:grid-cols-[120px_1fr] sm:gap-x-4 sm:py-3">
      <span className="text-xs font-medium text-text-secondary sm:text-sm">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-medium text-text-primary sm:text-left sm:text-sm">
        {children ?? value ?? "—"}
      </span>
    </div>
  );
}

function buildAccountForm(profile, adminUser) {
  return {
    name: profile?.name ?? adminUser?.name ?? "",
    email: profile?.email ?? adminUser?.email ?? "",
    phone: profile?.phone ?? adminUser?.phone ?? "",
  };
}

function AdminProfileSection() {
  const navigate = useNavigate();
  const { adminUser, adminLogout, updateAdminProfile } = useAuth();
  const [profile, setProfile] = useState(adminUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingAccount, setEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState(() => buildAccountForm(adminUser, adminUser));
  const [savingAccount, setSavingAccount] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then(({ data }) => {
        if (active) setProfile(data.data);
      })
      .catch(() => {
        if (active) setError("Could not load profile details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const displayName = profile?.name || adminUser?.name || "Admin";
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";

  const account = {
    name: profile?.name ?? adminUser?.name,
    email: profile?.email ?? adminUser?.email,
    phone: profile?.phone ?? adminUser?.phone,
    role: profile?.role ?? adminUser?.role ?? "admin",
    createdAt: profile?.createdAt,
  };

  const resetAccountForm = () => {
    setAccountForm(buildAccountForm(profile, adminUser));
  };

  const handleStartEditAccount = () => {
    setError("");
    setSuccess("");
    resetAccountForm();
    setEditingAccount(true);
  };

  const handleCancelEditAccount = () => {
    resetAccountForm();
    setEditingAccount(false);
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const name = accountForm.name.trim();
    const email = accountForm.email.trim();
    const phone = accountForm.phone.trim();

    if (!name || !email || !phone) {
      setError("Name, email, and phone are required.");
      return;
    }

    try {
      setSavingAccount(true);
      const { data } = await updateAdminProfile({ name, email, phone });
      setProfile(data);
      setEditingAccount(false);
      setSuccess("Account details updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update account details.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate("/login");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setSavingPassword(true);
      await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess("Password updated successfully.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className={`${cardClass} text-center`}>
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-neutral-300 bg-white text-2xl font-bold text-neutral-800">
          {initial}
        </div>
        <h2 className="text-xl font-bold text-text-primary">{displayName}</h2>
        <p className="mt-1 text-sm text-text-secondary">Administrator</p>
      </div>

      <div className={`${cardClass} p-0 sm:p-0`}>
        <div className="flex items-center justify-between gap-3 border-b border-border-light px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="font-semibold text-text-primary">Account details</h3>
          {!editingAccount ? (
            <button
              type="button"
              onClick={handleStartEditAccount}
              className="text-sm font-semibold text-primary transition hover:underline"
            >
              Edit
            </button>
          ) : null}
        </div>
        {loading && !account.name && !account.email ? (
          <p className="px-4 py-6 text-sm text-text-muted sm:px-5">Loading profile…</p>
        ) : editingAccount ? (
          <form onSubmit={handleAccountSubmit} className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <div>
              <label className={labelClass} htmlFor="admin-profile-name">
                Name *
              </label>
              <input
                id="admin-profile-name"
                type="text"
                required
                value={accountForm.name}
                onChange={(e) =>
                  setAccountForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className={inputClass}
                placeholder="e.g. Rahul or John Smith"
                autoComplete="name"
              />
              <p className="mt-1 text-xs text-text-muted">1–2 words, letters only.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="admin-profile-email">
                Email *
              </label>
              <input
                id="admin-profile-email"
                type="email"
                required
                value={accountForm.email}
                onChange={(e) =>
                  setAccountForm((prev) => ({ ...prev, email: e.target.value }))
                }
                className={inputClass}
                autoComplete="email"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="admin-profile-phone">
                Phone *
              </label>
              <input
                id="admin-profile-phone"
                type="tel"
                required
                inputMode="numeric"
                pattern="[6789][0-9]{9}"
                maxLength={10}
                value={accountForm.phone}
                onChange={(e) =>
                  setAccountForm((prev) => ({
                    ...prev,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
                className={inputClass}
                autoComplete="tel"
                placeholder="10-digit mobile number"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={savingAccount} className={btnPrimary}>
                {savingAccount ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={handleCancelEditAccount}
                disabled={savingAccount}
                className={btnSecondary}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="px-4 pb-1 sm:px-5 sm:pb-2">
            <DetailRow label="Name" value={account.name} />
            <DetailRow label="Email" value={account.email} />
            <DetailRow label="Phone" value={account.phone} />
            <DetailRow label="Role">
              <span className="capitalize">{account.role}</span>
            </DetailRow>
            <DetailRow
              label="Member since"
              value={loading && !account.createdAt ? "…" : formatMemberSince(account.createdAt)}
            />
          </div>
        )}
      </div>

      <div className={cardClass}>
        <h3 className="mb-4 font-semibold text-text-primary">Change password</h3>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Current password *</label>
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className={labelClass}>New password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={labelClass}>Confirm new password *</label>
            <input
              type="password"
              required
              minLength={6}
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={savingPassword} className={btnPrimary}>
            {savingPassword ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>

      <div className={`${cardClass} flex flex-col gap-3 sm:flex-row`}>
        <a
          href={STORE_URL}
          target="_blank"
          rel="noreferrer"
          className={`${btnSecondary} gap-2`}
        >
          <IconExternalLink className="h-4 w-4" />
          Visit store
        </a>
        <button type="button" onClick={handleLogout} className={`${btnDanger} gap-2`}>
          <IconLogout className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default AdminProfileSection;
