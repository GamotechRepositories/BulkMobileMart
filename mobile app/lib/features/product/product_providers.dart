import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/app_providers.dart';
import '../../models/product.dart';

final productListProvider =
    FutureProvider.family<List<Product>, ProductQuery>((ref, query) async {
  ref.keepAlive();
  final params = <String, dynamic>{'limit': 50};
  if (query.categoryName != null && query.categoryName!.isNotEmpty) {
    params['categoryName'] = query.categoryName;
  }
  if (query.search != null && query.search!.isNotEmpty) {
    params['q'] = query.search;
  }

  final products = await ref.read(apiServiceProvider).fetchProducts(params);
  return products.where((product) => product.isActive).toList();
});

final productDetailProvider =
    FutureProvider.family<Product, String>((ref, id) async {
  ref.keepAlive();
  return ref.read(apiServiceProvider).fetchProductById(id);
});

class ProductQuery {
  const ProductQuery({this.categoryName, this.search});

  final String? categoryName;
  final String? search;

  @override
  bool operator ==(Object other) {
    return other is ProductQuery &&
        other.categoryName == categoryName &&
        other.search == search;
  }

  @override
  int get hashCode => Object.hash(categoryName, search);
}
