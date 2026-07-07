export function getDefaultCodCollectAmount(order = {}) {
  const total = Number(order.total) || 0;
  const advance = Number(order.codAdvanceAmount) || 0;
  const remaining = Math.max(0, total - advance);
  return remaining > 0 ? remaining : total;
}

export function isOrderPrepaidShipment(order = {}) {
  return String(order.paymentStatus || "unpaid") === "paid";
}

/**
 * COD shipment when balance is still collected on delivery:
 * - paid_10: customer paid 10% advance, collect remainder on delivery
 * - unpaid + cod payment method: collect full amount on delivery
 *
 * Prepaid shipment when the order is fully paid (paymentStatus === "paid").
 */
export function isOrderCodPayment(order = {}) {
  const status = String(order.paymentStatus || "unpaid");

  if (status === "paid") {
    return false;
  }

  if (status === "paid_10") {
    return true;
  }

  return order.paymentMethod === "cod";
}

export function parseIsCodFlag(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return undefined;
}

export function resolveShipmentPaymentOptions(order = {}, body = {}) {
  if (isOrderPrepaidShipment(order)) {
    return { isCod: false, codAmount: undefined };
  }

  const explicitIsCod = parseIsCodFlag(body.isCod);
  const isCod = explicitIsCod !== undefined ? explicitIsCod : isOrderCodPayment(order);

  if (!isCod) {
    return { isCod: false, codAmount: undefined };
  }

  const parsedAmount = Number(body.codAmount);
  const codAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? parsedAmount
      : getDefaultCodCollectAmount(order);

  return { isCod: true, codAmount };
}

export function buildEnviaCodAdditionalServices({ isCod = false, codAmount = 0 } = {}) {
  if (!isCod) {
    return null;
  }

  const amount = Number(codAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return [
    {
      service: "cash_on_delivery",
      data: {
        amount: String(amount),
      },
    },
  ];
}
