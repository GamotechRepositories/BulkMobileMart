import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";

const validateName = (value) => {
  const words = value.trim().split(/\s+/);
  if (words.length < 1 || words.length > 2) return false;
  return words.every((word) => /^[A-Za-z]{2,30}$/.test(word));
};
const PHONE_PATTERN = /^[6789]\d{9}$/;
const OTP_LENGTH = 6;

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

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-light-bg text-black text-sm py-2.5 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200";
const labelClass = "block text-sm font-semibold text-black mb-1.5";

function OtpInput({ value, onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || "");

  const focusInput = (index) => {
    inputsRef.current[index]?.focus();
  };

  const updateValue = (nextDigits) => {
    onChange(nextDigits.join("").slice(0, OTP_LENGTH));
  };

  const handleChange = (index, nextChar) => {
    if (!/^\d?$/.test(nextChar)) return;

    const nextDigits = [...digits];
    nextDigits[index] = nextChar;
    updateValue(nextDigits);

    if (nextChar && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] || "");
    updateValue(nextDigits);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event.target.value.slice(-1))}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          className="h-11 w-10 rounded-lg border border-gray-200 bg-light-bg text-center text-base font-semibold text-black focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-200 sm:h-12 sm:w-11"
        />
      ))}
    </div>
  );
}

function AuthModal({ mode, onClose, onSwitchMode }) {
  const { sendOtp, loginWithOtp, completeOtpSignupProfile } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("details");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";

  const resetFlow = () => {
    setStep("details");
    setOtp("");
    setError("");
  };

  const handleModeSwitch = (nextMode) => {
    resetFlow();
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
    resetFlow();
  }, [mode]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const validatePhoneStep = () => {
    if (isSignup && !validateName(name)) {
      return "Name must be 1 or 2 words, letters only (e.g. Rahul or John Smith)";
    }
    if (!PHONE_PATTERN.test(phone.trim())) {
      return "Phone must be 10 digits starting with 6, 7, 8, or 9";
    }
    return "";
  };

  const handleSendOtp = async () => {
    const validationError = validatePhoneStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await sendOtp(phone.trim());
      setStep("verify");
      setOtp("");
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Please enter the 6-digit OTP sent to your phone");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await loginWithOtp({
        phone: phone.trim(),
        otp: otp.trim(),
        ...(isSignup ? { name: name.trim() } : {}),
      });

      if (result?.needsSignup) {
        if (isSignup) {
          await completeOtpSignupProfile({
            phone: phone.trim(),
            name: name.trim(),
          });
          onClose();
          return;
        }

        setError("No account found with this number. Please sign up first.");
        return;
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "OTP verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle =
    step === "verify"
      ? `Enter the OTP sent to +91 ${phone}`
      : isSignup
        ? "Enter your name and phone number to create an account."
        : "Enter your phone number to sign in with OTP.";

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
        onClick={(event) => event.stopPropagation()}
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
          <p className="text-sm text-gray-500 mb-6">{subtitle}</p>

          <form
            onSubmit={step === "verify" ? handleVerifyOtp : (event) => event.preventDefault()}
            className="space-y-4"
          >
            {step === "details" ? (
              <>
                {isSignup && (
                  <div>
                    <label htmlFor="auth-name" className={labelClass}>
                      Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <UserIcon />
                      </span>
                      <input
                        id="auth-name"
                        type="text"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value);
                          setError("");
                        }}
                        placeholder="Rahul"
                        className={`${inputClass} pl-9 pr-3`}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="auth-phone" className={labelClass}>
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <PhoneIcon />
                    </span>
                    <input
                      id="auth-phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                        setError("");
                      }}
                      placeholder="9876543210"
                      maxLength={10}
                      className={`${inputClass} pl-9 pr-3`}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className={`${labelClass} text-center`}>Enter OTP</label>
                  <OtpInput value={otp} onChange={setOtp} disabled={submitting} />
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("details");
                      setOtp("");
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
              </>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {step === "details" ? (
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
                {submitting ? "Please wait..." : isSignup ? "Verify & Sign Up" : "Verify & Sign In"}
              </button>
            )}
          </form>

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
