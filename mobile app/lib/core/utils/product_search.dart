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
    if (brand.trim().isNotEmpty) params['brand'] = brand.trim();
    if (minPrice.trim().isNotEmpty) params['minPrice'] = minPrice.trim();
    if (maxPrice.trim().isNotEmpty) params['maxPrice'] = maxPrice.trim();
    if (sort.trim().isNotEmpty && sort != 'default') params['sort'] = sort.trim();

    if (params.isEmpty) return '/product';

    final queryString = params.entries
        .map((entry) => '${entry.key}=${Uri.encodeComponent(entry.value)}')
        .join('&');

    return '/product?$queryString';
  }
}
