import 'package:flutter/material.dart';

import '../../config/theme.dart';
import '../../core/utils/address_utils.dart';
import '../../models/address.dart';
import 'address_form.dart';

/// Opens a scrollable bottom sheet to add or edit a delivery address.
Future<void> showAddressFormSheet(
  BuildContext context, {
  required Map<String, String> initial,
  required Future<String?> Function(Map<String, String> form) onSubmit,
  String title = 'Add delivery address',
  List<AddressPhoneOption> phoneOptions = const [],
}) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      return _AddressFormSheet(
        title: title,
        initial: initial,
        phoneOptions: phoneOptions,
        onSubmit: onSubmit,
      );
    },
  );
}

class _AddressFormSheet extends StatefulWidget {
  const _AddressFormSheet({
    required this.title,
    required this.initial,
    required this.phoneOptions,
    required this.onSubmit,
  });

  final String title;
  final Map<String, String> initial;
  final List<AddressPhoneOption> phoneOptions;
  final Future<String?> Function(Map<String, String> form) onSubmit;

  @override
  State<_AddressFormSheet> createState() => _AddressFormSheetState();
}

class _AddressFormSheetState extends State<_AddressFormSheet> {
  bool _submitting = false;
  String? _error;

  Future<void> _submit(Map<String, String> form) async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    final error = await widget.onSubmit(form);
    if (!mounted) return;

    if (error == null) {
      Navigator.of(context).pop();
      return;
    }

    setState(() {
      _submitting = false;
      _error = error;
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.92,
        minChildSize: 0.55,
        maxChildSize: 0.96,
        builder: (context, scrollController) {
          return Column(
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderLight,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 12, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_error != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            _error!,
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      AddressForm(
                        key: ValueKey(widget.initial.toString()),
                        plain: true,
                        stackedActions: true,
                        isEditing: widget.title.toLowerCase().contains('edit'),
                        initial: widget.initial,
                        phoneOptions: widget.phoneOptions,
                        submitting: _submitting,
                        onCancel: () => Navigator.of(context).pop(),
                        onSubmit: _submit,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Opens a bottom sheet to pick from saved delivery addresses.
Future<String?> showAddressPickerSheet(
  BuildContext context, {
  required List<Address> addresses,
  required String? selectedId,
  required VoidCallback onAddNew,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (sheetContext) {
      return _AddressPickerSheet(
        addresses: addresses,
        selectedId: selectedId,
        onAddNew: () {
          Navigator.of(sheetContext).pop();
          onAddNew();
        },
      );
    },
  );
}

class _AddressPickerSheet extends StatelessWidget {
  const _AddressPickerSheet({
    required this.addresses,
    required this.selectedId,
    required this.onAddNew,
  });

  final List<Address> addresses;
  final String? selectedId;
  final VoidCallback onAddNew;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.55,
      minChildSize: 0.35,
      maxChildSize: 0.85,
      builder: (context, scrollController) {
        return Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.borderLight,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Choose delivery address',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.separated(
                controller: scrollController,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                itemCount: addresses.length + 1,
                separatorBuilder: (context, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  if (index == addresses.length) {
                    return OutlinedButton.icon(
                      onPressed: onAddNew,
                      icon: const Icon(Icons.add_rounded, size: 20),
                      label: const Text('Add new address'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    );
                  }

                  final address = addresses[index];
                  final selected = address.id == selectedId;

                  return Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => Navigator.of(context).pop(address.id),
                      borderRadius: BorderRadius.circular(14),
                      child: Ink(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: selected
                                ? AppColors.primary
                                : AppColors.borderLight,
                            width: selected ? 1.5 : 1,
                          ),
                          color: selected
                              ? AppColors.primary.withValues(alpha: 0.05)
                              : const Color(0xFFFAFAFA),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              selected
                                  ? Icons.radio_button_checked_rounded
                                  : Icons.radio_button_off_rounded,
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.textMuted,
                              size: 22,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _AddressTileBody(address: address),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

class AddressTileBody extends StatelessWidget {
  const AddressTileBody({super.key, required this.address});

  final Address address;

  @override
  Widget build(BuildContext context) {
    return _AddressTileBody(address: address);
  }
}

class _AddressTileBody extends StatelessWidget {
  const _AddressTileBody({required this.address});

  final Address address;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                getAddressFullName(address),
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
            ),
            if (address.isDefault)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: const Text(
                  'Default',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
              ),
          ],
        ),
        if (address.shopName.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            address.shopName,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
        const SizedBox(height: 4),
        Text(
          formatAddressLine(address),
          maxLines: 3,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.textSecondary,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '+91 ${address.number}',
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.textMuted,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
