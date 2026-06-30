const ACTIVE_PENDING_STATUSES = ["confirm", "processing", "shipping"];

export function getTodayDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildMonthlySales(orders, year) {
  const monthly = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    revenue: 0,
  }));

  orders.forEach((order) => {
    if (order.status === "cancelled") return;

    const date = new Date(order.createdAt);
    if (date.getFullYear() !== Number(year)) return;

    const monthIndex = date.getMonth();
    monthly[monthIndex].revenue += Number(order.total) || 0;
  });

  return monthly;
}

export function buildTodayStats(orders) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const todayOrders = orders.filter((order) => {
    const date = new Date(order.createdAt);
    return date >= start && date <= end;
  });

  return {
    orders: todayOrders.length,
    attempted: todayOrders.filter((order) => order.status === "attempted").length,
    pending: todayOrders.filter((order) => ACTIVE_PENDING_STATUSES.includes(order.status)).length,
    delivered: todayOrders.filter((order) => order.status === "delivered").length,
    cancelled: todayOrders.filter((order) => order.status === "cancelled").length,
  };
}

export function getRecentTodayOrders(orders, limit = 10) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return orders
    .filter((order) => {
      const date = new Date(order.createdAt);
      return date >= start && date <= end;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

export function getOrderYears(orders, currentYear) {
  const years = [
    ...new Set(
      orders.map((order) => new Date(order.createdAt).getFullYear()).filter(Boolean)
    ),
  ].sort((a, b) => b - a);

  if (!years.includes(currentYear)) {
    years.unshift(currentYear);
  }

  return years;
}
