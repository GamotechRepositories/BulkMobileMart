import { useCallback, useEffect, useState } from "react";
import { changeAdminPassword, getAdminProfile } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import { btnPrimary, cardClass, inputClass, labelClass } from "../adminStyles";

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-neutral-100 py-3 last:border-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="text-sm font-semibold text-neutral-900 break-all">{value}</p>
    </div>
  );
}

function AdminProfileSection() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getAdminProfile();
      setProfile(data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    try {
      setSaving(true);
      const { data } = await changeAdminPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess(data.message || "Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading admin profile...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminAlert error={error} success={success} onClear={() => setError("")} />

      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-neutral-900">Admin Account</h2>
        <p className="mt-1 text-sm text-neutral-500">Your login credentials and account details.</p>

        <div className="mt-5">
          <DetailRow label="Name" value={profile?.name || "—"} />
          <DetailRow label="Email" value={profile?.email || "—"} />
          <DetailRow label="Phone" value={profile?.phone || "—"} />
          <DetailRow label="Role" value={profile?.role === "admin" ? "Administrator" : profile?.role || "—"} />
          <DetailRow label="Password" value="••••••••" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Change Password</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Enter your current password, then choose a new one.
          </p>
        </div>

        <div>
          <label htmlFor="currentPassword" className={labelClass}>
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            name="currentPassword"
            value={passwordForm.currentPassword}
            onChange={handlePasswordChange}
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="newPassword" className={labelClass}>
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className={btnPrimary}>
          {saving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default AdminProfileSection;
