class BulkPricingSlab {
  const BulkPricingSlab({
    required this.minQuantity,
    this.maxQuantity,
    required this.pricePerUnit,
  });

  final int minQuantity;
  final int? maxQuantity;
  final double pricePerUnit;

  factory BulkPricingSlab.fromJson(Map<String, dynamic> json) {
    return BulkPricingSlab(
      minQuantity: _toInt(json['minQuantity'], fallback: 1),
      maxQuantity: json['maxQuantity'] == null
          ? null
          : _toInt(json['maxQuantity'], fallback: 1),
      pricePerUnit: _toDouble(json['pricePerUnit']),
    );
  }
}

class BulkPricing {
  const BulkPricing({this.minOrderQuantity, this.slabs = const []});

  final int? minOrderQuantity;
  final List<BulkPricingSlab> slabs;

  factory BulkPricing.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) return const BulkPricing();
    return BulkPricing(
      minOrderQuantity: json['minOrderQuantity'] == null
          ? null
          : _toInt(json['minOrderQuantity'], fallback: 1),
      slabs: (json['slabs'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(BulkPricingSlab.fromJson)
          .toList(),
    );
  }
}

class ProductColor {
  const ProductColor({required this.name, this.hex = '#cccccc'});

  final String name;
  final String hex;

  factory ProductColor.fromJson(Map<String, dynamic> json) {
    return ProductColor(
      name: json['name']?.toString() ?? '',
      hex: json['hex']?.toString() ?? '#cccccc',
    );
  }
}

class ProductSpecification {
  const ProductSpecification({required this.name, required this.value});

  final String name;
  final String value;

  factory ProductSpecification.fromJson(Map<String, dynamic> json) {
    return ProductSpecification(
      name: json['name']?.toString() ?? '',
      value: json['value']?.toString() ?? '',
    );
  }
}

class ProductVariant {
  const ProductVariant({
    required this.name,
    this.pricingType = 'single',
    this.bulkPricing = const BulkPricing(),
    this.price = 0,
    this.discountedPrice = 0,
    this.stock = 0,
    this.colors = const [],
  });

  final String name;
  final String pricingType;
  final BulkPricing bulkPricing;
  final double price;
  final double discountedPrice;
  final int stock;
  final List<ProductColor> colors;

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      name: json['name']?.toString() ?? '',
      pricingType: json['pricingType']?.toString() ?? 'single',
      bulkPricing: BulkPricing.fromJson(json['bulkPricing']),
      price: _toDouble(json['price']),
      discountedPrice: _toDouble(json['discountedPrice']),
      stock: _toInt(json['stock']),
      colors: (json['colors'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductColor.fromJson)
          .toList(),
    );
  }
}

double _toDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

int _toInt(dynamic value, {int fallback = 0}) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}
