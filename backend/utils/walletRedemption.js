export function getMaxRedeemablePoints(balance, orderTotal, limit = null, minimumOrderValue = 0) {
  if (Number(orderTotal) < Math.max(0, Number(minimumOrderValue) || 0)) return 0;
  const cap = limit == null ? Infinity : Math.max(0, Math.floor(Number(limit)) || 0);
  return Math.max(0, Math.min(Math.floor(balance), Math.floor(orderTotal), cap));
}
