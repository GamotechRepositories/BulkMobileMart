import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_info.dart';
import '../../config/theme.dart';
import '../../core/providers/package_info_provider.dart';
import '../../core/providers/app_providers.dart';
import '../../core/scroll/app_scroll_config.dart';
import '../../core/scroll/tab_scroll_registry.dart';
import '../../core/utils/address_utils.dart';
import '../../core/utils/website_share.dart';
import '../../features/address/address_controller.dart';
import '../../features/auth/auth_controller.dart';
import '../../models/address.dart';
import '../../models/order.dart';
import '../../models/user.dart';
import '../../routes/route_paths.dart';
import '../../widgets/layout/shell_bottom_insets.dart';
import '../../widgets/address/address_sheets.dart';
import '../../widgets/common/refreshable_body.dart';
import '../../widgets/common/skeleton_loaders.dart';
import '../../widgets/product/buy_again_card.dart';
import 'profile_recent_items.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  late final TabScrollRegistry _tabScrollRegistry;
  final _scrollController = ScrollController();
  final _addressesSectionKey = GlobalKey();

  List<OrderItem> _recentItems = [];
  bool _recentItemsLoading = false;
  Map<String, dynamic>? _wallet;
  bool _walletLoading = false;

  @override
  void initState() {
    super.initState();
    _tabScrollRegistry = ref.read(tabScrollRegistryProvider);
    Future.microtask(() {
      _loadRecentItems();
      if (ref.read(authControllerProvider).isLoggedIn) {
        ref.read(addressControllerProvider.notifier).loadAddresses();
        _loadWallet();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _tabScrollRegistry.register(ShellTabIndex.account, _scrollController);
    });
  }

  @override
  void dispose() {
    _tabScrollRegistry.unregister(ShellTabIndex.account, _scrollController);
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _openWalletHistorySheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _WalletHistorySheet(wallet: _wallet),
    );
  }

  Future<void> _loadWallet() async {
    if (!ref.read(authControllerProvider).isLoggedIn) return;

    setState(() => _walletLoading = true);
    try {
      final wallet = await ref.read(apiServiceProvider).fetchMyWallet();
      if (!mounted) return;
      setState(() {
        _wallet = wallet;
        _walletLoading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _wallet = null;
          _walletLoading = false;
        });
      }
    }
  }

  Future<void> _loadRecentItems() async {
    if (!ref.read(authControllerProvider).isLoggedIn) return;

    setState(() => _recentItemsLoading = true);
    try {
      final orders = await ref.read(apiServiceProvider).fetchMyOrders();
      if (!mounted) return;
      setState(() {
        _recentItems = extractRecentOrderItems(orders);
        _recentItemsLoading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _recentItems = [];
          _recentItemsLoading = false;
        });
      }
    }
  }

  Future<void> _refreshProfile() async {
    await Future.wait([
      ref.read(addressControllerProvider.notifier).loadAddresses(),
      _loadRecentItems(),
      _loadWallet(),
    ]);
  }

  void _scrollToAddresses() {
    final context = _addressesSectionKey.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    }
  }

  Future<void> _openAddAddressSheet() async {
    final user = ref.read(authControllerProvider).user;
    final addresses = ref.read(addressControllerProvider).addresses;

    await showAddressFormSheet(
      context,
      initial: buildNewAddressInitialValues(user: user, addresses: addresses),
      phoneOptions: buildAddressPhoneOptions(user: user, addresses: addresses),
      onSubmit: (form) => ref.read(addressControllerProvider.notifier).saveAddress(
            form,
            makeDefault: addresses.isEmpty,
          ),
    );
  }

  Future<void> _openEditAddressSheet(Address address) async {
    await showAddressFormSheet(
      context,
      title: 'Edit address',
      initial: mapAddressToForm(address),
      onSubmit: (form) => ref.read(addressControllerProvider.notifier).saveAddress(
            form,
            editing: address,
          ),
    );
  }

  Future<void> _handleDeleteAddress(Address address) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove address?'),
        content: const Text('This address will be removed from your account.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final error =
        await ref.read(addressControllerProvider.notifier).deleteAddress(address.id);
    if (error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }
  }

  Future<void> _editProfileField({
    required String title,
    required String fieldKey,
    required String initialValue,
    TextInputType keyboardType = TextInputType.text,
  }) async {
    final controller = TextEditingController(text: initialValue);
    final error = await showDialog<String?>(
      context: context,
      builder: (context) {
        String? localError;
        return StatefulBuilder(
          builder: (context, setLocalState) => AlertDialog(
            title: Text('Edit $title'),
            content: TextField(
              controller: controller,
              keyboardType: keyboardType,
              decoration: InputDecoration(
                labelText: title,
                errorText: localError,
              ),
              autofocus: true,
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              FilledButton(
                onPressed: () async {
                  final value = controller.text.trim();
                  if (value.isEmpty) {
                    setLocalState(() => localError = '$title is required');
                    return;
                  }
                  Navigator.pop(context, value);
                },
                child: const Text('Save'),
              ),
            ],
          ),
        );
      },
    );

    if (error == null || !mounted) return;

    final updateError = await ref.read(authControllerProvider.notifier).updateProfile({
      fieldKey: error,
    });

    if (!mounted) return;
    if (updateError != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(updateError)));
    }
  }

  void _openAccountSettings() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            20, 12, 20,
            20 + ShellBottomInsets.navBarOverlay + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderLight,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Settings',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.share_outlined, color: AppColors.primary),
                title: const Text('Share Website'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  Navigator.pop(context);
                  try {
                    await shareWebsite();
                  } catch (_) {
                    messenger.showSnackBar(
                      const SnackBar(content: Text('Could not share website. Try again.')),
                    );
                  }
                },
              ),
              ListTile(
                leading: const Icon(Icons.support_agent_outlined, color: AppColors.primary),
                title: const Text('Help & Support'),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () {
                  Navigator.pop(context);
                  context.push(RoutePaths.support);
                },
              ),
              ListTile(
                leading: const Icon(Icons.logout_rounded, color: Colors.red),
                title: const Text('Logout', style: TextStyle(color: Colors.red)),
                onTap: () {
                  Navigator.pop(context);
                  ref.read(authControllerProvider.notifier).logout();
                },
              ),
              const SizedBox(height: 8),
              ref.watch(packageInfoProvider).when(
                    loading: () => Text(
                      '${AppInfo.name} v${AppInfo.version}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    error: (_, _) => Text(
                      '${AppInfo.name} v${AppInfo.version}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                    data: (info) => Text(
                      '${AppInfo.name} v${info.version}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = ref.watch(authControllerProvider.select((s) => s.isLoggedIn));
    final user = ref.watch(authControllerProvider.select((s) => s.user));
    final addresses = ref.watch(addressControllerProvider.select((s) => s.addresses));
    final addressesLoading =
        ref.watch(addressControllerProvider.select((s) => s.loading));

    if (!isLoggedIn) {
      return RefreshableBody(
        onRefresh: _refreshProfile,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Sign in to manage your account and addresses.',
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

    if (user == null) {
      return RefreshableBody(
        onRefresh: _refreshProfile,
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    return RefreshIndicator(
      onRefresh: _refreshProfile,
      child: ListView(
        controller: _scrollController,
        physics: AppScrollConfig.listPhysics,
        cacheExtent: AppScrollConfig.cacheExtent,
        padding: ShellBottomInsets.listPadding(context, top: 12),
        children: [
          _ProfileHeader(user: user),
          const SizedBox(height: 16),
          _ProfileInfoCard(
            user: user,
            onEditName: () => _editProfileField(
              title: 'Name',
              fieldKey: 'name',
              initialValue: user.name,
            ),
            onEditEmail: () => _editProfileField(
              title: 'Email',
              fieldKey: 'email',
              initialValue: user.email,
              keyboardType: TextInputType.emailAddress,
            ),
            onEditPhone: () => _editProfileField(
              title: 'Phone Number',
              fieldKey: 'phone',
              initialValue: user.phone,
              keyboardType: TextInputType.phone,
            ),
          ),
          const SizedBox(height: 14),
          _WalletBalanceCard(
            wallet: _wallet,
            loading: _walletLoading,
            onTapHistory: _openWalletHistorySheet,
          ),
          const SizedBox(height: 14),
          _QuickLinksBar(
            onAddresses: _scrollToAddresses,
            onOrders: () => context.go(RoutePaths.orders),
            onWishlist: () => context.push(RoutePaths.wishlist),
            onSettings: _openAccountSettings,
          ),
          if (_recentItemsLoading || _recentItems.isNotEmpty) ...[
            const SizedBox(height: 20),
            _RecentOrderItemsSection(
              items: _recentItems,
              loading: _recentItemsLoading,
            ),
          ],
          const SizedBox(height: 20),
          _SavedAddressesSection(
            sectionKey: _addressesSectionKey,
            addresses: addresses,
            loading: addressesLoading,
            onAddAddress: _openAddAddressSheet,
            onEditAddress: _openEditAddressSheet,
            onDeleteAddress: _handleDeleteAddress,
          ),
        ],
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hi, ${profileFirstName(user.name)} 👋',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Manage your profile & addresses',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
            ],
          ),
        ),
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.headerSearchBg,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
              ),
              alignment: Alignment.center,
              child: Text(
                profileInitials(user.name),
                style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
            Positioned(
              right: -2,
              bottom: -2,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.borderLight),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: const Icon(Icons.edit_rounded, size: 12, color: AppColors.primary),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ProfileInfoCard extends StatelessWidget {
  const _ProfileInfoCard({
    required this.user,
    required this.onEditName,
    required this.onEditEmail,
    required this.onEditPhone,
  });

  final User user;
  final VoidCallback onEditName;
  final VoidCallback onEditEmail;
  final VoidCallback onEditPhone;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          _ProfileInfoRow(
            icon: Icons.person_outline_rounded,
            label: 'Name',
            value: user.name,
            onEdit: onEditName,
            showDivider: true,
          ),
          _ProfileInfoRow(
            icon: Icons.mail_outline_rounded,
            label: 'Email',
            value: user.email.isNotEmpty ? user.email : 'Not provided',
            onEdit: onEditEmail,
            showDivider: true,
          ),
          _ProfileInfoRow(
            icon: Icons.phone_outlined,
            label: 'Phone Number',
            value: user.phone.isNotEmpty ? user.phone : 'Not provided',
            onEdit: onEditPhone,
            showDivider: false,
          ),
        ],
      ),
    );
  }
}

class _ProfileInfoRow extends StatelessWidget {
  const _ProfileInfoRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onEdit,
    required this.showDivider,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onEdit;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.headerSearchBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    const SizedBox(height: 2),
                    Text(
                      value,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: onEdit,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Edit', style: TextStyle(fontWeight: FontWeight.w600)),
                    Icon(Icons.chevron_right_rounded, size: 18),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (showDivider) const Divider(height: 1, indent: 62, endIndent: 14),
      ],
    );
  }
}

class _WalletBalanceCard extends StatelessWidget {
  const _WalletBalanceCard({
    required this.wallet,
    required this.loading,
    required this.onTapHistory,
  });

  final Map<String, dynamic>? wallet;
  final bool loading;
  final VoidCallback onTapHistory;

  @override
  Widget build(BuildContext context) {
    final pointsBalance = wallet?['pointsBalance'] ?? 0;
    final status = wallet?['status'] ?? 'active';
    final isBlocked = status == 'blocked';
    final stats = wallet?['stats'] as Map<String, dynamic>?;
    final totalEarned = stats?['totalEarned'] ?? 0;
    final totalRedeemed = stats?['totalRedeemed'] ?? 0;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.headerFadeBg,
            Colors.white,
            AppColors.headerFadeBg.withValues(alpha: 0.5),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.account_balance_wallet_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'WALLET BALANCE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isBlocked ? const Color(0xFFFFEBEE) : const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 5,
                                height: 5,
                                decoration: BoxDecoration(
                                  color: isBlocked ? Colors.red : Colors.green,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                isBlocked ? 'Blocked' : 'Active',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: isBlocked ? Colors.red.shade800 : Colors.green.shade800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          loading ? '...' : '$pointsBalance',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          'Points',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: onTapHistory,
                style: OutlinedButton.styleFrom(
                  backgroundColor: Colors.white,
                  side: BorderSide(color: AppColors.primary.withValues(alpha: 0.3)),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                icon: const Text(
                  'History',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                label: const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 10,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.only(top: 10),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.primary.withValues(alpha: 0.1))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Icon(Icons.add, size: 14, color: Color(0xFF2E7D32)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total Earned',
                                style: TextStyle(fontSize: 10, color: AppColors.textSecondary),
                              ),
                              Text(
                                '+$totalEarned pts',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF2E7D32),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF8E1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Icon(Icons.shopping_bag_outlined, size: 14, color: Color(0xFFF57F17)),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total Redeemed',
                                style: TextStyle(fontSize: 10, color: AppColors.textSecondary),
                              ),
                              Text(
                                '$totalRedeemed pts',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFE65100),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WalletHistorySheet extends ConsumerStatefulWidget {
  const _WalletHistorySheet({this.wallet});

  final Map<String, dynamic>? wallet;

  @override
  ConsumerState<_WalletHistorySheet> createState() => _WalletHistorySheetState();
}

class _WalletHistorySheetState extends ConsumerState<_WalletHistorySheet> {
  List<Map<String, dynamic>> _transactions = [];
  bool _loading = true;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _fetchTransactions();
  }

  Future<void> _fetchTransactions() async {
    try {
      final list = await ref.read(apiServiceProvider).fetchMyWalletTransactions();
      if (!mounted) return;
      setState(() {
        _transactions = list;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredTransactions {
    if (_filter == 'credit') {
      return _transactions.where((t) => ((t['pointsDelta'] as num?) ?? 0) > 0).toList();
    }
    if (_filter == 'debit') {
      return _transactions.where((t) => ((t['pointsDelta'] as num?) ?? 0) < 0).toList();
    }
    return _transactions;
  }

  String _formatType(String? type) {
    switch (type) {
      case 'cashback':
        return 'Cashback Reward';
      case 'referral_reward':
        return 'Referral Bonus';
      case 'points_redemption':
        return 'Points Redeemed';
      case 'points_expiry':
        return 'Points Expired';
      case 'reward_reversal':
        return 'Reward Reversed';
      case 'admin_adjustment':
        return 'Admin Adjustment';
      default:
        return type?.replaceAll('_', ' ').toUpperCase() ?? 'Transaction';
    }
  }

  String _formatDate(dynamic dateVal) {
    if (dateVal == null) return '';
    try {
      final dt = DateTime.parse(dateVal.toString()).toLocal();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final amPm = dt.hour >= 12 ? 'PM' : 'AM';
      final minute = dt.minute.toString().padLeft(2, '0');
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}, $hour:$minute $amPm';
    } catch (_) {
      return dateVal.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final pointsBalance = widget.wallet?['pointsBalance'] ?? 0;
    final stats = widget.wallet?['stats'] as Map<String, dynamic>?;
    final totalEarned = stats?['totalEarned'] ?? 0;
    final totalRedeemed = stats?['totalRedeemed'] ?? 0;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.black12,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.headerFadeBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.account_balance_wallet_outlined,
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Wallet History',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        'Points statement & history',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded, size: 20),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Container(
            padding: const EdgeInsets.all(14),
            color: AppColors.headerFadeBg,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Available Balance',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              '$pointsBalance',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Points',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Earned / Spent',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        Text(
                          '+$totalEarned / -$totalRedeemed',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _filterChip('all', 'All'),
                    const SizedBox(width: 8),
                    _filterChip('credit', 'Earned (+)'),
                    const SizedBox(width: 8),
                    _filterChip('debit', 'Spent (-)'),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
                : _filteredTransactions.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppColors.headerFadeBg,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(
                                Icons.receipt_long_outlined,
                                color: AppColors.primary,
                                size: 24,
                              ),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'No transactions found',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Earn points by placing orders or participating in rewards!',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _filteredTransactions.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final tx = _filteredTransactions[index];
                          final pointsDelta = (tx['pointsDelta'] as num?) ?? 0;
                          final isCredit = pointsDelta > 0;
                          final desc = tx['description']?.toString() ?? '';
                          final refId = tx['referenceId']?.toString() ?? '';
                          final balAfter = tx['balanceAfter'] ?? 0;

                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: isCredit ? const Color(0xFFE8F5E9) : const Color(0xFFFFF8E1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    isCredit ? Icons.add_rounded : Icons.remove_rounded,
                                    size: 18,
                                    color: isCredit ? const Color(0xFF2E7D32) : const Color(0xFFE65100),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _formatType(tx['type']?.toString()),
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      if (desc.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          desc,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                      const SizedBox(height: 2),
                                      Text(
                                        '${_formatDate(tx['createdAt'])}${refId.isNotEmpty ? ' • Ref: $refId' : ''}',
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: AppColors.textMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      '${isCredit ? '+' : ''}$pointsDelta pts',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 13,
                                        color: isCredit ? const Color(0xFF2E7D32) : const Color(0xFFE65100),
                                      ),
                                    ),
                                    Text(
                                      'Bal: $balAfter',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String id, String label) {
    final selected = _filter == id;
    return GestureDetector(
      onTap: () => setState(() => _filter = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.borderLight,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: selected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _QuickLinksBar extends StatelessWidget {
  const _QuickLinksBar({
    required this.onAddresses,
    required this.onOrders,
    required this.onWishlist,
    required this.onSettings,
  });

  final VoidCallback onAddresses;
  final VoidCallback onOrders;
  final VoidCallback onWishlist;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.headerFadeBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          _QuickLink(
            icon: Icons.location_on_outlined,
            label: 'Addresses',
            onTap: onAddresses,
          ),
          _QuickLink(
            icon: Icons.receipt_long_outlined,
            label: 'Orders',
            onTap: onOrders,
          ),
          _QuickLink(
            icon: Icons.favorite_border_rounded,
            label: 'Wishlist',
            onTap: onWishlist,
          ),
          _QuickLink(
            icon: Icons.settings_outlined,
            label: 'Settings',
            onTap: onSettings,
          ),
        ],
      ),
    );
  }
}

class _QuickLink extends StatelessWidget {
  const _QuickLink({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          child: Column(
            children: [
              Icon(icon, color: AppColors.primary, size: 22),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                  height: 1.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentOrderItemsSection extends StatelessWidget {
  const _RecentOrderItemsSection({
    required this.items,
    required this.loading,
  });

  final List<OrderItem> items;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Buy Again',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        const Text(
          'Items from your recent orders',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 12),
        if (loading)
          SizedBox(
            height: 148,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: 4,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (_, _) => Container(
                width: 112,
                decoration: BoxDecoration(
                  color: AppColors.mobileSurface,
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          )
        else
          SizedBox(
            height: 220,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, index) => BuyAgainCard(item: items[index]),
            ),
          ),
      ],
    );
  }
}

class _SavedAddressesSection extends StatelessWidget {
  const _SavedAddressesSection({
    required this.sectionKey,
    required this.addresses,
    required this.loading,
    required this.onAddAddress,
    required this.onEditAddress,
    required this.onDeleteAddress,
  });

  final Key sectionKey;
  final List<Address> addresses;
  final bool loading;
  final VoidCallback onAddAddress;
  final ValueChanged<Address> onEditAddress;
  final ValueChanged<Address> onDeleteAddress;

  @override
  Widget build(BuildContext context) {
    return Column(
      key: sectionKey,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Saved Addresses',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            TextButton.icon(
              onPressed: onAddAddress,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Add'),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                visualDensity: VisualDensity.compact,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Manage delivery addresses used at checkout.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
        ),
        const SizedBox(height: 12),
        if (loading)
          const SkeletonAddressList()
        else if (addresses.isEmpty)
          _ProfileEmptyAddressCard(onAdd: onAddAddress)
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: addresses.length,
            separatorBuilder: (context, _) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final address = addresses[index];
              return _SavedAddressCard(
                address: address,
                onEdit: () => onEditAddress(address),
                onDelete: () => onDeleteAddress(address),
              );
            },
          ),
      ],
    );
  }
}

class _ProfileEmptyAddressCard extends StatelessWidget {
  const _ProfileEmptyAddressCard({required this.onAdd});

  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.location_on_outlined,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'No saved addresses yet',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          const SizedBox(height: 6),
          const Text(
            'Add your shop address for faster checkout.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_rounded, size: 20),
              label: const Text('Add address'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SavedAddressCard extends StatelessWidget {
  const _SavedAddressCard({
    required this.address,
    required this.onEdit,
    required this.onDelete,
  });

  final Address address;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: address.isDefault
              ? AppColors.primary.withValues(alpha: 0.35)
              : AppColors.borderLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.storefront_outlined,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: AddressTileBody(address: address)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Edit'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onDelete,
                  icon: Icon(Icons.delete_outline_rounded,
                      size: 18, color: Colors.red.shade700),
                  label: Text(
                    'Remove',
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    side: BorderSide(color: Colors.red.shade200),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
