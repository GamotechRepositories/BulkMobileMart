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
  "overflow-x-auto rounded-xl border border-border-light bg-white";

export const parseList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
