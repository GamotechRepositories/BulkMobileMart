import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { uploadImageFile } from "../../api/api";
import { UPLOAD_FOLDERS } from "../../utils/uploadFolders";
import {
  buildMerchantUpiConfig,
  downloadQrCodeImage,
  getPayableAmount,
  getQrCodeImageUrl,
  getQrDownloadFilename,
  pickEnabledMerchantUpiAccounts,
} from "../../utils/upiPayment";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const safeTrim = (value) => String(value ?? "").trim();

function PaymentModal({
  open,
  onClose,
  paymentMethod,
  orderTotal,
  merchantUpiId = "",
  merchantUpiName = "",
  merchantUpiAccounts = [],
  onSubmitUpiProof,
  processing,
  error = "",
}) {
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [upiTransactionRef, setUpiTransactionRef] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [qrDownloadHint, setQrDownloadHint] = useState("");
  const [selectedUpiIndex, setSelectedUpiIndex] = useState(0);

  const payableAmount = getPayableAmount(orderTotal, paymentMethod);
  const isCod = paymentMethod === "cod";
  const paymentNote = isCod ? "COD Advance" : "Order Payment";
  const enabledUpiAccounts = useMemo(
    () =>
      pickEnabledMerchantUpiAccounts({
        merchantUpiAccounts,
        merchantUpiId,
        merchantUpiName,
      }),
    [merchantUpiAccounts, merchantUpiId, merchantUpiName]
  );
  const selectedUpiAccount =
    enabledUpiAccounts[selectedUpiIndex] || enabledUpiAccounts[0] || null;
  const upiConfig = useMemo(
    () => buildMerchantUpiConfig(selectedUpiAccount),
    [selectedUpiAccount]
  );
  const qrUrl = getQrCodeImageUrl(payableAmount, paymentNote, upiConfig);
  const hasUpiId = Boolean(upiConfig.upiId);

  useEffect(() => {
    if (!open) {
      setScreenshot(null);
      setScreenshotPreview("");
      setUpiTransactionRef("");
      setUploadError("");
      setDownloadingQr(false);
      setQrDownloadHint("");
      setSelectedUpiIndex(0);
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (selectedUpiIndex >= enabledUpiAccounts.length) {
      setSelectedUpiIndex(0);
    }
  }, [enabledUpiAccounts.length, selectedUpiIndex]);

  if (!open) return null;

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

  const handleDownloadQr = async () => {
    if (!hasUpiId || !qrUrl || downloadingQr) return;

    setDownloadingQr(true);
    setQrDownloadHint("");

    const saved = await downloadQrCodeImage(qrUrl, getQrDownloadFilename(payableAmount));
    setDownloadingQr(false);
    setQrDownloadHint(
      saved
        ? "QR code downloaded."
        : "Could not download automatically. QR opened in a new tab — save it from there."
    );
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
      upiTransactionRef: safeTrim(upiTransactionRef),
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

            {!hasUpiId && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                UPI payment is not configured yet. Please contact the store admin.
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

              {enabledUpiAccounts.length > 1 ? (
                <div className="mt-2 w-full">
                  <p className="mb-1.5 text-left text-[10px] font-medium text-text-secondary">
                    Select UPI ID
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledUpiAccounts.map((account, index) => (
                      <button
                        key={`${account.upiId}-${index}`}
                        type="button"
                        onClick={() => setSelectedUpiIndex(index)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                          selectedUpiIndex === index
                            ? "border-primary bg-orange-50 text-primary"
                            : "border-border-light bg-white text-text-secondary"
                        }`}
                      >
                        {account.upiId}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {hasUpiId ? (
                <div className="mt-1.5 rounded-md border border-border-light bg-white p-1">
                  <img
                    src={qrUrl}
                    alt="UPI payment QR code"
                    className="h-24 w-24 object-contain sm:h-28 sm:w-28"
                  />
                </div>
              ) : (
                <div className="mt-1.5 flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-border-light bg-mobile-surface text-center text-[10px] text-text-muted sm:h-28 sm:w-28">
                  QR unavailable
                </div>
              )}
              {hasUpiId && upiConfig.upiId ? (
                <p className="mt-1 text-[10px] text-text-muted">Pay to: {upiConfig.upiId}</p>
              ) : null}

              {hasUpiId && qrUrl ? (
                <button
                  type="button"
                  disabled={processing || downloadingQr}
                  onClick={handleDownloadQr}
                  className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-border-light bg-white px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:border-primary/40 hover:bg-orange-50 disabled:opacity-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  {downloadingQr ? "Downloading..." : "Download QR"}
                </button>
              ) : null}

              {qrDownloadHint ? (
                <p className="mt-1.5 text-center text-[10px] leading-snug text-text-secondary">{qrDownloadHint}</p>
              ) : null}

              <p className="mt-3 text-center text-[10px] text-text-muted">
                Scan the QR code or download it to pay, then upload your payment screenshot below.
              </p>
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
            disabled={processing || uploadingScreenshot || !screenshot || !hasUpiId}
            className="flex w-full items-center justify-center rounded-lg bg-primary py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {processing ? "Confirming order..." : "Confirm order"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PaymentModal;
