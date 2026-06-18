import '../../models/cart_item.dart';
import '../../models/product.dart';
import '../../models/product_pricing_models.dart';

class BulkTier {
  const BulkTier({required this.qtyLabel, required this.price});

  final String qtyLabel;
  final double price;
}

List<BulkTier> getBulkTiers(double basePrice) {
  return [
    BulkTier(qtyLabel: '10 - 49', price: basePrice),
    BulkTier(
      qtyLabel: '50 - 99',
      price: (basePrice * 0.94 * 100).round() / 100,
    ),
    BulkTier(
      qtyLabel: '100+',
      price: (basePrice * 0.88 * 100).round() / 100,
    ),
  ];
}

const int defaultReviewCount = 128;

int getDecreasedCartQuantity(int currentQty, int step) {
  final moq = step < 1 ? 1 : step;
  if (currentQty <= moq) return 0;
  return currentQty - moq;
}

CartItem? findCartLine(
  List<CartItem> items,
  String productId,
  String variantName,
  String colorName,
) {
  final variant = variantName.trim();
  final color = colorName.trim();
  for (final item in items) {
    if (item.id != productId) continue;
    if (item.variantName.trim() != variant) continue;
    if (item.colorName.trim() != color) continue;
    return item;
  }
  return null;
}

List<ProductSpecification> getResolvedSpecifications(Product product) {
  final specs = product.specifications
      .where((spec) => spec.name.isNotEmpty && spec.value.isNotEmpty)
      .toList();
  if (specs.isNotEmpty) return specs;

  final fallback = <ProductSpecification>[];
  if (product.brandName.isNotEmpty) {
    fallback.add(ProductSpecification(name: 'Brand', value: product.brandName));
  }
  if (product.categories.isNotEmpty) {
    fallback.add(
      ProductSpecification(name: 'Category', value: product.categories.first),
    );
  }
  if (product.subcategory.isNotEmpty) {
    fallback.add(
      ProductSpecification(name: 'Subcategory', value: product.subcategory),
    );
  }
  if (product.warranty.isNotEmpty) {
    fallback.add(ProductSpecification(name: 'Warranty', value: product.warranty));
  }
  for (var i = 0; i < product.features.length; i++) {
    final feature = product.features[i].trim();
    if (feature.isNotEmpty) {
      fallback.add(ProductSpecification(name: 'Feature ${i + 1}', value: feature));
    }
  }
  return fallback;
}

String productSku(Product product) {
  final code = (product.subcategory.isNotEmpty
          ? product.subcategory
          : product.brandName)
      .replaceAll(RegExp(r'\s+'), '-')
      .toUpperCase();
  return 'BMM-$code';
}

enum ProductSortOption {
  defaultOrder('default', 'Default'),
  priceAsc('price-asc', 'Price: Low to High'),
  priceDesc('price-desc', 'Price: High to Low'),
  name('name', 'Name A-Z'),
  brand('brand', 'Brand');

  const ProductSortOption(this.id, this.label);

  final String id;
  final String label;

  static ProductSortOption? fromId(String? id) {
    if (id == null || id.isEmpty) return defaultOrder;
    for (final option in ProductSortOption.values) {
      if (option.id == id) return option;
    }
    return defaultOrder;
  }
}

List<Product> filterAndSortProducts({
  required List<Product> products,
  String? subcategory,
  String? brand,
  String? minPrice,
  String? maxPrice,
  ProductSortOption sort = ProductSortOption.defaultOrder,
}) {
  var list = products.where((product) {
    if (subcategory != null &&
        subcategory.isNotEmpty &&
        product.subcategory.toLowerCase() != subcategory.toLowerCase()) {
      return false;
    }
    if (brand != null &&
        brand.isNotEmpty &&
        product.brandName.toLowerCase() != brand.toLowerCase()) {
      return false;
    }
    final price = product.discountedPrice;
    final min = double.tryParse(minPrice ?? '');
    final max = double.tryParse(maxPrice ?? '');
    if (min != null && price < min) return false;
    if (max != null && price > max) return false;
    return true;
  }).toList();

  list = [...list];
  switch (sort) {
    case ProductSortOption.priceAsc:
      list.sort((a, b) => a.discountedPrice.compareTo(b.discountedPrice));
    case ProductSortOption.priceDesc:
      list.sort((a, b) => b.discountedPrice.compareTo(a.discountedPrice));
    case ProductSortOption.name:
      list.sort((a, b) => a.name.compareTo(b.name));
    case ProductSortOption.brand:
      list.sort((a, b) => a.brandName.compareTo(b.brandName));
    case ProductSortOption.defaultOrder:
      break;
  }
  return list;
}

List<String> extractBrands(List<Product> products) {
  final brands = products.map((p) => p.brandName).where((b) => b.isNotEmpty).toSet().toList();
  brands.sort();
  return brands;
}
