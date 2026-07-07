import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  requestAdminPasswordReset,
  resetAdminPassword,
} from "../api/api";
import { STORE_URL } from "../constants/brand";
import {
  btnPrimary,
  btnSecondary,
  cardClass,
  inputClass,
  labelClass,
} from "../components/admin/adminStyles";

function AdminLogin() {
  const { adminUser, loading, adminLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-neutral-500">
        Loading...
      </div>
    );
  }

  if (adminUser?.role === "admin") {
    return <Navigate to="/" replace />;
  }

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchToLogin = () => {
    resetMessages();
    setMode("login");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setPhoneHint("");
  };

  const switchToForgot = () => {
    resetMessages();
    setMode("forgot-request");
    setPassword("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setPhoneHint("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await adminLogin({ email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);

    try {
      const { data } = await requestAdminPasswordReset({ email: email.trim() });
      setPhoneHint(data.data?.phoneHint || "");
      setSuccess(data.message || "OTP sent to your registered phone number.");
      setMode("forgot-reset");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    resetMessages();

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await resetAdminPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setSuccess(data.message || "Password reset successfully.");
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setPhoneHint("");
      setMode("login");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className={`${cardClass} w-full max-w-md`}>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === "login" ? "Admin Login" : "Reset Password"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {mode === "login"
              ? "Sign in with an admin account to access the dashboard"
              : mode === "forgot-request"
                ? "Enter your admin email to receive an OTP on your registered phone"
                : "Enter the OTP and choose a new password"}
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        ) : null}

        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className={labelClass}>
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label htmlFor="admin-password" className={labelClass}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={switchToForgot}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        ) : null}

        {mode === "forgot-request" ? (
          <form onSubmit={handleSendResetOtp} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className={labelClass}>
                Admin email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
              {submitting ? "Sending OTP..." : "Send OTP"}
            </button>

            <button type="button" onClick={switchToLogin} className={`${btnSecondary} w-full`}>
              Back to login
            </button>
          </form>
        ) : null}

        {mode === "forgot-reset" ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {phoneHint ? (
              <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-text-secondary">
                OTP sent to {phoneHint}
              </p>
            ) : null}

            <div>
              <label htmlFor="reset-otp" className={labelClass}>
                OTP
              </label>
              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={8}
                className={inputClass}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter OTP from SMS"
              />
            </div>

            <div>
              <label htmlFor="reset-new-password" className={labelClass}>
                New password
              </label>
              <input
                id="reset-new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className={labelClass}>
                Confirm new password
              </label>
              <input
                id="reset-confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
              {submitting ? "Updating..." : "Reset password"}
            </button>

            <button
              type="button"
              onClick={() => {
                resetMessages();
                setMode("forgot-request");
              }}
              className={`${btnSecondary} w-full`}
            >
              Resend OTP
            </button>

            <button type="button" onClick={switchToLogin} className={`${btnSecondary} w-full`}>
              Back to login
            </button>
          </form>
        ) : null}

        <p className="mt-6 text-center text-sm text-text-muted">
          <a href={STORE_URL} className="text-primary hover:underline">
            Back to website
          </a>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
