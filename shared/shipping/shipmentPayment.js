export function getDefaultCodCollectAmount(order = {}) {
  const total = Number(order.total) || 0;
  const advance = Number(order.codAdvanceAmount) || 0;
  const remaining = Math.max(0, total - advance);
  return remaining > 0 ? remaining : total;
}

export function isOrderCodPayment(order = {}) {
  return order.paymentMethod === "cod";
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
