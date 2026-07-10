import { useQuery } from "@tanstack/react-query";
import { getAdminOrders } from "../../api/api";
import { adminQueryKeys } from "./queryKeys";

export function useAdminOrdersQuery(params, options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.orders.list(params),
    queryFn: async () => {
      const { data } = await getAdminOrders(params);
      return {
        items: data.data || [],
        pagination: data.pagination || null,
      };
    },
    ...options,
  });
}
