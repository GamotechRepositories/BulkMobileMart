export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const nonNegative = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

export function calculateDeliveryCharges({ baseShippingCharge = 0, orderValue = 0, advanceAmount, isCod = true, codChargePercentage = 2.5 } = {}) {
  const value = nonNegative(orderValue);
  const advance = advanceAmount == null ? roundMoney(value * 0.1) : nonNegative(advanceAmount);
  const codBalance = isCod ? roundMoney(Math.max(0, value - advance)) : 0;
  const codFee = roundMoney(codBalance * (Number(codChargePercentage ?? 2.5) / 100));
  const base = roundMoney(nonNegative(baseShippingCharge));
  return { baseShippingCharge: base, codBalance, codFee,
    deliveryCharges: roundMoney(base + codFee) };
}

export function getOrderProductBalance(order = {}) {
  return roundMoney(Math.max(0, (Number(order.subtotal) || 0) - (Number(order.couponDiscount) || 0) - (Number(order.walletDiscount) || 0)));
}

export function getVolumetricWeight({ length, width, height } = {}) {
  const dimensions = [length, width, height].map(Number);
  return dimensions.every((value) => Number.isFinite(value) && value > 0)
    ? dimensions.reduce((a, b) => a * b, 1) / 5000 : null;
}

// Missing prices must remain unknown rather than being interpreted as free shipping.
export function getEnviaLabelCharge(row = {}) {
  if (row.totalPrice == null || row.totalPrice === "") return null;
  const amount = Number(row.totalPrice);
  return Number.isFinite(amount) && amount >= 0 ? roundMoney(amount) : null;
}
