const DELIVERED_STATUS = "delivered";
const ORDERS_PAGE_LIMIT = 500;

export function aggregateDeliveredOrders(orders) {
  let totalOrders = 0;
  let totalRevenue = 0;

  for (const order of orders) {
    if (order?.status !== DELIVERED_STATUS) continue;
    totalOrders += 1;
    totalRevenue += Number(order.total) || 0;
  }

  return {
    totalOrders,
    totalRevenue,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
  };
}

/** Delivered-order totals for the given users (frontend-only; scans admin delivered orders). */
export async function buildDeliveredMetricsForUsers(getAdminOrders, users) {
  const list = Array.isArray(users) ? users : [];
  if (!list.length) return {};

  const idSet = new Set(list.map((user) => String(user._id)));
  const agg = {};
  for (const id of idSet) {
    agg[id] = { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 };
  }

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { data } = await getAdminOrders({
      status: DELIVERED_STATUS,
      page,
      limit: ORDERS_PAGE_LIMIT,
    });

    const orders = data?.data || [];
    totalPages = data?.pagination?.totalPages ?? 1;

    for (const order of orders) {
      if (order?.status !== DELIVERED_STATUS) continue;
      const userId = String(order.user?._id ?? order.user ?? "");
      if (!idSet.has(userId)) continue;
      agg[userId].totalOrders += 1;
      agg[userId].totalRevenue += Number(order.total) || 0;
    }

    page += 1;
  }

  for (const id of idSet) {
    const row = agg[id];
    row.averageOrderValue = row.totalOrders > 0 ? row.totalRevenue / row.totalOrders : 0;
  }

  return agg;
}

export function mergeDeliveredStatsWithWallet(apiStats, deliveredMetrics) {
  const delivered = deliveredMetrics || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  };

  return {
    ...apiStats,
    totalOrders: delivered.totalOrders,
    totalRevenue: delivered.totalRevenue,
    averageOrderValue: delivered.averageOrderValue,
  };
}
