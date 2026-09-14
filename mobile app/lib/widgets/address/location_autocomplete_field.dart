import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../config/theme.dart';

class LocationAutocompleteField extends StatefulWidget {
  const LocationAutocompleteField({
    super.key,
    required this.controller,
    required this.hint,
    required this.fetchSuggestions,
    this.enabled = true,
    this.keyboardType,
    this.maxLength,
    this.inputFormatters,
    this.onSelected,
    this.onChanged,
    this.errorText,
  });

  final TextEditingController controller;
  final String hint;
  final Future<List<String>> Function(String query) fetchSuggestions;
  final bool enabled;
  final TextInputType? keyboardType;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onSelected;
  final ValueChanged<String>? onChanged;
  final String? errorText;

  @override
  State<LocationAutocompleteField> createState() => _LocationAutocompleteFieldState();
}

class _LocationAutocompleteFieldState extends State<LocationAutocompleteField> {
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;
  List<String> _suggestions = [];
  bool _loading = false;
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _removeOverlay();
    super.dispose();
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  Future<void> _loadSuggestions(String query) async {
    if (!widget.enabled) return;

    setState(() => _loading = true);
    try {
      final items = await widget.fetchSuggestions(query);
      if (!mounted) return;
      setState(() {
        _suggestions = items;
        _loading = false;
      });
      _showOverlay();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _suggestions = const [];
        _loading = false;
      });
      _showOverlay();
    }
  }

  void _scheduleLoad(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 200), () {
      _loadSuggestions(query);
    });
  }

  void _showOverlay() {
    _removeOverlay();

    final overlay = Overlay.of(context);
    if (overlay == null) return;

    final renderBox = context.findRenderObject() as RenderBox?;
    final width = renderBox?.size.width ?? MediaQuery.of(context).size.width;

    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        width: width,
        child: CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: const Offset(0, 52),
          child: Material(
            elevation: 4,
            borderRadius: BorderRadius.circular(8),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 240),
              child: _loading
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: Text('Loading...', style: TextStyle(fontSize: 12)),
                    )
                  : _suggestions.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: Text('No suggestions found', style: TextStyle(fontSize: 12)),
                        )
                      : ListView.builder(
                          padding: EdgeInsets.zero,
                          shrinkWrap: true,
                          itemCount: _suggestions.length,
                          itemBuilder: (context, index) {
                            final item = _suggestions[index];
                            return ListTile(
                              dense: true,
                              title: Text(item, style: const TextStyle(fontSize: 14)),
                              onTap: () {
                                widget.controller.text = item;
                                widget.onSelected?.call(item);
                                _removeOverlay();
                              },
                            );
                          },
                        ),
            ),
          ),
        ),
      ),
    );

    overlay.insert(_overlayEntry!);
  }

  InputBorder _fieldBorder(Color color, {double width = 1}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: color, width: width),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;
    final errorColor = Colors.red.shade700;
    final errorFill = Colors.red.shade50;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CompositedTransformTarget(
          link: _layerLink,
          child: TextField(
            controller: widget.controller,
            enabled: widget.enabled,
            keyboardType: widget.keyboardType,
            maxLength: widget.maxLength,
            inputFormatters: widget.inputFormatters,
            decoration: InputDecoration(
              hintText: widget.hint,
              counterText: '',
              filled: true,
              fillColor: hasError
                  ? errorFill
                  : (widget.enabled
                      ? const Color(0xFFFAFAFA)
                      : Colors.grey.shade50),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              border: _fieldBorder(
                hasError ? errorColor : AppColors.borderLight,
              ),
              enabledBorder: _fieldBorder(
                hasError ? errorColor : AppColors.borderLight,
              ),
              focusedBorder: _fieldBorder(
                hasError ? errorColor : AppColors.primary,
                width: hasError ? 1.5 : 1.5,
              ),
              errorBorder: _fieldBorder(errorColor),
              focusedErrorBorder: _fieldBorder(errorColor, width: 1.5),
            ),
            onTap: () {
              if (!widget.enabled) return;
              _scheduleLoad(widget.controller.text);
            },
            onChanged: (value) {
              if (!widget.enabled) return;
              widget.onChanged?.call(value);
              _scheduleLoad(value);
            },
            onEditingComplete: _removeOverlay,
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 6),
          Text(
            widget.errorText!,
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
