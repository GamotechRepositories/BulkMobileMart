import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../../api/api";
import { getRecentlyViewedIds } from "../../utils/recentlyViewed";
import { queryKeys } from "./queryKeys";

const HOME_PRODUCT_LIMIT = 12;

export function useProductsQuery(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => {
      const { data } = await getProducts(params);
      return data.data || [];
    },
    ...options,
  });
}

export function useHotSellingProductsQuery(options = {}) {
  return useQuery({
    queryKey: queryKeys.products.hotSelling,
    queryFn: async () => {
      const { data } = await getProducts({
        hotSelling: true,
        limit: HOME_PRODUCT_LIMIT,
      });
      return (data.data || []).slice(0, HOME_PRODUCT_LIMIT);
    },
    staleTime: 3 * 60 * 1000,
    ...options,
  });
}

export function useRecentlyViewedProductsQuery(options = {}) {
  const ids = getRecentlyViewedIds().slice(0, HOME_PRODUCT_LIMIT);

  return useQuery({
    queryKey: queryKeys.products.recentlyViewed(ids),
    queryFn: async () => {
      if (!ids.length) return [];

      const { data } = await getProducts({
        ids: ids.join(","),
        limit: HOME_PRODUCT_LIMIT,
      });
      const fetched = data.data || [];
      const byId = new Map(fetched.map((product) => [String(product._id), product]));

      return ids
        .map((id) => byId.get(String(id)))
        .filter(Boolean)
        .slice(0, HOME_PRODUCT_LIMIT);
    },
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
    ...options,
  });
}
