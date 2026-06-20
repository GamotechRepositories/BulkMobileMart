import 'package:bulk_mobile_mart/core/utils/product_pricing.dart';
import 'package:bulk_mobile_mart/models/product.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Product pricing', () {
    test('uses product MOQ from API instead of hardcoded default', () {
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
        'minOrderQuantity': 25,
        'bulkPricing': {
          'slabs': [
            {'minQuantity': 25, 'maxQuantity': 49, 'pricePerUnit': 90},
            {'minQuantity': 50, 'maxQuantity': null, 'pricePerUnit': 80},
          ],
        },
      });

      expect(getMinOrderQuantity(product), 25);
      expect(hasConfiguredMinOrderQuantity(product), isTrue);
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
      expect(hasConfiguredMinOrderQuantity(product), isFalse);
      expect(getMaxOrderQuantity(product, ''), 12);
    });

    test('uses step by quantity when defined', () {
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
        'minOrderQuantity': 50,
        'stepByQuantity': 10,
        'bulkPricing': {
          'slabs': [
            {'minQuantity': 50, 'maxQuantity': null, 'pricePerUnit': 80},
          ],
        },
      });

      expect(getMinOrderQuantity(product), 50);
      expect(getQuantityStep(product), 10);
      expect(hasConfiguredQuantityStep(product), isTrue);
    });

    test('quantity step defaults to 1 when not defined', () {
      final product = Product.fromJson({
        'id': 'bulk3',
        'name': 'Bulk Cable Default Step',
        'categories': ['Accessories'],
        'subcategory': 'Cables',
        'brandName': 'Brand',
        'price': 100,
        'discountedPrice': 90,
        'discountedPercent': 10,
        'stock': 200,
        'productImages': [],
        'pricingType': 'bulk',
        'minOrderQuantity': 25,
        'bulkPricing': {
          'slabs': [
            {'minQuantity': 25, 'maxQuantity': null, 'pricePerUnit': 80},
          ],
        },
      });

      expect(getQuantityStep(product), defaultSingleMoq);
      expect(hasConfiguredQuantityStep(product), isFalse);
    });

    test('decrease quantity uses step by qty but not below MOQ', () {
      final product = Product.fromJson({
        'id': 'bulk4',
        'name': 'Bulk Cable Decrease',
        'categories': ['Accessories'],
        'subcategory': 'Cables',
        'brandName': 'Brand',
        'price': 100,
        'discountedPrice': 90,
        'discountedPercent': 10,
        'stock': 200,
        'productImages': [],
        'pricingType': 'bulk',
        'minOrderQuantity': 50,
        'stepByQuantity': 10,
        'bulkPricing': {
          'slabs': [
            {'minQuantity': 50, 'maxQuantity': null, 'pricePerUnit': 80},
          ],
        },
      });

      expect(getDecreasedCartQuantityForProduct(product, 60), 50);
      expect(getDecreasedCartQuantityForProduct(product, 50), 0);
    });

    test('single pricing can use independent MOQ and step fields', () {
      final product = Product.fromJson({
        'id': 'single2',
        'name': 'Single With MOQ',
        'categories': ['Accessories'],
        'subcategory': 'Cables',
        'brandName': 'Brand',
        'price': 100,
        'discountedPrice': 90,
        'discountedPercent': 10,
        'stock': 200,
        'productImages': [],
        'pricingType': 'single',
        'minOrderQuantity': 5,
        'stepByQuantity': 5,
      });

      expect(getMinOrderQuantity(product), 5);
      expect(getQuantityStep(product), 5);
      expect(hasConfiguredMinOrderQuantity(product), isTrue);
      expect(hasConfiguredQuantityStep(product), isTrue);
    });
  });
}
