import { useQuery } from "@tanstack/react-query";
import { getAllProducts } from "../../api/api";
import { adminQueryKeys } from "./queryKeys";

export function useAdminProductsQuery(params, options = {}) {
  return useQuery({
    queryKey: adminQueryKeys.products.list(params),
    queryFn: async () => {
      const { data } = await getAllProducts(params);
      return {
        items: data.data || [],
        pagination: data.pagination || null,
      };
    },
    ...options,
  });
}
