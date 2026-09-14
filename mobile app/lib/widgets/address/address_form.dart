import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/theme.dart';
import '../../core/providers/app_providers.dart';
import '../../core/utils/address_utils.dart';
import 'location_autocomplete_field.dart';

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

class AddressForm extends ConsumerStatefulWidget {
  const AddressForm({
    super.key,
    this.initial,
    required this.onSubmit,
    required this.onCancel,
    this.submitting = false,
    this.plain = false,
    this.stackedActions = false,
    this.showSectionHeaders = true,
    this.isEditing = false,
    this.phoneOptions = const [],
  });

  final Map<String, String>? initial;
  final ValueChanged<Map<String, String>> onSubmit;
  final VoidCallback onCancel;
  final bool submitting;
  final bool plain;
  final bool stackedActions;
  final bool showSectionHeaders;
  final bool isEditing;
  final List<AddressPhoneOption> phoneOptions;

  @override
  ConsumerState<AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends ConsumerState<AddressForm> {
  late final Map<String, TextEditingController> _controllers;
  Map<String, String> _fieldErrors = const {};

  @override
  void initState() {
    super.initState();
    final initial = widget.initial ?? addressFormDefaults;
    _controllers = {
      for (final key in addressFormDefaults.keys)
        key: TextEditingController(text: initial[key] ?? ''),
    };
    _controllers['pincode']!.addListener(_onPincodeChanged);
    _controllers['state']!.addListener(_onLocationFieldChanged);
    _controllers['city']!.addListener(_onLocationFieldChanged);
  }

  void _onLocationFieldChanged() {
    if (mounted) setState(() {});
  }

  void _onPincodeChanged() {
    final pincode = _controllers['pincode']!.text.trim();
    if (pincode.length == 6) {
      unawaited(_handlePincodeLookup(pincode, overwriteExisting: false));
    }
  }

  @override
  void dispose() {
    _controllers['pincode']!.removeListener(_onPincodeChanged);
    _controllers['state']!.removeListener(_onLocationFieldChanged);
    _controllers['city']!.removeListener(_onLocationFieldChanged);
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Map<String, String> _currentForm() {
    return {
      for (final entry in _controllers.entries)
        entry.key: entry.value.text.trim(),
    };
  }

  void _clearCityAndPincode() {
    _controllers['city']!.text = '';
    _controllers['pincode']!.text = '';
  }

  void _clearPincode() {
    _controllers['pincode']!.text = '';
  }

  void _handleStateSelected(String value) {
    final previous = _controllers['state']!.text.trim();
    if (value.trim() != previous) {
      setState(_clearCityAndPincode);
    }
  }

  void _handleCitySelected(String value) {
    final previous = _controllers['city']!.text.trim();
    if (value.trim() != previous) {
      setState(_clearPincode);
    }
  }

  Future<void> _handlePincodeLookup(
    String pincode, {
    required bool overwriteExisting,
  }) async {
    if (pincode.length != 6) return;

    try {
      final result =
          await ref.read(apiServiceProvider).fetchLocationByPincode(pincode);
      if (!mounted || result == null) return;

      final state = result['state']?.toString().trim() ?? '';
      final city = result['city']?.toString().trim() ?? '';

      if (state.isNotEmpty &&
          (overwriteExisting || _controllers['state']!.text.trim().isEmpty)) {
        _controllers['state']!.text = state;
      }
      if (city.isNotEmpty &&
          (overwriteExisting || _controllers['city']!.text.trim().isEmpty)) {
        _controllers['city']!.text = city;
      }
      if (mounted) setState(() {});
    } catch (_) {
      // keep typed pincode
    }
  }

  void _clearFieldError(String field) {
    if (!_fieldErrors.containsKey(field)) return;
    final next = Map<String, String>.from(_fieldErrors)..remove(field);
    setState(() => _fieldErrors = next);
  }

  void _handleSubmit() {
    final form = _currentForm();
    final errors = collectAddressFormFieldErrors(form);
    if (errors.isNotEmpty) {
      setState(() => _fieldErrors = errors);
      return;
    }
    setState(() => _fieldErrors = const {});
    widget.onSubmit(form);
  }

  Widget _validationBanner() {
    if (_fieldErrors.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.warning_amber_rounded,
                  size: 20, color: Colors.red.shade700),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _fieldErrors.length == 1
                      ? 'Please fix the field below'
                      : 'Please fill all required fields',
                  style: TextStyle(
                    color: Colors.red.shade800,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          if (_fieldErrors.length > 1) ...[
            const SizedBox(height: 8),
            ..._fieldErrors.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(left: 28, bottom: 4),
                child: Text(
                  '• ${addressFieldLabels[entry.key] ?? entry.key}: ${entry.value}',
                  style: TextStyle(
                    color: Colors.red.shade700,
                    fontSize: 12,
                    height: 1.35,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final api = ref.read(apiServiceProvider);
    final stateValue = _controllers['state']!.text.trim();

    return LayoutBuilder(
      builder: (context, constraints) {
        final mobile = constraints.maxWidth < 560;
        final fieldGap = mobile ? 14.0 : 12.0;

        final formContent = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_fieldErrors.isNotEmpty) ...[
              _validationBanner(),
              SizedBox(height: fieldGap),
            ],
            if (widget.showSectionHeaders) ...[
              _sectionTitle('Contact details'),
              SizedBox(height: fieldGap - 4),
            ],
            if (mobile) ...[
              _field('fullName', 'Full name', label: 'Full name'),
              SizedBox(height: fieldGap),
              if (_phonePickerVisible) ...[
                _phoneNumberPicker(),
                SizedBox(height: fieldGap),
              ],
              _field(
                'number',
                'Mobile number',
                label: 'Mobile number',
                keyboardType: TextInputType.phone,
                maxLength: 10,
                prefixText: '+91 ',
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              ),
            ] else
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _field('fullName', 'Full name', label: 'Full name')),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_phonePickerVisible) ...[
                          _phoneNumberPicker(),
                          const SizedBox(height: 12),
                        ],
                        _field(
                          'number',
                          'Mobile number',
                          label: 'Mobile number',
                          keyboardType: TextInputType.phone,
                          maxLength: 10,
                          prefixText: '+91 ',
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            SizedBox(height: fieldGap),
            _field(
              'email',
              'Email address',
              label: 'Email address',
              keyboardType: TextInputType.emailAddress,
            ),
            SizedBox(height: fieldGap + 2),
            if (widget.showSectionHeaders) ...[
              _sectionTitle('Shop details'),
              SizedBox(height: fieldGap - 4),
            ],
            if (mobile) ...[
              _field('shopName', 'Shop / business name', label: 'Shop name'),
              SizedBox(height: fieldGap),
              _field('shopNo', 'Shop number / unit', label: 'Shop no.'),
            ] else
              Row(
                children: [
                  Expanded(
                    child: _field('shopNo', 'Shop number', label: 'Shop no.'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _field('shopName', 'Shop name', label: 'Shop name'),
                  ),
                ],
              ),
            SizedBox(height: fieldGap + 2),
            if (widget.showSectionHeaders) ...[
              _sectionTitle('Delivery location'),
              SizedBox(height: fieldGap - 4),
            ],
            _field(
              'fullAddress',
              'House no., street, area',
              label: 'Full address',
              maxLines: 3,
            ),
            SizedBox(height: fieldGap),
            _field(
              'landmark',
              'Nearby landmark (for easy delivery)',
              label: 'Landmark',
            ),
            SizedBox(height: fieldGap),
            if (mobile) ...[
              _locationField(
                label: 'State',
                child: LocationAutocompleteField(
                  controller: _controllers['state']!,
                  hint: 'Select or type state',
                  errorText: _fieldErrors['state'],
                  fetchSuggestions: (query) => api.fetchLocationStates(q: query),
                  onSelected: _handleStateSelected,
                  onChanged: (_) {
                    _clearFieldError('state');
                    setState(() {});
                  },
                ),
              ),
              SizedBox(height: fieldGap),
              _locationField(
                label: 'City',
                child: LocationAutocompleteField(
                  controller: _controllers['city']!,
                  hint: stateValue.isEmpty
                      ? 'Type state first (optional)'
                      : 'Select or type city',
                  errorText: _fieldErrors['city'],
                  fetchSuggestions: (query) {
                    final state = _controllers['state']!.text.trim();
                    if (state.isEmpty) return Future.value(const <String>[]);
                    return api.fetchLocationCities(state: state, q: query);
                  },
                  onSelected: _handleCitySelected,
                  onChanged: (_) {
                    _clearFieldError('city');
                    setState(() {});
                  },
                ),
              ),
              SizedBox(height: fieldGap),
              _field(
                'pincode',
                '6-digit pincode',
                label: 'Pincode',
                keyboardType: TextInputType.number,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              ),
            ] else
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: LocationAutocompleteField(
                      controller: _controllers['state']!,
                      hint: 'State',
                      errorText: _fieldErrors['state'],
                      fetchSuggestions: (query) =>
                          api.fetchLocationStates(q: query),
                      onSelected: _handleStateSelected,
                      onChanged: (_) {
                        _clearFieldError('state');
                        setState(() {});
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: LocationAutocompleteField(
                      controller: _controllers['city']!,
                      hint: stateValue.isEmpty ? 'State first' : 'City',
                      errorText: _fieldErrors['city'],
                      fetchSuggestions: (query) {
                        final state = _controllers['state']!.text.trim();
                        if (state.isEmpty) return Future.value(const <String>[]);
                        return api.fetchLocationCities(state: state, q: query);
                      },
                      onSelected: _handleCitySelected,
                      onChanged: (_) {
                        _clearFieldError('city');
                        setState(() {});
                      },
                    ),
                  ),
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
            SizedBox(height: fieldGap + 4),
            _buildActions(mobile),
          ],
        );

        if (widget.plain) return formContent;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: formContent,
        );
      },
    );
  }

  Widget _locationField({required String label, required Widget child}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }

  bool get _phonePickerVisible =>
      !widget.isEditing && widget.phoneOptions.isNotEmpty;

  Widget _phoneNumberPicker() {
    final current = normalizeIndianMobile(_controllers['number']!.text);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Choose mobile number',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final option in widget.phoneOptions)
              ChoiceChip(
                label: Text(
                  '${option.label}\n+91 ${option.number}',
                  style: const TextStyle(fontSize: 12, height: 1.25),
                ),
                selected: current == option.number,
                selectedColor: AppColors.primary.withValues(alpha: 0.15),
                onSelected: (_) {
                  _controllers['number']!.text = option.number;
                  _clearFieldError('number');
                  setState(() {});
                },
              ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Or type a different number below',
          style: TextStyle(
            fontSize: 11,
            color: AppColors.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
        letterSpacing: 0.2,
      ),
    );
  }

  Widget _buildActions(bool mobile) {
    if (widget.stackedActions || mobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton(
            onPressed: widget.submitting ? null : _handleSubmit,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              widget.submitting
                  ? 'Saving address...'
                  : widget.isEditing
                      ? 'Save changes'
                      : 'Save delivery address',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: widget.onCancel,
            child: const Text('Cancel'),
          ),
        ],
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        TextButton(onPressed: widget.onCancel, child: const Text('Cancel')),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: widget.submitting ? null : _handleSubmit,
          child: Text(widget.submitting ? 'Saving...' : 'Save Address'),
        ),
      ],
    );
  }

  Widget _field(
    String name,
    String hint, {
    String? label,
    TextInputType? keyboardType,
    int maxLines = 1,
    int? maxLength,
    String? prefixText,
    List<TextInputFormatter>? inputFormatters,
  }) {
    final error = _fieldErrors[name];
    final hasError = error != null && error.isNotEmpty;
    final errorColor = Colors.red.shade700;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: hasError ? errorColor : AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
        ],
        TextField(
          controller: _controllers[name],
          keyboardType: keyboardType,
          maxLines: maxLines,
          maxLength: maxLength,
          inputFormatters: inputFormatters,
          decoration: InputDecoration(
            hintText: hint,
            counterText: '',
            prefixText: prefixText,
            filled: true,
            fillColor: hasError ? Colors.red.shade50 : const Color(0xFFFAFAFA),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: hasError ? errorColor : AppColors.borderLight,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: hasError ? errorColor : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color: hasError ? errorColor : AppColors.primary,
                width: 1.5,
              ),
            ),
          ),
          onChanged: (_) => _clearFieldError(name),
        ),
        if (hasError) ...[
          const SizedBox(height: 6),
          Text(
            error,
            style: TextStyle(
              color: errorColor,
              fontSize: 12,
              height: 1.3,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ],
    );
  }
}
