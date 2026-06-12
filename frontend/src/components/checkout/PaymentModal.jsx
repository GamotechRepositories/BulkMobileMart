import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { uploadImageFile } from "../../api/api";
import { UPLOAD_FOLDERS } from "../../utils/uploadFolders";
import {
  getPayableAmount,
  getQrCodeImageUrl,
  openUpiAppChooser,
} from "../../utils/upiPayment";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

function PaymentModal({
  open,
  onClose,
  paymentMethod,
  orderTotal,
  onPayWithRazorpay,
  onSubmitUpiProof,
  processing,
  error = "",
}) {
  const [upiHint, setUpiHint] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [upiTransactionRef, setUpiTransactionRef] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const payableAmount = getPayableAmount(orderTotal, paymentMethod);
  const isCod = paymentMethod === "cod";
  const paymentNote = isCod ? "COD Advance" : "Order Payment";
  const qrUrl = getQrCodeImageUrl(payableAmount, paymentNote);

  const handlePayViaApp = () => {
    setUpiHint("");
    const openedOnMobile = openUpiAppChooser(payableAmount, paymentNote);

    if (!openedOnMobile) {
      setUpiHint("Open on your phone or scan the QR code.");
      return;
    }

    setUpiHint("Choose GPay, PhonePe, or Paytm.");
  };

  const processScreenshot = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image (JPG, PNG, WEBP)");
      return;
    }

    if (file.size > MAX_SCREENSHOT_BYTES) {
      setUploadError("Image must be under 5 MB");
      return;
    }

    setUploadingScreenshot(true);
    setUploadError("");

    try {
      const { data } = await uploadImageFile(file, UPLOAD_FOLDERS.PAYMENT_PROOFS);
      const url = data.data.url;
      setScreenshot({ name: file.name, url });
      setScreenshotPreview(url);
    } catch (err) {
      setUploadError(err.response?.data?.message || "Failed to upload screenshot");
      setScreenshot(null);
      setScreenshotPreview("");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleScreenshotChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) await processScreenshot(file);
    e.target.value = "";
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview("");
    setUploadError("");
  };

  const handleSubmitProof = async () => {
    if (!screenshot?.url) {
      setUploadError("Please upload your payment screenshot");
      return;
    }

    setUploadError("");
    await onSubmitUpiProof({
      screenshot: screenshot.url,
      screenshotName: screenshot.name,
      upiTransactionRef: upiTransactionRef.trim(),
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 sm:p-4"
      onClick={() => {
        if (!processing) onClose();
      }}
    >
      <div
        className="flex w-full max-w-[300px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-w-sm md:max-w-md"
        style={{ maxHeight: "min(88dvh, 560px)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-light px-3 py-2">
          <h2 id="payment-modal-title" className="text-sm font-bold text-text-primary">
            Complete Payment
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="rounded-md p-1 text-text-muted transition hover:bg-mobile-surface hover:text-text-primary disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
          <div className="space-y-2">
            {(error || uploadError) && (
              <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                {error || uploadError}
              </div>
            )}

            <div className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-center">
              <p className="text-[10px] font-medium text-text-secondary">
                {isCod ? "COD advance (10%)" : "Amount to pay"}
              </p>
              <p className="text-base font-bold text-primary">{formatPrice(payableAmount)}</p>
              {isCod && (
                <p className="text-[10px] text-text-secondary">
                  Total {formatPrice(orderTotal)} · Balance on delivery
                </p>
              )}
            </div>

            <div className="flex flex-col items-center rounded-lg border border-border-light p-2">
              <p className="text-[11px] font-semibold text-text-primary">Scan QR to pay</p>
              <div className="mt-1.5 rounded-md border border-border-light bg-white p-1">
                <img
                  src={qrUrl}
                  alt="UPI payment QR code"
                  className="h-24 w-24 object-contain sm:h-28 sm:w-28"
                />
              </div>
              <p className="mt-1 text-[10px] text-text-muted">Use any UPI app</p>
              <button
                type="button"
                disabled={processing}
                onClick={handlePayViaApp}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-[#25D366] py-1.5 text-[11px] font-bold text-white transition hover:bg-[#20bd5a] disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Pay via App
              </button>
              {upiHint && (
                <p className="mt-1 text-center text-[10px] leading-snug text-text-secondary">{upiHint}</p>
              )}
            </div>

            <div className="rounded-lg border border-border-light bg-mobile-surface/40 p-2">
              <p className="text-[11px] font-semibold text-text-primary">Upload screenshot</p>
              <p className="text-[10px] text-text-secondary">After payment, upload your UPI screenshot.</p>

              {screenshotPreview ? (
                <div className="mt-1.5">
                  <img
                    src={screenshotPreview}
                    alt="Payment screenshot preview"
                    className="max-h-16 w-full rounded-md border border-border-light object-contain bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveScreenshot}
                    disabled={processing}
                    className="mt-1 text-[10px] font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border-light bg-white px-2 py-1.5 transition hover:border-primary/40 hover:bg-orange-50/30">
                  <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-[11px] font-medium text-text-primary">
                  {uploadingScreenshot ? "Uploading..." : "Choose screenshot"}
                </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotChange}
                    disabled={processing || uploadingScreenshot}
                  />
                </label>
              )}

              <input
                id="upi-ref"
                type="text"
                value={upiTransactionRef}
                onChange={(e) => setUpiTransactionRef(e.target.value)}
                disabled={processing}
                placeholder="UPI Transaction ID (optional)"
                className="mt-1.5 w-full rounded-md border border-border-light px-2 py-1.5 text-[11px] outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 space-y-1.5 border-t border-border-light bg-white px-3 py-2">
          <button
            type="button"
            onClick={handleSubmitProof}
            disabled={processing || uploadingScreenshot || !screenshot}
            className="flex w-full items-center justify-center rounded-lg bg-primary py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {processing ? "Sending..." : "Send screenshot"}
          </button>

          <button
            type="button"
            onClick={onPayWithRazorpay}
            disabled={processing}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-primary bg-white py-1.5 text-[11px] font-semibold text-primary transition hover:bg-orange-50 disabled:opacity-60"
          >
            {processing ? "Processing..." : "Pay via Razorpay instead"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PaymentModal;
