import 'product.dart';
import '../core/utils/json_parsers.dart';

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
  });

  final String id;
  final String name;
  final String brandName;
  final double price;
  final double discountedPrice;
  final List<String> productImages;
  final int stock;
  final int quantity;

  double get lineTotal => discountedPrice * quantity;

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
