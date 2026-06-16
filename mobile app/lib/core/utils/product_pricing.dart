import '../../models/product.dart';
import '../../models/product_pricing_models.dart';

const int defaultSingleMoq = 1;

class PricingSource {
  const PricingSource({
    required this.pricingType,
    required this.bulkPricing,
    required this.price,
    required this.discountedPrice,
  });

  final String pricingType;
  final BulkPricing bulkPricing;
  final double price;
  final double discountedPrice;
}

class BulkTierRow {
  const BulkTierRow({
    required this.key,
    required this.qtyLabel,
    required this.price,
  });

  final String key;
  final String qtyLabel;
  final double price;
}

class CartDefaults {
  const CartDefaults({
    required this.variantName,
    required this.colorName,
    required this.quantity,
  });

  final String variantName;
  final String colorName;
  final int quantity;
}

bool isMultiVariant(Product product) {
  return product.variantType == 'multi' &&
      product.variants.isNotEmpty;
}

ProductVariant? getVariant(Product product, String variantName) {
  if (!isMultiVariant(product) || variantName.trim().isEmpty) {
    return null;
  }
  final target = variantName.trim().toLowerCase();
  for (final variant in product.variants) {
    if (variant.name.trim().toLowerCase() == target) {
      return variant;
    }
  }
  return null;
}

int getVariantStock(Product product, [String variantName = '']) {
  if (isMultiVariant(product)) {
    return getVariant(product, variantName)?.stock ?? 0;
  }
  return product.stock;
}

List<ProductColor> getAvailableColors(Product product, [String variantName = '']) {
  if (isMultiVariant(product)) {
    return getVariant(product, variantName)?.colors ?? const [];
  }
  return product.colors;
}

PricingSource? getPricingSource(Product product, [String variantName = '']) {
  if (isMultiVariant(product)) {
    final variant = getVariant(product, variantName);
    if (variant == null) return null;
    return PricingSource(
      pricingType: variant.pricingType,
      bulkPricing: variant.bulkPricing,
      price: variant.price,
      discountedPrice: variant.discountedPrice,
    );
  }

  return PricingSource(
    pricingType: product.pricingType,
    bulkPricing: product.bulkPricing,
    price: product.price,
    discountedPrice: product.discountedPrice,
  );
}

double getUnitPriceForQuantity(
  Product product,
  int quantity, [
  String variantName = '',
]) {
  if (quantity < 1) return 0;

  final source = getPricingSource(product, variantName);
  if (source == null) return 0;

  if (source.pricingType == 'bulk' && source.bulkPricing.slabs.isNotEmpty) {
    final slabs = [...source.bulkPricing.slabs]
      ..sort((a, b) => a.minQuantity.compareTo(b.minQuantity));

    for (var i = slabs.length - 1; i >= 0; i--) {
      final slab = slabs[i];
      final inRange = quantity >= slab.minQuantity &&
          (slab.maxQuantity == null || quantity <= slab.maxQuantity!);
      if (inRange) return slab.pricePerUnit;
    }

    return slabs.last.pricePerUnit;
  }

  return source.discountedPrice > 0 ? source.discountedPrice : source.price;
}

int getMinOrderQuantity(
  Product product, [
  String variantName = '',
  int fallback = defaultSingleMoq,
]) {
  final source = getPricingSource(product, variantName);
  if (source == null) return fallback;

  if (source.pricingType == 'bulk' &&
      source.bulkPricing.minOrderQuantity != null &&
      source.bulkPricing.minOrderQuantity! > 0) {
    return source.bulkPricing.minOrderQuantity!;
  }

  return fallback;
}

double getDisplayPriceForSource(PricingSource source) {
  if (source.pricingType == 'bulk' && source.bulkPricing.slabs.isNotEmpty) {
    return source.bulkPricing.slabs
        .map((slab) => slab.pricePerUnit)
        .reduce((a, b) => a < b ? a : b);
  }

  return source.discountedPrice > 0 ? source.discountedPrice : source.price;
}

double getDisplayPrice(Product product, [String variantName = '']) {
  if (isMultiVariant(product) && variantName.trim().isEmpty) {
    final prices = product.variants
        .map(
          (variant) => getDisplayPriceForSource(
            PricingSource(
              pricingType: variant.pricingType,
              bulkPricing: variant.bulkPricing,
              price: variant.price,
              discountedPrice: variant.discountedPrice,
            ),
          ),
        )
        .where((price) => price > 0)
        .toList();
    if (prices.isEmpty) return 0;
    return prices.reduce((a, b) => a < b ? a : b);
  }

  final source = getPricingSource(product, variantName);
  if (source == null) return 0;
  return getDisplayPriceForSource(source);
}

bool isBulkPricing(Product product, [String variantName = '']) {
  final source = getPricingSource(product, variantName);
  return source?.pricingType == 'bulk' && source!.bulkPricing.slabs.isNotEmpty;
}

List<BulkTierRow> getBulkTierRows(Product product, [String variantName = '']) {
  final source = getPricingSource(product, variantName);
  if (source == null ||
      source.pricingType != 'bulk' ||
      source.bulkPricing.slabs.isEmpty) {
    return const [];
  }

  return source.bulkPricing.slabs.map((slab) {
    final qtyLabel = slab.maxQuantity != null
        ? '${slab.minQuantity} - ${slab.maxQuantity}'
        : '${slab.minQuantity}+';
    return BulkTierRow(
      key: '${slab.minQuantity}-${slab.maxQuantity ?? 'plus'}',
      qtyLabel: qtyLabel,
      price: slab.pricePerUnit,
    );
  }).toList();
}

String formatProductPriceLabel(
  Product product,
  String Function(double) formatPrice, [
  String variantName = '',
]) {
  final amount = getDisplayPrice(product, variantName);
  if (isBulkPricing(product, variantName) ||
      (isMultiVariant(product) && variantName.trim().isEmpty)) {
    return 'From ${formatPrice(amount)}';
  }
  return formatPrice(amount);
}

String resolveActiveVariantName(Product product, String selectedVariant) {
  if (!isMultiVariant(product)) return '';
  if (selectedVariant.trim().isNotEmpty) return selectedVariant;
  return product.variants.first.name;
}

int getMaxOrderQuantity(Product product, String variantName) {
  final minOrderQuantity = getMinOrderQuantity(product, variantName);
  final variantStock = getVariantStock(product, variantName);
  if (variantStock > 0) {
    return variantStock > minOrderQuantity ? variantStock : minOrderQuantity;
  }
  return minOrderQuantity;
}

CartDefaults resolveCartDefaults(Product product) {
  var variantName = '';
  if (isMultiVariant(product)) {
    final inStockVariant = product.variants.firstWhere(
      (variant) => getVariantStock(product, variant.name) > 0,
      orElse: () => product.variants.first,
    );
    variantName = inStockVariant.name;
  }

  final colors = getAvailableColors(product, variantName);
  final colorName = colors.isNotEmpty ? colors.first.name : '';
  final quantity = getMinOrderQuantity(product, variantName);
  return CartDefaults(
    variantName: variantName,
    colorName: colorName,
    quantity: quantity,
  );
}
