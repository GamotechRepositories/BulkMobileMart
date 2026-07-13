export const INDIA_TZ = "Asia/Kolkata";
const INDIA_OFFSET = "+05:30";

export function formatIndiaDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: INDIA_TZ }).format(date);
}

export function parseIndiaDateOnly(value) {
  if (!value || typeof value !== "string") return null;
  const dateString = value.trim();
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day, dateString };
}

export function getIndiaDayStart(dateOnly) {
  const parsed = parseIndiaDateOnly(dateOnly);
  if (!parsed) return null;
  return new Date(`${parsed.dateString}T00:00:00${INDIA_OFFSET}`);
}

export function getIndiaDayEnd(dateOnly) {
  const parsed = parseIndiaDateOnly(dateOnly);
  if (!parsed) return null;
  return new Date(`${parsed.dateString}T23:59:59.999${INDIA_OFFSET}`);
}

export function getIndiaTodayRange() {
  const dateString = formatIndiaDateString();
  return {
    dateString,
    start: getIndiaDayStart(dateString),
    end: getIndiaDayEnd(dateString),
  };
}

export function getIndiaYesterdayRange() {
  const todayStart = getIndiaDayStart(formatIndiaDateString());
  const yesterdayEnd = new Date(todayStart.getTime() - 1);
  const dateString = formatIndiaDateString(yesterdayEnd);

  return {
    dateString,
    start: getIndiaDayStart(dateString),
    end: getIndiaDayEnd(dateString),
  };
}

export function shiftIndiaDateString(dateString, days) {
  const start = getIndiaDayStart(dateString);
  if (!start || !Number.isFinite(days)) return null;
  return formatIndiaDateString(new Date(start.getTime() + days * 24 * 60 * 60 * 1000));
}
