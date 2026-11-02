import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../config/theme.dart';
import '../../core/exceptions/api_exception.dart';
import '../../core/providers/app_providers.dart';

class ReferralCard extends ConsumerStatefulWidget {
  const ReferralCard({
    super.key,
    required this.wallet,
    required this.loading,
    required this.onRefresh,
  });

  final Map<String, dynamic>? wallet;
  final bool loading;
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<ReferralCard> createState() => _ReferralCardState();
}

class _ReferralCardState extends ConsumerState<ReferralCard> {
  final _controller = TextEditingController();
  bool _claiming = false;
  bool _claimed = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _notify(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _copy(String code) async {
    try {
      await Clipboard.setData(ClipboardData(text: code));
      _notify('Referral code copied');
    } catch (_) {
      _notify('Unable to copy. Please try again.');
    }
  }

  Future<void> _share(String code, String link, Rect? origin) async {
    try {
      await SharePlus.instance.share(
        ShareParams(
          title: 'Join BulkMobileMart',
          text: 'Join me on BulkMobileMart! Use my referral code $code.\n$link',
          sharePositionOrigin: origin,
        ),
      );
    } catch (_) {
      _notify('Unable to share. Please try again.');
    }
  }

  Future<void> _claim() async {
    if (_claiming || _controller.text.trim().isEmpty) return;
    setState(() {
      _claiming = true;
      _error = null;
      _success = null;
    });
    try {
      final message = await ref
          .read(apiServiceProvider)
          .claimReferralCode(_controller.text);
      if (!mounted) return;
      setState(() {
        _claimed = true;
        _success = message;
      });
      _controller.clear();
      await widget.onRefresh();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = apiErrorMessage(
            error,
            fallback: 'Unable to claim referral code. Please try again.',
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final referral = widget.wallet?['referral'] as Map<String, dynamic>?;
    final config = widget.wallet?['rewardsConfig'] as Map<String, dynamic>?;
    final code = referral?['code']?.toString() ?? '';
    final link = referral?['link']?.toString() ?? '';
    final enabled = config?['referralEnabled'] != false;
    final ready = !widget.loading && code.isNotEmpty;
    final count = referral?['referredUsersCount'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.people_outline_rounded, color: AppColors.primary),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Refer & Earn',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            enabled
                ? 'Invite friends to earn ${config?['referralRewardReferrer'] ?? 50} bonus points!'
                : 'Referral rewards are currently unavailable.',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
            ),
          ),
          if (count is num && count > 0) ...[
            const SizedBox(height: 6),
            Text(
              '$count friends invited',
              style: const TextStyle(fontSize: 12),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.headerFadeBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Your Referral Code',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                SelectableText(
                  widget.loading
                      ? 'Loading…'
                      : (code.isEmpty ? 'Code unavailable' : code),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: ready ? () => _copy(code) : null,
                        icon: const Icon(Icons.copy_rounded, size: 18),
                        label: const FittedBox(child: Text('Copy Code')),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Builder(
                        builder: (shareContext) => FilledButton.icon(
                          onPressed: ready && link.isNotEmpty
                              ? () {
                                  final box =
                                      shareContext.findRenderObject()
                                          as RenderBox?;
                                  final origin = box == null
                                      ? null
                                      : box.localToGlobal(Offset.zero) &
                                            box.size;
                                  _share(code, link, origin);
                                }
                              : null,
                          icon: const Icon(Icons.share_outlined, size: 18),
                          label: const FittedBox(child: Text('Share Link')),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (!widget.loading && widget.wallet == null) ...[
            const SizedBox(height: 8),
            TextButton(
              onPressed: widget.onRefresh,
              child: const Text('Retry loading referral code'),
            ),
          ],
          if (ready &&
              enabled &&
              referral?['referredBy'] == null &&
              !_claimed) ...[
            const SizedBox(height: 16),
            const Text(
              "Have a friend's referral code?",
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _controller,
              enabled: !_claiming,
              textCapitalization: TextCapitalization.characters,
              autocorrect: false,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _claim(),
              decoration: InputDecoration(
                labelText: 'Referral code',
                border: const OutlineInputBorder(),
                errorText: _error,
                errorMaxLines: 3,
              ),
            ),
            const SizedBox(height: 8),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: _controller,
              builder: (context, value, child) => FilledButton(
                onPressed: _claiming || value.text.trim().isEmpty
                    ? null
                    : _claim,
                child: Text(_claiming ? 'Claiming…' : 'Claim Bonus'),
              ),
            ),
          ],
          if (_success != null) ...[
            const SizedBox(height: 8),
            Semantics(
              liveRegion: true,
              child: Text(
                _success!,
                style: const TextStyle(color: AppColors.textPrimary),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
