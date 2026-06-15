import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/theme.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/utils/upi_payment.dart';
import '../../widgets/common/image_source_sheet.dart';

class PaymentModal extends StatefulWidget {
  const PaymentModal({
    super.key,
    required this.paymentMethod,
    required this.orderTotal,
    required this.onPayWithRazorpay,
    required this.onSubmitUpiProof,
    required this.onUploadScreenshot,
    this.processing = false,
    this.error = '',
  });

  final String paymentMethod;
  final double orderTotal;
  final VoidCallback onPayWithRazorpay;
  final Future<void> Function({
    required String screenshotUrl,
    required String screenshotName,
    required String upiTransactionRef,
  }) onSubmitUpiProof;
  final Future<String> Function(String filePath) onUploadScreenshot;
  final bool processing;
  final String error;

  @override
  State<PaymentModal> createState() => _PaymentModalState();
}

class _PaymentModalState extends State<PaymentModal> {
  static const _maxScreenshotBytes = 5 * 1024 * 1024;

  final _picker = ImagePicker();
  String? _screenshotUrl;
  String? _screenshotName;
  String _upiTransactionRef = '';
  String? _uploadError;
  bool _uploadingScreenshot = false;
  String _upiHint = '';

  bool get _isCod => widget.paymentMethod == 'cod';

  double get _payableAmount =>
      UpiPayment.getPayableAmount(widget.orderTotal, widget.paymentMethod);

  String get _paymentNote => _isCod ? 'COD Advance' : 'Order Payment';

  Future<void> _pickScreenshot() async {
    final source = await showImageSourceSheet(context);
    if (source == null) return;

    final picked = await _picker.pickImage(source: source);
    if (picked == null) return;

    final file = File(picked.path);
    final bytes = await file.length();
    if (bytes > _maxScreenshotBytes) {
      setState(() => _uploadError = 'Image must be under 5 MB');
      return;
    }

    setState(() {
      _uploadingScreenshot = true;
      _uploadError = null;
    });

    try {
      final url = await widget.onUploadScreenshot(picked.path);
      if (!mounted) return;
      setState(() {
        _screenshotUrl = url;
        _screenshotName = picked.name;
        _uploadingScreenshot = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _uploadError = 'Failed to upload screenshot';
        _screenshotUrl = null;
        _screenshotName = null;
        _uploadingScreenshot = false;
      });
    }
  }

  Future<void> _payViaApp() async {
    setState(() => _upiHint = '');
    final uri = Uri.parse(UpiPayment.buildUpiUri(_payableAmount, note: _paymentNote));
    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!mounted) return;
    setState(() {
      _upiHint = launched
          ? 'Choose GPay, PhonePe, or Paytm.'
          : 'Could not open UPI app. Scan the QR code instead.';
    });
  }

  Future<void> _submitProof() async {
    if (_screenshotUrl == null) {
      setState(() => _uploadError = 'Please upload your payment screenshot');
      return;
    }

    setState(() => _uploadError = null);
    await widget.onSubmitUpiProof(
      screenshotUrl: _screenshotUrl!,
      screenshotName: _screenshotName ?? 'screenshot.jpg',
      upiTransactionRef: _upiTransactionRef.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final qrUrl = UpiPayment.getQrCodeImageUrl(_payableAmount, note: _paymentNote);
    final displayError = widget.error.isNotEmpty ? widget.error : (_uploadError ?? '');

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400, maxHeight: 560),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 4, 8),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Complete Payment',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ),
                  IconButton(
                    onPressed: widget.processing ? null : () => Navigator.pop(context),
                    icon: const Icon(Icons.close, size: 20),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    if (displayError.isNotEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Text(
                          displayError,
                          style: TextStyle(color: Colors.red.shade700, fontSize: 12),
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Text(
                            _isCod ? 'COD advance (10%)' : 'Amount to pay',
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                          Text(
                            formatInr(_payableAmount, withDecimals: true),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                              color: AppColors.primary,
                            ),
                          ),
                          if (_isCod)
                            Text(
                              'Total ${formatInr(widget.orderTotal, withDecimals: true)} · Balance on delivery',
                              style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.borderLight),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'Scan QR to pay',
                            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                              imageUrl: qrUrl,
                              width: 112,
                              height: 112,
                              fit: BoxFit.contain,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Use any UPI app',
                            style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              onPressed: widget.processing ? null : _payViaApp,
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF25D366),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                              icon: const Icon(Icons.chat, size: 16),
                              label: const Text('Pay via App', style: TextStyle(fontSize: 12)),
                            ),
                          ),
                          if (_upiHint.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            Text(
                              _upiHint,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.mobileSurface.withValues(alpha: 0.6),
                        border: Border.all(color: AppColors.borderLight),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Upload screenshot',
                            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                          ),
                          const Text(
                            'After payment, upload your UPI screenshot.',
                            style: TextStyle(fontSize: 10, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 8),
                          if (_screenshotUrl != null)
                            Column(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: CachedNetworkImage(
                                    imageUrl: _screenshotUrl!,
                                    height: 64,
                                    width: double.infinity,
                                    fit: BoxFit.contain,
                                  ),
                                ),
                                TextButton(
                                  onPressed: widget.processing
                                      ? null
                                      : () => setState(() {
                                            _screenshotUrl = null;
                                            _screenshotName = null;
                                            _uploadError = null;
                                          }),
                                  child: const Text(
                                    'Remove',
                                    style: TextStyle(fontSize: 11, color: Colors.red),
                                  ),
                                ),
                              ],
                            )
                          else
                            OutlinedButton.icon(
                              onPressed: widget.processing || _uploadingScreenshot
                                  ? null
                                  : _pickScreenshot,
                              icon: const Icon(Icons.upload_file, size: 16),
                              label: Text(
                                _uploadingScreenshot ? 'Uploading...' : 'Choose screenshot',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                          const SizedBox(height: 8),
                          TextField(
                            enabled: !widget.processing,
                            decoration: const InputDecoration(
                              hintText: 'UPI Transaction ID (optional)',
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            ),
                            style: const TextStyle(fontSize: 12),
                            onChanged: (value) => _upiTransactionRef = value,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: widget.processing ||
                              _uploadingScreenshot ||
                              _screenshotUrl == null
                          ? null
                          : _submitProof,
                      child: Text(widget.processing ? 'Sending...' : 'Send screenshot'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: widget.processing ? null : widget.onPayWithRazorpay,
                      child: Text(
                        widget.processing ? 'Processing...' : 'Pay via Razorpay instead',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
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
