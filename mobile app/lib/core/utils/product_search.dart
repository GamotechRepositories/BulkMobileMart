class ProductSearch {
  ProductSearch._();

  static String buildPath({
    String query = '',
    String categoryName = '',
    String subcategory = '',
    String brand = '',
    String minPrice = '',
    String maxPrice = '',
    String sort = '',
  }) {
    final params = <String, String>{};
    final q = query.trim();
    final category = categoryName.trim();
    final sub = subcategory.trim();

    if (q.isNotEmpty) params['q'] = q;
    if (category.isNotEmpty) params['categoryName'] = category;
    if (sub.isNotEmpty) params['subcategory'] = sub;
    if (brand.trim().isNotEmpty) params['brandName'] = brand.trim();
    if (minPrice.trim().isNotEmpty) params['minPrice'] = minPrice.trim();
    if (maxPrice.trim().isNotEmpty) params['maxPrice'] = maxPrice.trim();
    // Match website useProductListParams: always send sort except "default".
    final sortValue = sort.trim().isEmpty
        ? 'newest'
        : sort.trim();
    if (sortValue != 'default') {
      params['sort'] = sortValue;
    }

    if (params.isEmpty) return '/product';

    final queryString = params.entries
        .map((entry) => '${entry.key}=${Uri.encodeComponent(entry.value)}')
        .join('&');

    return '/product?$queryString';
  }
}
