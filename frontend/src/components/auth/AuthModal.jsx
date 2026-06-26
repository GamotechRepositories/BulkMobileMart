import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";

const validateName = (value) => {
  const words = value.trim().split(/\s+/);
  if (words.length < 1 || words.length > 2) return false;
  return words.every((word) => /^[A-Za-z]{2,30}$/.test(word));
};
const PHONE_PATTERN = /^[6789]\d{9}$/;

function EnvelopeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-light-bg text-black text-sm py-2.5 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200";
const labelClass = "block text-sm font-semibold text-black mb-1.5";

function AuthModal({ mode, onClose, onSwitchMode }) {
  const { signup, login, sendOtp, loginWithOtp, completeOtpSignupProfile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [otpForm, setOtpForm] = useState({
    phone: "",
    otp: "",
    name: "",
    email: "",
  });
  const [loginMethod, setLoginMethod] = useState("password");
  const [otpStep, setOtpStep] = useState("phone");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const isSignup = mode === "signup";

  const handleModeSwitch = (nextMode) => {
    setError("");
    setLoginMethod("password");
    setOtpStep("phone");
    onSwitchMode(nextMode);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleOtpChange = (e) => {
    const { name, value } = e.target;
    setOtpForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSendOtp = async () => {
    if (!PHONE_PATTERN.test(otpForm.phone.trim())) {
      setError("Phone must be 10 digits starting with 6, 7, 8, or 9");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await sendOtp(otpForm.phone.trim());
      setOtpStep("verify");
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!/^\d{4,8}$/.test(otpForm.otp.trim())) {
      setError("Please enter the OTP sent to your phone");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await loginWithOtp({
        phone: otpForm.phone.trim(),
        otp: otpForm.otp.trim(),
      });

      if (result?.needsSignup) {
        setOtpStep("signup");
        return;
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "OTP verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteOtpSignup = async (e) => {
    e.preventDefault();

    if (!validateName(otpForm.name)) {
      setError("Name must be 1 or 2 words, letters only (e.g. Rahul or John Smith)");
      return;
    }
    if (!otpForm.email.trim()) {
      setError("Email is required to complete sign up");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await completeOtpSignupProfile({
        phone: otpForm.phone.trim(),
        name: otpForm.name.trim(),
        email: otpForm.email.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not complete sign up.");
    } finally {
      setSubmitting(false);
    }
  };

  const validate = () => {
    if (isSignup) {
      if (!validateName(form.name)) {
        return "Name must be 1 or 2 words, letters only (e.g. Rahul or John Smith)";
      }
      if (!PHONE_PATTERN.test(form.phone.trim())) {
        return "Phone must be 10 digits starting with 6, 7, 8, or 9";
      }
    }
    if (!form.email.trim()) return "Email is required";
    if (!form.password) return "Password is required";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (isSignup) {
        await signup({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        });
      } else {
        await login({
          email: form.email.trim(),
          password: form.password,
        });
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-[400px] my-auto rounded-xl sm:rounded-2xl bg-light-bg text-black shadow-2xl mx-2 sm:mx-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none transition"
          aria-label="Close"
        >
          &times;
        </button>

        <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6">
          <h2 id="auth-modal-title" className="text-xl sm:text-2xl font-bold text-black mb-1 pr-8">
            {isSignup ? "Sign Up" : "Login"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isSignup
              ? "Create your account to get started."
              : loginMethod === "otp"
                ? otpStep === "signup"
                  ? "Complete your profile to finish sign up."
                  : "Sign in securely with a one-time password on your phone."
                : "Enter your credentials to access your account."}
          </p>

          {!isSignup && (
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("password");
                  setOtpStep("phone");
                  setError("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === "password"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("otp");
                  setOtpStep("phone");
                  setError("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === "otp"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500"
                }`}
              >
                OTP
              </button>
            </div>
          )}

          {!isSignup && loginMethod === "otp" ? (
            <form
              onSubmit={otpStep === "signup" ? handleCompleteOtpSignup : handleVerifyOtp}
              className="space-y-4"
            >
              {otpStep === "phone" ? (
                <div>
                  <label htmlFor="otp-phone" className={labelClass}>
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <PhoneIcon />
                    </span>
                    <input
                      id="otp-phone"
                      name="phone"
                      type="tel"
                      value={otpForm.phone}
                      onChange={handleOtpChange}
                      placeholder="9876543210"
                      maxLength={10}
                      className={`${inputClass} pl-9 pr-3`}
                      required
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="otp-code" className={labelClass}>
                      Enter OTP
                    </label>
                    <input
                      id="otp-code"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otpForm.otp}
                      onChange={handleOtpChange}
                      placeholder="6-digit OTP"
                      maxLength={6}
                      className={`${inputClass} px-4 tracking-[0.3em]`}
                      required
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      OTP sent to +91 {otpForm.phone}
                    </p>
                  </div>

                  {otpStep === "signup" && (
                    <>
                      <div>
                        <label htmlFor="otp-name" className={labelClass}>
                          Name
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <UserIcon />
                          </span>
                          <input
                            id="otp-name"
                            name="name"
                            type="text"
                            value={otpForm.name}
                            onChange={handleOtpChange}
                            placeholder="Rahul"
                            className={`${inputClass} pl-9 pr-3`}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="otp-email" className={labelClass}>
                          Email Address
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <EnvelopeIcon />
                          </span>
                          <input
                            id="otp-email"
                            name="email"
                            type="email"
                            value={otpForm.email}
                            onChange={handleOtpChange}
                            placeholder="Enter your email"
                            className={`${inputClass} pl-10 pr-4`}
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {otpStep !== "signup" && (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep("phone");
                          setOtpForm((prev) => ({ ...prev, otp: "" }));
                          setError("");
                        }}
                        className="font-medium text-accent hover:underline"
                      >
                        Change number
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={submitting || resendCooldown > 0}
                        className="font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                      </button>
                    </div>
                  )}
                </>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {otpStep === "phone" ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={submitting}
                  className="w-full rounded-lg bg-accent text-white py-3 text-sm font-bold tracking-wide uppercase hover:brightness-110 transition disabled:opacity-60"
                >
                  {submitting ? "Sending OTP..." : "Send OTP"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-accent text-white py-3 text-sm font-bold tracking-wide uppercase hover:brightness-110 transition disabled:opacity-60"
                >
                  {submitting
                    ? "Please wait..."
                    : otpStep === "signup"
                      ? "Complete Sign Up"
                      : "Verify & Sign In"}
                </button>
              )}
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="name" className={labelClass}>
                    Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <UserIcon />
                    </span>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Rahul"
                      className={`${inputClass} pl-9 pr-3`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Phone
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <PhoneIcon />
                    </span>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="9876543210"
                      maxLength={10}
                      className={`${inputClass} pl-9 pr-3`}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <EnvelopeIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className={`${inputClass} pl-10 pr-4`}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`${inputClass} pl-10 pr-10`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {!isSignup && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-accent cursor-pointer"
                  />
                  <span className="text-sm text-black">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-accent text-white py-3 text-sm font-bold tracking-wide uppercase hover:brightness-110 transition disabled:opacity-60"
            >
              {submitting ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
            </button>
          </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-5">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleModeSwitch("login")}
                  className="font-semibold text-accent hover:underline"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => handleModeSwitch("signup")}
                  className="font-semibold text-accent hover:underline"
                >
                  Sign Up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AuthModal;
