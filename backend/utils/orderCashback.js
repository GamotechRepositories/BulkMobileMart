/** Cashback uses the full order total and the wallet's whole-point precision. */
export function calculateOrderCashback(orderTotal, percentage, threshold = 0) {
  const total = Number(orderTotal);
  const rate = Number(percentage);
  const minimum = Number(threshold);
  if (!Number.isFinite(total) || !Number.isFinite(rate) || !Number.isFinite(minimum)
    || total <= 0 || rate <= 0 || rate > 100 || total < minimum) return 0;
  return Math.round(total * rate / 100);
}
