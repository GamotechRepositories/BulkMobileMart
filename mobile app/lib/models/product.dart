import '../core/utils/json_parsers.dart';
import 'product_pricing_models.dart';

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.categories,
    required this.subcategory,
    required this.brandName,
    required this.price,
    required this.discountedPrice,
    required this.discountedPercent,
    required this.stock,
    required this.productImages,
    this.ratings = 0,
    this.description = '',
    this.features = const [],
    this.warranty = '',
    this.isActive = true,
    this.variantType = 'single',
    this.variants = const [],
    this.pricingType = 'single',
    this.bulkPricing = const BulkPricing(),
    this.colors = const [],
    this.specifications = const [],
  });

  final String id;
  final String name;
  final List<String> categories;
  final String subcategory;
  final String brandName;
  final double price;
  final double discountedPrice;
  final double discountedPercent;
  final double ratings;
  final int stock;
  final List<String> productImages;
  final String description;
  final List<String> features;
  final String warranty;
  final bool isActive;
  final String variantType;
  final List<ProductVariant> variants;
  final String pricingType;
  final BulkPricing bulkPricing;
  final List<ProductColor> colors;
  final List<ProductSpecification> specifications;

  String? get primaryImage =>
      productImages.isNotEmpty ? productImages.first : null;

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: parseJsonId(json),
      name: json['name']?.toString() ?? '',
      categories: (json['categories'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      subcategory: json['subcategory']?.toString() ?? '',
      brandName: json['brandName']?.toString() ?? '',
      price: _toDouble(json['price']),
      discountedPrice: _toDouble(json['discountedPrice']),
      discountedPercent: _toDouble(json['discountedPercent']),
      ratings: _toDouble(json['ratings']),
      stock: _toInt(json['stock']),
      productImages: (json['productImages'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      description: json['description']?.toString() ?? '',
      features: (json['features'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      warranty: json['warranty']?.toString() ?? '',
      isActive: json['isActive'] as bool? ?? true,
      variantType: json['variantType']?.toString() ?? 'single',
      variants: (json['variants'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductVariant.fromJson)
          .toList(),
      pricingType: json['pricingType']?.toString() ?? 'single',
      bulkPricing: BulkPricing.fromJson(json['bulkPricing']),
      colors: (json['colors'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductColor.fromJson)
          .toList(),
      specifications: (json['specifications'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductSpecification.fromJson)
          .toList(),
    );
  }
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
