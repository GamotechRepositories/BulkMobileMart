export const GST_RATE = 0.18;
export const GST_PERCENT_LABEL = "18%";
export const GST_EXCLUDED_NOTE = "Prices exclude GST. GST is added at checkout.";

export function calculateGstAmount(subtotal) {
  const amount = Number(subtotal) || 0;
  return Math.round(amount * GST_RATE * 100) / 100;
}

export function calculateOrderTotal(subtotal, deliveryCharges = 0) {
  const normalizedSubtotal = Number(subtotal) || 0;
  const normalizedDelivery = Number(deliveryCharges) || 0;
  const gstAmount = calculateGstAmount(normalizedSubtotal);
  const total = normalizedSubtotal + normalizedDelivery + gstAmount;
  return {
    gstAmount,
    total: Math.round(total * 100) / 100,
  };
}

export function getOrderGstAmount(order) {
  const stored = Number(order?.gstAmount);
  if (Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  return calculateGstAmount(order?.subtotal);
}
