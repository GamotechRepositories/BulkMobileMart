export const inputClass =
  "w-full rounded-lg border border-border-light bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30";

export const labelClass = "mb-1 block text-sm font-medium text-text-primary";

export const cardClass =
  "rounded-xl border border-border-light bg-white p-4 shadow-sm sm:p-5";

export const btnPrimary =
  "rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50";

export const btnDanger =
  "rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500";

export const btnSecondary =
  "rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-text-primary transition hover:border-primary hover:text-primary";

export const tableClass =
  "overflow-hidden rounded-xl border border-border-light bg-white";

export const compactTableClass = "w-full table-fixed text-left text-xs sm:text-sm";

export const thClass = "px-2 py-2.5 font-semibold sm:px-3 sm:py-3";

export const tdClass = "px-2 py-2 align-top sm:px-3 sm:py-2.5";

export const adminFilterCardClass =
  "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm";

export const adminFilterLabelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500";

export const adminFilterInputClass =
  "w-full min-w-0 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none";

export const adminTableWrapperClass =
  "mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm";

export const adminTableClass = "w-full table-fixed text-left text-sm";

export const adminTableHeaderClass = "bg-neutral-900 text-white";

export const adminThClass = "px-3 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide sm:px-4";

export const adminActionBtnClass =
  "rounded border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60";

export const adminTdClass = "px-3 py-4 align-middle sm:px-4";

export const parseList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
