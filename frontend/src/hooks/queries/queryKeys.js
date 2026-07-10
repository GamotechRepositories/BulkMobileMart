export const queryKeys = {
  categories: {
    all: ["categories"],
  },
  brands: {
    all: ["brands"],
  },
  products: {
    list: (params) => ["products", params],
    hotSelling: ["products", "hot-selling"],
    recentlyViewed: (ids) => ["products", "recently-viewed", ids],
  },
};
