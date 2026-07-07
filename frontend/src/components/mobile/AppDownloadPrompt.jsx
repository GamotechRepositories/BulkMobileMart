import { useEffect, useState } from "react";
import { LOGO_URL } from "../layout/Header";
import {
  dismissAppDownloadPrompt,
  downloadAndroidApp,
  hasDismissedAppDownloadPrompt,
  shouldOfferAppDownload,
} from "../../utils/appDownload";

function AppDownloadPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shouldOfferAppDownload() || hasDismissedAppDownloadPrompt()) return undefined;

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, []);

  const closePrompt = () => {
    dismissAppDownloadPrompt();
    setOpen(false);
  };

  const handleDownload = () => {
    downloadAndroidApp();
    closePrompt();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close app download popup"
        onClick={closePrompt}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={closePrompt}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="bg-gradient-to-br from-primary/10 via-white to-primary/5 px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/15 bg-white p-3 shadow-sm">
            <img src={LOGO_URL} alt="BulkMobileMart" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Get the BulkMobileMart App</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Download our Android app for faster ordering, easy tracking, and exclusive deals.
          </p>
        </div>

        <div className="space-y-2.5 px-6 pb-6">
          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m0 0l-2-2m2 2l2-2" />
            </svg>
            Download App
          </button>
          <button
            type="button"
            onClick={closePrompt}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-mobile-surface hover:text-text-primary"
          >
            Continue on website
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppDownloadPrompt;
