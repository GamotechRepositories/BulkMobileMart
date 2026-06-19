import 'package:bulk_mobile_mart/core/utils/product_pricing.dart';
import 'package:bulk_mobile_mart/models/product.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Product pricing', () {
    test('uses bulk MOQ from API instead of hardcoded default', () {
      final product = Product.fromJson({
        'id': 'bulk1',
        'name': 'Bulk Cable',
        'categories': ['Accessories'],
        'subcategory': 'Cables',
        'brandName': 'Brand',
        'price': 100,
        'discountedPrice': 90,
        'discountedPercent': 10,
        'stock': 200,
        'productImages': [],
        'pricingType': 'bulk',
        'bulkPricing': {
          'minOrderQuantity': 25,
          'slabs': [
            {'minQuantity': 25, 'maxQuantity': 49, 'pricePerUnit': 90},
            {'minQuantity': 50, 'maxQuantity': null, 'pricePerUnit': 80},
          ],
        },
      });

      expect(getMinOrderQuantity(product), 25);
      expect(getUnitPriceForQuantity(product, 25), 90);
      expect(getUnitPriceForQuantity(product, 50), 80);
      expect(getBulkTierRows(product).length, 2);
    });

    test('single pricing defaults MOQ to 1', () {
      final product = Product.fromJson({
        'id': 'single1',
        'name': 'Single Item',
        'categories': ['Accessories'],
        'subcategory': 'Cables',
        'brandName': 'Brand',
        'price': 100,
        'discountedPrice': 90,
        'discountedPercent': 10,
        'stock': 12,
        'productImages': [],
        'pricingType': 'single',
      });

      expect(getMinOrderQuantity(product), defaultSingleMoq);
      expect(getMaxOrderQuantity(product, ''), 12);
    });

    test('uses step by quantity when defined for bulk products', () {
      final product = Product.fromJson({
        'id': 'bulk2',
        'name': 'Bulk Cable Step',
        'categories': ['Accessories'],
        'subcategory': 'Cables',
        'brandName': 'Brand',
        'price': 100,
        'discountedPrice': 90,
        'discountedPercent': 10,
        'stock': 200,
        'productImages': [],
        'pricingType': 'bulk',
        'bulkPricing': {
          'minOrderQuantity': 50,
          'stepByQuantity': 10,
          'slabs': [
            {'minQuantity': 50, 'maxQuantity': null, 'pricePerUnit': 80},
          ],
        },
      });

      expect(getMinOrderQuantity(product), 50);
      expect(getQuantityStep(product), 10);
    });

    test('bulk quantity step falls back to MOQ when step is not defined', () {
      final product = Product.fromJson({
        'id': 'bulk3',
        'name': 'Bulk Cable MOQ Step',
        'categories': ['Accessories'],
        'subcategory': 'Cables',
        'brandName': 'Brand',
        'price': 100,
        'discountedPrice': 90,
        'discountedPercent': 10,
        'stock': 200,
        'productImages': [],
        'pricingType': 'bulk',
        'bulkPricing': {
          'minOrderQuantity': 25,
          'slabs': [
            {'minQuantity': 25, 'maxQuantity': null, 'pricePerUnit': 80},
          ],
        },
      });

      expect(getQuantityStep(product), 25);
    });
  });
}
