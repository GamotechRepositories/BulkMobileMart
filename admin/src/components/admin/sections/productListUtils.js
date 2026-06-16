const SORT_GETTERS = {
  name: (product) => product.name?.toLowerCase() || "",
  price: (product) => Number(product.discountedPrice) || 0,
  stock: (product) => (product.inStock !== false ? 1 : 0),
  brand: (product) => product.brandName?.toLowerCase() || "",
};

export function filterAndSortProducts(products, { selectedCategory, searchQuery, sortBy, sortDir }) {
  let result = [...products];

  if (selectedCategory !== "all") {
    result = result.filter((product) => product.categories?.includes(selectedCategory));
  }

  const query = searchQuery.trim().toLowerCase();
  if (query) {
    result = result.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const brand = product.brandName?.toLowerCase() || "";
      const subcategories = [
        ...(Array.isArray(product.subcategories) ? product.subcategories : []),
        product.subcategory,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const categories = (product.categories || []).join(" ").toLowerCase();

      return (
        name.includes(query) ||
        brand.includes(query) ||
        subcategories.includes(query) ||
        categories.includes(query)
      );
    });
  }

  const getValue = SORT_GETTERS[sortBy] || SORT_GETTERS.name;

  result.sort((a, b) => {
    const valueA = getValue(a);
    const valueB = getValue(b);

    if (valueA < valueB) return sortDir === "asc" ? -1 : 1;
    if (valueA > valueB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return result;
}
