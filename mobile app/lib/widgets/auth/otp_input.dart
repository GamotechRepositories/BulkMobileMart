import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:smart_auth/smart_auth.dart';

class OtpInput extends StatefulWidget {
  const OtpInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.length = 6,
    this.enabled = true,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final int length;
  final bool enabled;

  @override
  State<OtpInput> createState() => _OtpInputState();
}

class _OtpInputState extends State<OtpInput> {
  late final List<TextEditingController> _controllers;
  late final List<FocusNode> _focusNodes;
  late final TextEditingController _autofillController;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(widget.length, (_) => TextEditingController());
    _focusNodes = List.generate(widget.length, (_) => FocusNode());
    _autofillController = TextEditingController();
    _syncFromValue(widget.value);
    _listenForSmsOtp();
  }

  @override
  void didUpdateWidget(covariant OtpInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      _syncFromValue(widget.value);
      if (_autofillController.text != widget.value) {
        _autofillController.value = TextEditingValue(
          text: widget.value,
          selection: TextSelection.collapsed(offset: widget.value.length),
        );
      }
    }
    if (oldWidget.enabled != widget.enabled) {
      for (final node in _focusNodes) {
        if (!widget.enabled) node.unfocus();
      }
    }
  }

  Future<void> _listenForSmsOtp() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    if (!widget.enabled) return;

    try {
      final result = await SmartAuth.instance.getSmsWithUserConsentApi(
        matcher: '\\d{${widget.length}}',
      );
      if (!mounted || !widget.enabled) return;
      if (!result.hasData) return;

      final code = result.requireData.code;
      if (code == null || code.isEmpty) return;
      _handlePaste(code);
    } catch (_) {
      // Manual entry still works if SMS listening fails.
    }
  }

  void _syncFromValue(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    for (var i = 0; i < widget.length; i++) {
      final digit = i < digits.length ? digits[i] : '';
      if (_controllers[i].text != digit) {
        _controllers[i].text = digit;
      }
    }
  }

  void _emitValue() {
    final next = _controllers.map((controller) => controller.text).join();
    widget.onChanged(next);
  }

  void _handleChanged(int index, String raw) {
    final digit = raw.replaceAll(RegExp(r'\D'), '');
    if (digit.length > 1) {
      _handlePaste(digit);
      return;
    }

    _controllers[index].text = digit;
    _emitValue();

    if (digit.isNotEmpty && index < widget.length - 1) {
      _focusNodes[index + 1].requestFocus();
    }
  }

  void _handlePaste(String pasted) {
    final cleaned = pasted.replaceAll(RegExp(r'\D'), '');
    final digits = cleaned.length > widget.length
        ? cleaned.substring(0, widget.length)
        : cleaned;
    for (var i = 0; i < widget.length; i++) {
      _controllers[i].text = i < digits.length ? digits[i] : '';
    }
    if (_autofillController.text != digits) {
      _autofillController.value = TextEditingValue(
        text: digits,
        selection: TextSelection.collapsed(offset: digits.length),
      );
    }
    _emitValue();
    final focusIndex = digits.length.clamp(0, widget.length - 1);
    _focusNodes[focusIndex].requestFocus();
    if (digits.length >= widget.length) {
      TextInput.finishAutofillContext(shouldSave: false);
    }
  }

  @override
  void dispose() {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      SmartAuth.instance.removeUserConsentApiListener();
    }
    _autofillController.dispose();
    for (final controller in _controllers) {
      controller.dispose();
    }
    for (final node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AutofillGroup(
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Catches iOS/Android keyboard OTP suggestions for the full code.
          Opacity(
            opacity: 0,
            child: SizedBox(
              width: 1,
              height: 1,
              child: TextField(
                controller: _autofillController,
                enabled: widget.enabled,
                autofillHints: const [AutofillHints.oneTimeCode],
                keyboardType: TextInputType.number,
                maxLength: widget.length,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  counterText: '',
                ),
                onChanged: (value) {
                  if (value.isEmpty) return;
                  _handlePaste(value);
                },
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.length, (index) {
              return Padding(
                padding: EdgeInsets.only(left: index == 0 ? 0 : 6),
                child: SizedBox(
                  width: 42,
                  height: 48,
                  child: TextField(
                    controller: _controllers[index],
                    focusNode: _focusNodes[index],
                    enabled: widget.enabled,
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.number,
                    textInputAction: index == widget.length - 1
                        ? TextInputAction.done
                        : TextInputAction.next,
                    maxLength: 1,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                    decoration: InputDecoration(
                      counterText: '',
                      contentPadding: EdgeInsets.zero,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    onChanged: (value) => _handleChanged(index, value),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
