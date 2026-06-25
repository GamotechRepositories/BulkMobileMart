import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../config/app_decorations.dart';
import '../../../config/constants.dart';
import '../../../config/theme.dart';
import '../../../core/image/image_constants.dart';
import '../../../core/image/image_variant.dart';
import '../../../routes/route_paths.dart';
import '../../../widgets/common/app_network_image.dart';

class HomeWholesaleBanner extends StatelessWidget {
  const HomeWholesaleBanner({super.key});

  Future<void> _openWhatsApp() async {
    final uri = Uri.parse(AppConstants.whatsAppUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppDecorations.radiusLg),
        child: Stack(
          children: [
            SizedBox(
              height: 168,
              width: double.infinity,
              child: AppNetworkImage(
                imageUrl: AppConstants.promoBannerImage,
                variant: ImageVariant.banner,
                fit: BoxFit.cover,
                cacheWidth: ImageConstants.heroBanner.width,
                cacheHeight: ImageConstants.heroBanner.height,
              ),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: 0.82),
                      Colors.black.withValues(alpha: 0.45),
                      Colors.black.withValues(alpha: 0.1),
                    ],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                ),
              ),
            ),
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RichText(
                      text: const TextSpan(
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          height: 1.25,
                        ),
                        children: [
                          TextSpan(text: 'Bulk Mobile Accessories at '),
                          TextSpan(
                            text: 'Wholesale Prices',
                            style: TextStyle(color: AppColors.primary),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'MOQ ${AppConstants.moq} pieces · Pan-India delivery · Best deals for retailers',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.white.withValues(alpha: 0.9),
                        height: 1.35,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        FilledButton.icon(
                          onPressed: _openWhatsApp,
                          icon: const Icon(Icons.chat, size: 16),
                          label: const Text('WhatsApp'),
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF25D366),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8,
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          onPressed: () => context.push(RoutePaths.support),
                          icon: const Icon(Icons.support_agent_outlined, size: 16),
                          label: const Text('Support'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white, width: 1.5),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8,
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            textStyle: const TextStyle(
                              inherit: false,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
