import 'product.dart';
import 'product_pricing_models.dart';
import '../core/utils/json_parsers.dart';
import '../core/utils/product_pricing.dart';

class CartItem {
  const CartItem({
    required this.id,
    required this.name,
    required this.brandName,
    required this.price,
    required this.discountedPrice,
    required this.productImages,
    required this.stock,
    required this.quantity,
    this.variantName = '',
    this.colorName = '',
    this.pricingType = 'single',
    this.bulkPricing = const BulkPricing(),
    this.variantType = 'single',
    this.variants = const [],
  });

  final String id;
  final String name;
  final String brandName;
  final double price;
  final double discountedPrice;
  final List<String> productImages;
  final int stock;
  final int quantity;
  final String variantName;
  final String colorName;
  final String pricingType;
  final BulkPricing bulkPricing;
  final String variantType;
  final List<ProductVariant> variants;

  double get lineTotal => discountedPrice * quantity;

  int get quantityStep => getCartStepForCartItem(this);

  CartItem copyWith({int? quantity}) {
    return CartItem(
      id: id,
      name: name,
      brandName: brandName,
      price: price,
      discountedPrice: discountedPrice,
      productImages: productImages,
      stock: stock,
      quantity: quantity ?? this.quantity,
      variantName: variantName,
      colorName: colorName,
      pricingType: pricingType,
      bulkPricing: bulkPricing,
      variantType: variantType,
      variants: variants,
    );
  }

  factory CartItem.fromProduct(Product product, {required int quantity}) {
    return CartItem(
      id: product.id,
      name: product.name,
      brandName: product.brandName,
      price: product.price,
      discountedPrice: product.discountedPrice,
      productImages: product.productImages,
      stock: product.stock,
      quantity: quantity,
      variantName: '',
      colorName: '',
      pricingType: product.pricingType,
      bulkPricing: product.bulkPricing,
      variantType: product.variantType,
      variants: product.variants,
    );
  }

  factory CartItem.fromApiItem(Map<String, dynamic> json) {
    final product = json['product'];
    if (product is! Map<String, dynamic>) {
      throw const FormatException('Cart item missing product');
    }

    return CartItem(
      id: parseJsonId(product),
      name: product['name']?.toString() ?? '',
      brandName: product['brandName']?.toString() ?? '',
      price: _toDouble(product['price']),
      discountedPrice: _toDouble(product['discountedPrice']),
      productImages: (product['productImages'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      stock: _toInt(product['stock']),
      quantity: _toInt(json['quantity']),
      variantName: json['variantName']?.toString() ?? '',
      colorName: json['colorName']?.toString() ?? '',
      pricingType: product['pricingType']?.toString() ?? 'single',
      bulkPricing: BulkPricing.fromJson(product['bulkPricing']),
      variantType: product['variantType']?.toString() ?? 'single',
      variants: (product['variants'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductVariant.fromJson)
          .toList(),
    );
  }
}

int getCartStepForCartItem(CartItem item) {
  return getQuantityStep(
    Product(
      id: item.id,
      name: item.name,
      categories: const [],
      subcategory: '',
      brandName: item.brandName,
      price: item.price,
      discountedPrice: item.discountedPrice,
      discountedPercent: 0,
      stock: item.stock,
      productImages: item.productImages,
      pricingType: item.pricingType,
      bulkPricing: item.bulkPricing,
      variantType: item.variantType,
      variants: item.variants,
    ),
    item.variantName,
  );
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

int _toInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
