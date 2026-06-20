export const ADVANCE_PAYMENT_PERCENT = 0.1;

export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PAID_10: "paid_10",
  PAID: "paid",
  REFUNDABLE: "refundable",
  PENDING_VERIFICATION: "pending_verification",
};

export const ADMIN_PAYMENT_STATUSES = [
  PAYMENT_STATUS.UNPAID,
  PAYMENT_STATUS.PAID_10,
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.REFUNDABLE,
  PAYMENT_STATUS.PENDING_VERIFICATION,
];

export function calculateAdvanceAmount(total) {
  const amount = Number(total) || 0;
  return Math.round(amount * ADVANCE_PAYMENT_PERCENT * 100) / 100;
}

export function calculatePayableAmount(total, paymentMode) {
  const amount = Number(total) || 0;
  if (paymentMode === "cod_advance") {
    return calculateAdvanceAmount(amount);
  }
  return Math.round(amount * 100) / 100;
}
