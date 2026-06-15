import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../config/theme.dart';
import '../../core/utils/address_utils.dart';

const addressFormDefaults = <String, String>{
  'fullName': '',
  'number': '',
  'email': '',
  'shopNo': '',
  'shopName': '',
  'fullAddress': '',
  'landmark': '',
  'city': '',
  'state': '',
  'pincode': '',
};

class AddressForm extends StatefulWidget {
  const AddressForm({
    super.key,
    this.initial,
    required this.onSubmit,
    required this.onCancel,
    this.submitting = false,
  });

  final Map<String, String>? initial;
  final ValueChanged<Map<String, String>> onSubmit;
  final VoidCallback onCancel;
  final bool submitting;

  @override
  State<AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends State<AddressForm> {
  late final Map<String, TextEditingController> _controllers;
  String? _validationError;

  @override
  void initState() {
    super.initState();
    final initial = widget.initial ?? addressFormDefaults;
    _controllers = {
      for (final key in addressFormDefaults.keys)
        key: TextEditingController(text: initial[key] ?? ''),
    };
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _handleSubmit() {
    final form = {
      for (final entry in _controllers.entries)
        entry.key: entry.value.text.trim(),
    };
    final error = validateAddressForm(form);
    if (error != null) {
      setState(() => _validationError = error);
      return;
    }
    widget.onSubmit(form);
  }

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
          if (_validationError != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _validationError!,
                style: TextStyle(color: Colors.red.shade700, fontSize: 13),
              ),
            ),
            const SizedBox(height: 12),
          ],
          Row(
            children: [
              Expanded(child: _field('fullName', 'Full name')),
              const SizedBox(width: 12),
              Expanded(
                child: _field(
                  'number',
                  'Number',
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _field('email', 'Email ID', keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _field('shopNo', 'Shop no.')),
              const SizedBox(width: 12),
              Expanded(child: _field('shopName', 'Shop name')),
            ],
          ),
          const SizedBox(height: 12),
          _field('fullAddress', 'Full address', maxLines: 2),
          const SizedBox(height: 12),
          _field('landmark', 'Landmark'),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _field('city', 'City')),
              const SizedBox(width: 12),
              Expanded(child: _field('state', 'State')),
              const SizedBox(width: 12),
              Expanded(
                child: _field(
                  'pincode',
                  'Pincode',
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: widget.onCancel, child: const Text('Cancel')),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: widget.submitting ? null : _handleSubmit,
                child: Text(widget.submitting ? 'Saving...' : 'Save Address'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _field(
    String name,
    String hint, {
    TextInputType? keyboardType,
    int maxLines = 1,
    int? maxLength,
    List<TextInputFormatter>? inputFormatters,
  }) {
    return TextField(
      controller: _controllers[name],
      keyboardType: keyboardType,
      maxLines: maxLines,
      maxLength: maxLength,
      inputFormatters: inputFormatters,
      decoration: InputDecoration(
        hintText: hint,
        counterText: '',
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      ),
      onChanged: (_) {
        if (_validationError != null) {
          setState(() => _validationError = null);
        }
      },
    );
  }
}
