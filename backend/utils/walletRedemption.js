export function getMaxRedeemablePoints(balance, orderTotal, limit = null) {
  const cap = limit == null ? Infinity : Math.max(0, Math.floor(Number(limit)) || 0);
  return Math.max(0, Math.min(Math.floor(balance), Math.floor(orderTotal), cap));
}
