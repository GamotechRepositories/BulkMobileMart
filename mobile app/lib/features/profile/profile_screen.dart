import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/theme.dart';
import '../../core/utils/address_utils.dart';
import '../../features/address/address_controller.dart';
import '../../features/auth/auth_controller.dart';
import '../../models/address.dart';
import '../../widgets/address/address_form.dart';
import '../../widgets/common/refreshable_body.dart';
import '../../widgets/common/skeleton_loaders.dart';
import '../../core/providers/package_info_provider.dart';
import '../../config/app_info.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _showAddressForm = false;
  Address? _editingAddress;
  bool _savingAddress = false;
  String? _formError;

  Future<void> _handleSaveAddress(Map<String, String> form) async {
    setState(() {
      _savingAddress = true;
      _formError = null;
    });

    final error = await ref.read(addressControllerProvider.notifier).saveAddress(
          form,
          editing: _editingAddress,
          makeDefault: _editingAddress == null &&
              ref.read(addressControllerProvider).addresses.isEmpty,
        );

    if (!mounted) return;

    setState(() {
      _savingAddress = false;
      if (error == null) {
        _showAddressForm = false;
        _editingAddress = null;
      } else {
        _formError = error;
      }
    });
  }

  Future<void> _handleDeleteAddress(Address address) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete address?'),
        content: const Text('This address will be removed from your account.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
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

  Future<void> _refreshProfile() async {
    await ref.read(addressControllerProvider.notifier).loadAddresses();
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

    final packageInfo = ref.watch(packageInfoProvider);

    return RefreshIndicator(
      onRefresh: _refreshProfile,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      children: [
        Text(
          'Profile',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _infoField('Name', user.name),
              const SizedBox(height: 16),
              _infoField('Email', user.email),
              const SizedBox(height: 16),
              _infoField('Phone Number', user.phone.isNotEmpty ? user.phone : 'Not provided'),
              const Divider(height: 32),
              Row(
                children: [
                  const Text(
                    'Saved Addresses',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const Spacer(),
                  if (!_showAddressForm)
                    TextButton(
                      onPressed: () => setState(() {
                        _editingAddress = null;
                        _showAddressForm = true;
                        _formError = null;
                      }),
                      child: const Text('+ Add Address'),
                    ),
                ],
              ),
              if (_formError != null && !_showAddressForm) ...[
                const SizedBox(height: 8),
                Text(_formError!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ],
              if (_showAddressForm) ...[
                const SizedBox(height: 12),
                AddressForm(
                  initial: _editingAddress != null
                      ? mapAddressToForm(_editingAddress!)
                      : null,
                  submitting: _savingAddress,
                  onCancel: () => setState(() {
                    _showAddressForm = false;
                    _editingAddress = null;
                    _formError = null;
                  }),
                  onSubmit: _handleSaveAddress,
                ),
                if (_formError != null) ...[
                  const SizedBox(height: 8),
                  Text(_formError!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
                ],
              ] else if (addressesLoading)
                const SkeletonAddressList()
              else if (addresses.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'No saved addresses yet.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              else
                ...addresses.map(
                  (address) => Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: _AddressCard(
                      address: address,
                      onEdit: () => setState(() {
                        _editingAddress = address;
                        _showAddressForm = true;
                        _formError = null;
                      }),
                      onDelete: () => _handleDeleteAddress(address),
                    ),
                  ),
                ),
              const Divider(height: 32),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => ref.read(authControllerProvider.notifier).logout(),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Logout'),
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: packageInfo.when(
                  loading: () => Text(
                    '${AppInfo.name} v${AppInfo.version}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                  error: (_, _) => Text(
                    '${AppInfo.name} v${AppInfo.version}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                  data: (info) => Text(
                    '${AppInfo.name} v${info.version} (${info.buildNumber})',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
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

  Widget _infoField(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 16)),
      ],
    );
  }
}

class _AddressCard extends StatelessWidget {
  const _AddressCard({
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.mobileSurface.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  getAddressFullName(address),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              if (address.isDefault)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'DEFAULT',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            formatAddressLine(address),
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 4),
          Text('+91 ${address.number}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 10),
          Row(
            children: [
              TextButton(onPressed: onEdit, child: const Text('Edit')),
              TextButton(
                onPressed: onDelete,
                child: const Text('Delete', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
