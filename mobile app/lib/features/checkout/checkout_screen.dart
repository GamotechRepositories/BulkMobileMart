import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../core/exceptions/api_exception.dart';
import '../../core/network/api_response_parser.dart';
import '../../core/providers/app_providers.dart';
import '../../core/utils/address_utils.dart';
import '../../core/utils/cart_utils.dart';
import '../../core/utils/currency_formatter.dart';
import '../../widgets/common/app_network_image.dart';
import '../../features/address/address_controller.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/cart/cart_controller.dart';
import '../../features/settings/store_settings_provider.dart';
import '../../features/checkout/payment_modal.dart';
import '../../models/address.dart';
import '../../models/cart_item.dart';
import '../../routes/route_paths.dart';
import '../../widgets/address/address_form.dart';
import '../../widgets/common/skeleton_loaders.dart';

const _maxOrderNoteLength = 200;

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  late final Razorpay _razorpay;

  String? _selectedAddressId;
  bool _showAddressForm = false;
  bool _showAddressPicker = false;
  bool _savingAddress = false;
  String _paymentMethod = 'cod';
  String _message = '';
  int _messageLength = 0;
  String _formError = '';
  String _orderError = '';
  bool _placingOrder = false;
  bool _orderPlaced = false;
  bool _showSuccessModal = false;
  String _orderSuccessNote = '';
  String _pendingPaymentMode = 'online';

  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handleRazorpaySuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handleRazorpayError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);

    Future.microtask(() {
      ref.read(storeSettingsProvider.notifier).refresh();
      final cart = ref.read(cartControllerProvider);
      if (cart.items.isEmpty && !cart.loading) {
        ref.read(cartControllerProvider.notifier).loadCart(silent: true);
      }
      final addresses = ref.read(addressControllerProvider);
      if (addresses.addresses.isEmpty && !addresses.loading) {
        ref.read(addressControllerProvider.notifier).loadAddresses();
      }
    });
  }

  @override
  void dispose() {
    _razorpay.clear();
    super.dispose();
  }

  void _syncSelectedAddress(List<Address> addresses) {
    if (addresses.isEmpty) {
      _selectedAddressId = null;
      return;
    }
    if (_selectedAddressId != null &&
        addresses.any((addr) => addr.id == _selectedAddressId)) {
      return;
    }
    final defaultAddr = addresses.where((a) => a.isDefault).firstOrNull ?? addresses.first;
    _selectedAddressId = defaultAddr.id;
  }

  Future<void> _handleSaveAddress(Map<String, String> form) async {
    setState(() {
      _savingAddress = true;
      _formError = '';
    });

    final error = await ref.read(addressControllerProvider.notifier).saveAddress(
          form,
          makeDefault: ref.read(addressControllerProvider).addresses.isEmpty,
        );

    if (!mounted) return;

    if (error == null) {
      final addresses = ref.read(addressControllerProvider).addresses;
      final newest = addresses.isNotEmpty ? addresses.first : null;
      setState(() {
        _savingAddress = false;
        _showAddressForm = false;
        _showAddressPicker = false;
        _selectedAddressId = newest?.id;
      });
    } else {
      setState(() {
        _savingAddress = false;
        _formError = error;
      });
    }
  }

  Map<String, String> _addressInitialValues() {
    final user = ref.read(authControllerProvider).user;
    return {
      'fullName': user?.name ?? '',
      'number': user?.phone ?? '',
      'email': user?.email ?? '',
      'shopNo': '',
      'shopName': '',
      'fullAddress': '',
      'landmark': '',
      'city': '',
      'state': '',
      'pincode': '',
    };
  }

  void _openPaymentModal() async {
    if (_selectedAddressId == null || _placingOrder) return;
    setState(() => _orderError = '');

    await ref.read(cartControllerProvider.notifier).loadCart(silent: true);
    if (!mounted) return;

    final cartItems = ref.read(cartControllerProvider).items;
    if (cartItems.isEmpty) {
      setState(() => _orderError = 'Your cart is empty. Please add items before checkout.');
      if (mounted) context.go(RoutePaths.cart);
      return;
    }

    final storeSettings = ref.read(storeSettingsProvider).value;
    final merchantUpiId = storeSettings?.merchantUpiId;
    final merchantUpiName = storeSettings?.merchantUpiName;
    final merchantUpiAccounts = storeSettings?.merchantUpiAccounts ?? const [];

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      isDismissible: !_placingOrder,
      enableDrag: !_placingOrder,
      backgroundColor: Colors.transparent,
      builder: (context) => PaymentModal(
        paymentMethod: _paymentMethod,
        orderTotal: calculateCartSummary(ref.read(cartControllerProvider).items).total,
        merchantUpiId: merchantUpiId,
        merchantUpiName: merchantUpiName,
        merchantUpiAccounts: merchantUpiAccounts,
        processing: _placingOrder,
        error: _orderError,
        onUploadScreenshot: (path) =>
            ref.read(apiServiceProvider).uploadPaymentProofImage(path),
        onPayWithRazorpay: () {
          Navigator.pop(context);
          _startRazorpayPayment();
        },
        onSubmitUpiProof: ({
          required String screenshotUrl,
          required String screenshotName,
          required String upiTransactionRef,
        }) async {
          return _submitUpiProof(
            screenshot: screenshotUrl,
            screenshotName: screenshotName,
            upiTransactionRef: upiTransactionRef,
          );
        },
      ),
    );
  }

  String get _apiPaymentMode => _paymentMethod == 'cod' ? 'cod_advance' : 'online';

  Future<void> _startRazorpayPayment() async {
    if (_selectedAddressId == null) return;

    setState(() {
      _placingOrder = true;
      _orderError = '';
    });

    try {
      final response = await ref.read(apiServiceProvider).createRazorpayOrder({
        'addressId': _selectedAddressId,
        'paymentMode': _apiPaymentMode,
      });
      final body = ApiResponseParser.getData(response.data) as Map<String, dynamic>;

      _pendingPaymentMode = _apiPaymentMode;
      setState(() => _placingOrder = false);

      final user = ref.read(authControllerProvider).user!;
      final options = {
        'key': body['keyId'],
        'amount': body['amount'],
        'order_id': body['razorpayOrderId'],
        'name': 'Bulk Mobile Mart',
        'description': _apiPaymentMode == 'cod_advance'
            ? 'COD advance payment (10%)'
            : 'Order payment',
        'prefill': {
          'contact': user.phone,
          'email': user.email,
          'name': user.name,
        },
      };
      _razorpay.open(options);
    } catch (e) {
      setState(() {
        _placingOrder = false;
        _orderError = e is ApiException
            ? e.message
            : 'Failed to start payment. Please try again.';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_orderError)));
        _openPaymentModal();
      }
    }
  }

  Future<void> _handleRazorpaySuccess(PaymentSuccessResponse response) async {
    setState(() {
      _placingOrder = true;
      _orderError = '';
    });

    try {
      await ref.read(apiServiceProvider).verifyRazorpayPayment({
        'addressId': _selectedAddressId,
        'paymentMode': _pendingPaymentMode,
        'customerMessage': _message.trim(),
        'razorpay_order_id': response.orderId,
        'razorpay_payment_id': response.paymentId,
        'razorpay_signature': response.signature,
      });
      await _completeOrderSuccess();
    } catch (e) {
      setState(() {
        _orderError = e is ApiException
            ? e.message
            : 'Payment verified but order failed. Contact support.';
        _placingOrder = false;
      });
    }
  }

  void _handleRazorpayError(PaymentFailureResponse response) {
    setState(() {
      _placingOrder = false;
      _orderError = response.message ?? 'Payment cancelled. Your order was not placed.';
    });
    _openPaymentModal();
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    // no-op
  }

  Future<String?> _submitUpiProof({
    required String screenshot,
    required String screenshotName,
    required String upiTransactionRef,
  }) async {
    try {
      await ref.read(apiServiceProvider).submitUpiPaymentProof({
        'addressId': _selectedAddressId,
        'paymentMode': _apiPaymentMode,
        'customerMessage': _message.trim(),
        'screenshot': screenshot,
        'screenshotName': screenshotName,
        'upiTransactionRef': upiTransactionRef,
      });
      await _completeOrderSuccess(
        'Your order is confirmed. We will verify your UPI payment screenshot shortly.',
      );
      return null;
    } catch (e) {
      final message = e is ApiException
          ? e.message
          : 'Failed to submit payment proof. Please try again.';
      if (mounted) {
        setState(() => _orderError = message);
        if (message.toLowerCase().contains('no longer available')) {
          await ref.read(cartControllerProvider.notifier).loadCart(silent: true);
        }
      }
      return message;
    }
  }

  Future<void> _completeOrderSuccess([String? note]) async {
    setState(() {
      _orderPlaced = true;
      _placingOrder = false;
      _orderSuccessNote =
          note ?? 'Your order has been placed and will be delivered soon.';
      _showSuccessModal = true;
    });
    await ref.read(cartControllerProvider.notifier).loadCart();
  }

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = ref.watch(authControllerProvider.select((s) => s.isLoggedIn));
    final cartItems = ref.watch(cartControllerProvider.select((s) => s.items));
    final cartLoading = ref.watch(cartControllerProvider.select((s) => s.loading));
    final addressList = ref.watch(addressControllerProvider.select((s) => s.addresses));
    final addressesLoading =
        ref.watch(addressControllerProvider.select((s) => s.loading));

    if (!isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Please login to proceed with checkout.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () => ref.read(authControllerProvider.notifier).openAuthModal(),
                  child: const Text('Login / Sign Up'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    _syncSelectedAddress(addressList);
    final summary = calculateCartSummary(cartItems);
    final selectedAddress = _selectedAddressId == null
        ? null
        : addressList
            .where((a) => a.id == _selectedAddressId)
            .cast<Address?>()
            .firstOrNull;

    if (!cartLoading && cartItems.isEmpty && !_orderPlaced) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go(RoutePaths.cart);
      });
    }

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.canPop() ? context.pop() : context.go(RoutePaths.cart),
        ),
        title: const Text('Checkout'),
      ),
      body: Stack(
        children: [
          cartLoading && cartItems.isEmpty
              ? const SkeletonCheckoutPage()
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                  children: [
                    _StepSection(
                      title: 'Payment Method',
                      child: Column(
                        children: [
                          _PaymentOption(
                            value: 'cod',
                            groupValue: _paymentMethod,
                            title: 'Cash on Delivery',
                            subtitle: 'Pay 10% advance now · balance on delivery',
                            icon: Icons.payments_outlined,
                            iconColor: AppColors.primary,
                            iconBg: AppColors.primary.withValues(alpha: 0.12),
                            onTap: () => setState(() => _paymentMethod = 'cod'),
                          ),
                          const SizedBox(height: 10),
                          _PaymentOption(
                            value: 'online',
                            groupValue: _paymentMethod,
                            title: 'Pay Online',
                            subtitle: 'UPI, Cards, Net Banking via Razorpay',
                            icon: Icons.credit_card_outlined,
                            iconColor: Colors.blue,
                            iconBg: Colors.blue.withValues(alpha: 0.12),
                            onTap: () => setState(() => _paymentMethod = 'online'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    _StepSection(
                      title: 'Delivery Details',
                      child: addressesLoading
                          ? const SkeletonAddressList()
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (addressList.isEmpty && !_showAddressForm)
                                  const Text(
                                    'No saved address yet. Add one to continue.',
                                    style: TextStyle(color: AppColors.textSecondary),
                                  ),
                                if (selectedAddress != null &&
                                    !_showAddressForm &&
                                    !_showAddressPicker)
                                  _SelectedAddressCard(
                                    address: selectedAddress,
                                    showChange: addressList.length > 1,
                                    onChange: () => setState(() => _showAddressPicker = true),
                                  ),
                                if (_showAddressPicker && !_showAddressForm)
                                  _AddressPicker(
                                    addresses: addressList,
                                    selectedId: _selectedAddressId,
                                    onSelect: (id) => setState(() {
                                      _selectedAddressId = id;
                                      _showAddressPicker = false;
                                    }),
                                    onAddNew: () => setState(() {
                                      _showAddressForm = true;
                                      _showAddressPicker = false;
                                    }),
                                  ),
                                if (_showAddressForm) ...[
                                  AddressForm(
                                    initial: _addressInitialValues(),
                                    submitting: _savingAddress,
                                    onCancel: () => setState(() {
                                      _showAddressForm = false;
                                      _formError = '';
                                    }),
                                    onSubmit: _handleSaveAddress,
                                  ),
                                  if (_formError.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Text(
                                      _formError,
                                      style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                                    ),
                                  ],
                                ] else if (addressList.isNotEmpty &&
                                    selectedAddress == null &&
                                    !_showAddressPicker)
                                  TextButton(
                                    onPressed: () => setState(() => _showAddressForm = true),
                                    child: const Text('+ Add Address'),
                                  ),
                                if (selectedAddress != null &&
                                    !_showAddressForm &&
                                    !_showAddressPicker)
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: TextButton(
                                      onPressed: () => setState(() => _showAddressForm = true),
                                      child: const Text('+ Add new address'),
                                    ),
                                  ),
                              ],
                            ),
                    ),
                    const SizedBox(height: 12),
                    _StepSection(
                      title: 'Order Note (optional)',
                      child: Stack(
                        children: [
                          TextField(
                            maxLines: 3,
                            decoration: InputDecoration(
                              hintText: 'Any special instructions for your order...',
                              filled: true,
                              fillColor: Colors.white,
                              counterText: '$_messageLength/$_maxOrderNoteLength',
                            ),
                            onChanged: (value) {
                              if (value.length > _maxOrderNoteLength) return;
                              setState(() {
                                _message = value;
                                _messageLength = value.length;
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    _StepSection(
                      title: 'Order Summary',
                      child: Column(
                        children: [
                          ...cartItems.map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _CheckoutLineItem(item: item),
                            ),
                          ),
                          const Divider(height: 24),
                          _summaryRow('Items', '${summary.itemCount}'),
                          const SizedBox(height: 8),
                          _summaryRow('Subtotal', formatInr(summary.subtotal)),
                          const SizedBox(height: 8),
                          _summaryRow(
                            'Shipping',
                            summary.shippingFree ? 'FREE' : formatInr(summary.shipping),
                          ),
                          const SizedBox(height: 8),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'GST included in prices',
                              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                            ),
                          ),
                          const Divider(height: 24),
                          _summaryRow('Total', formatInr(summary.total), bold: true),
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
                                  Icon(Icons.check_circle_outline,
                                      size: 18, color: Colors.green.shade700),
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
                          if (!summary.shippingFree) ...[
                            const SizedBox(height: 8),
                            Text(
                              'Free delivery on orders above ${formatInr(AppConstants.freeDeliveryThreshold)}',
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (_orderError.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Text(
                        _orderError,
                        style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                      ),
                    ],
                  ],
                ),
          if (_placingOrder)
            Container(
              color: Colors.black38,
              child: const Center(
                child: Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        CircularProgressIndicator(color: AppColors.primary),
                        SizedBox(height: 16),
                        Text('Processing payment...', style: TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          if (_showSuccessModal)
            Container(
              color: Colors.black38,
              child: Center(
                child: Card(
                  margin: const EdgeInsets.all(24),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: Colors.green.shade100,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.check, color: Colors.green.shade700, size: 36),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Order Confirmed',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _orderSuccessNote,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: () {
                              setState(() => _showSuccessModal = false);
                              context.go(RoutePaths.orders);
                            },
                            child: const Text('View My Orders'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: cartItems.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: FilledButton(
                  onPressed: _selectedAddressId == null || _placingOrder
                      ? null
                      : _openPaymentModal,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text('Place Order · ${formatInr(summary.total)}'),
                ),
              ),
            ),
    );
  }

  Widget _summaryRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontWeight: bold ? FontWeight.bold : FontWeight.w500,
            color: bold ? AppColors.textPrimary : AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w500),
        ),
      ],
    );
  }
}

class _CheckoutLineItem extends StatelessWidget {
  const _CheckoutLineItem({required this.item});

  final CartItem item;

  @override
  Widget build(BuildContext context) {
    final image = item.productImages.isNotEmpty ? item.productImages.first : null;

    return Row(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: AppColors.mobileSurface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: image != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: AppNetworkImage(imageUrl: image, fit: BoxFit.contain, errorIcon: Icons.image_outlined),
                )
              : const Icon(Icons.image_outlined, color: AppColors.textMuted),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
              ),
              const SizedBox(height: 4),
              Text(
                'Qty: ${item.quantity}',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              if (item.variantName.isNotEmpty)
                Text(
                  'Variant: ${item.variantName}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              if (item.colorName.isNotEmpty)
                Text(
                  'Color: ${item.colorName}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
            ],
          ),
        ),
        Text(
          formatInr(item.lineTotal),
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ],
    );
  }
}

class _StepSection extends StatelessWidget {
  const _StepSection({required this.title, required this.child});

  final String title;
  final Widget child;

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  const _PaymentOption({
    required this.value,
    required this.groupValue,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.onTap,
  });

  final String value;
  final String groupValue;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final selected = value == groupValue;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.borderLight,
          ),
          color: selected ? AppColors.primary.withValues(alpha: 0.05) : Colors.white,
        ),
        child: Row(
          children: [
            Radio<String>(
              value: value,
              groupValue: groupValue,
              onChanged: (_) => onTap(),
              activeColor: AppColors.primary,
            ),
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectedAddressCard extends StatelessWidget {
  const _SelectedAddressCard({
    required this.address,
    required this.showChange,
    required this.onChange,
  });

  final Address address;
  final bool showChange;
  final VoidCallback onChange;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.mobileSurface.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        getAddressFullName(address),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    if (address.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'DEFAULT',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.primary),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (showChange)
                TextButton(onPressed: onChange, child: const Text('Change')),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            formatAddressLine(address),
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 4),
          Text('+91 ${address.number}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        ],
      ),
    );
  }
}

class _AddressPicker extends StatelessWidget {
  const _AddressPicker({
    required this.addresses,
    required this.selectedId,
    required this.onSelect,
    required this.onAddNew,
  });

  final List<Address> addresses;
  final String? selectedId;
  final ValueChanged<String> onSelect;
  final VoidCallback onAddNew;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ...addresses.map(
          (addr) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => onSelect(addr.id),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selectedId == addr.id ? AppColors.primary : AppColors.borderLight,
                  ),
                  color: selectedId == addr.id
                      ? AppColors.primary.withValues(alpha: 0.05)
                      : Colors.white,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Radio<String>(
                      value: addr.id,
                      groupValue: selectedId,
                      onChanged: (value) {
                        if (value != null) onSelect(value);
                      },
                      activeColor: AppColors.primary,
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            getAddressFullName(addr),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            formatAddressLine(addr),
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton(onPressed: onAddNew, child: const Text('+ Add new address')),
        ),
      ],
    );
  }
}
