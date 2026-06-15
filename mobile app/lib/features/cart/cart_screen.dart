import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../core/utils/cart_utils.dart';
import '../../core/utils/currency_formatter.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
import '../../models/cart_item.dart';
import '../../routes/route_paths.dart';
import '../../widgets/common/app_network_image.dart';
import '../../widgets/common/cart_terms_box.dart';
import '../../widgets/common/refreshable_body.dart';
import '../../widgets/common/skeleton_loaders.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  bool _clearing = false;

  Future<void> _loadCart() async {
    await ref.read(cartControllerProvider.notifier).loadCart();
  }

  Future<void> _clearCart() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear cart?'),
        content: const Text('Remove all items from your cart?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Clear')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _clearing = true);
    await ref.read(cartControllerProvider.notifier).clearCart();
    if (mounted) setState(() => _clearing = false);
  }

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = ref.watch(authControllerProvider.select((s) => s.isLoggedIn));
    final items = ref.watch(cartControllerProvider.select((s) => s.items));
    final loading = ref.watch(cartControllerProvider.select((s) => s.loading));

    if (!isLoggedIn) {
      return RefreshableBody(
        onRefresh: _loadCart,
        child: _LoginPrompt(
          onLogin: () => ref.read(authControllerProvider.notifier).openAuthModal(),
        ),
      );
    }

    if (loading && items.isEmpty) {
      return const SkeletonCartPage();
    }

    if (items.isEmpty) {
      return RefreshableBody(
        onRefresh: _loadCart,
        child: _EmptyCart(onBrowse: () => context.go(RoutePaths.product)),
      );
    }

    final summary = calculateCartSummary(items);

    return RefreshIndicator(
      onRefresh: _loadCart,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
        itemCount: items.length + 3,
        itemBuilder: (context, index) {
          if (index == 0) {
            return Row(
              children: [
                Expanded(
                  child: Text(
                    'Cart (${summary.itemCount})',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                TextButton(
                  onPressed: _clearing || loading ? null : _clearCart,
                  child: Text(_clearing ? 'Clearing...' : 'Clear Cart'),
                ),
              ],
            );
          }
          if (index == 1) return const SizedBox(height: 16);
          if (index == items.length + 2) {
            return Column(
              children: [
                const SizedBox(height: 8),
                _OrderSummary(
                  summary: summary,
                  onCheckout: () => context.push(RoutePaths.checkout),
                ),
                const SizedBox(height: 12),
                const CartTermsBox(),
              ],
            );
          }
          if (index >= items.length + 2) return const SizedBox.shrink();

          final item = items[index - 2];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _CartItemCard(
              item: item,
              onRemove: () =>
                  ref.read(cartControllerProvider.notifier).removeFromCart(item.id),
              onDecrease: () {
                if (item.quantity <= 1) {
                  ref.read(cartControllerProvider.notifier).removeFromCart(item.id);
                } else {
                  ref
                      .read(cartControllerProvider.notifier)
                      .updateQuantity(item.id, item.quantity - 1);
                }
              },
              onIncrease: () => ref
                  .read(cartControllerProvider.notifier)
                  .updateQuantity(item.id, item.quantity + 1),
              onTap: () => context.push('/product/${item.id}'),
            ),
          );
        },
      ),
    );
  }
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({
    required this.item,
    required this.onRemove,
    required this.onDecrease,
    required this.onIncrease,
    required this.onTap,
  });

  final CartItem item;
  final VoidCallback onRemove;
  final VoidCallback onDecrease;
  final VoidCallback onIncrease;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final image = item.productImages.isNotEmpty ? item.productImages.first : null;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: onTap,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.borderLight),
                    color: Colors.white,
                  ),
                  child: image != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: AppNetworkImage(
                            imageUrl: image,
                            fit: BoxFit.contain,
                            width: 56,
                            height: 56,
                            cacheWidth: 112,
                            cacheHeight: 112,
                            errorIcon: Icons.image_outlined,
                          ),
                        )
                      : const ColoredBox(color: AppColors.mobileSurface),
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: onRemove,
                icon: const Icon(Icons.close, size: 20),
                color: AppColors.textMuted,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
              ),
            ],
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: onTap,
            child: Text(
              item.name,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _QuantityControl(
                quantity: item.quantity,
                onDecrease: onDecrease,
                onIncrease: onIncrease,
              ),
              const Spacer(),
              Text(
                formatInr(item.lineTotal),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuantityControl extends StatelessWidget {
  const _QuantityControl({
    required this.quantity,
    required this.onDecrease,
    required this.onIncrease,
  });

  final int quantity;
  final VoidCallback onDecrease;
  final VoidCallback onIncrease;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.borderLight),
        borderRadius: BorderRadius.circular(8),
        color: Colors.white,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _qtyButton('-', onDecrease),
          Container(
            width: 36,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              border: Border.symmetric(
                vertical: BorderSide(color: AppColors.borderLight),
              ),
            ),
            child: Text(
              '$quantity',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          _qtyButton('+', onIncrease),
        ],
      ),
    );
  }

  Widget _qtyButton(String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: SizedBox(
        width: 32,
        height: 32,
        child: Center(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 18,
              color: AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _OrderSummary extends StatelessWidget {
  const _OrderSummary({
    required this.summary,
    required this.onCheckout,
  });

  final CartSummary summary;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Order Summary',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 16),
          _summaryRow('Subtotal', formatInr(summary.subtotal)),
          const SizedBox(height: 8),
          _summaryRow(
            'Shipping',
            summary.shippingFree ? 'FREE' : formatInr(summary.shipping),
            valueColor: summary.shippingFree ? Colors.green : null,
          ),
          if (!summary.shippingFree) ...[
            const SizedBox(height: 8),
            Text(
              'Free delivery on orders above ${formatInr(AppConstants.freeDeliveryThreshold)}',
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
          const SizedBox(height: 8),
          const Text(
            'GST included in prices',
            style: TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          if (summary.savings > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle_outline, size: 18, color: Colors.green.shade700),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'You will save ${formatInr(summary.savings)} on this order',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Colors.green.shade700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const Divider(height: 24),
          _summaryRow(
            'Total',
            formatInr(summary.total),
            bold: true,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: onCheckout,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: const Text('Place Order'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => context.go(RoutePaths.product),
                  child: const Text('Continue Shopping'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => context.push(RoutePaths.support),
                  child: const Text('Support'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool bold = false, Color? valueColor}) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.bold : FontWeight.w500,
      fontSize: bold ? 16 : 14,
      color: bold ? AppColors.textPrimary : AppColors.textSecondary,
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: style),
        Text(
          value,
          style: style.copyWith(color: valueColor ?? AppColors.textPrimary),
        ),
      ],
    );
  }
}

class _LoginPrompt extends StatelessWidget {
  const _LoginPrompt({required this.onLogin});

  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Sign in to view your cart and place orders.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: onLogin,
              child: const Text('Login / Sign Up'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyCart extends StatelessWidget {
  const _EmptyCart({required this.onBrowse});

  final VoidCallback onBrowse;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.textMuted),
            const SizedBox(height: 16),
            const Text(
              'Your cart is empty',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Browse products and add items to get started.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            FilledButton(onPressed: onBrowse, child: const Text('Browse Products')),
          ],
        ),
      ),
    );
  }
}
