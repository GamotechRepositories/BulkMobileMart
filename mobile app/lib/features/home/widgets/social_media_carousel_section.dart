import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../config/contact.dart';
import '../../../config/theme.dart';
import '../../../core/utils/external_link.dart';
import '../../../widgets/common/auto_horizontal_scroll.dart';
import 'home_section_card.dart';

class SocialMediaCarouselSection extends StatelessWidget {
  const SocialMediaCarouselSection({super.key});

  static const _cardWidth = 120.0;
  static const _cardHeight = 100.0;

  @override
  Widget build(BuildContext context) {
    final links = ContactConfig.socialLinks;
    if (links.isEmpty) return const SizedBox.shrink();

    return HomeSectionCard(
      margin: const EdgeInsets.fromLTRB(0, 4, 0, 8),
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
      showDivider: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Connect With Us',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Join our community and follow us on social media',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary.withValues(alpha: 0.95),
            ),
          ),
          const SizedBox(height: 14),
          AutoHorizontalScroll(
            height: _cardHeight,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: links.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) => _SocialLinkCard(
                link: links[i],
                onTap: () => openExternalUrl(
                  links[i].href,
                  context: context,
                  errorMessage: 'Could not open ${links[i].label}.',
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SocialLinkCard extends StatelessWidget {
  const _SocialLinkCard({
    required this.link,
    required this.onTap,
  });

  final SocialLink link;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final styles = _platformStyles(link.platform);

    return SizedBox(
      width: SocialMediaCarouselSection._cardWidth,
      height: SocialMediaCarouselSection._cardHeight,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: styles.borderColor),
              gradient: styles.cardGradient,
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0D000000),
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    gradient: styles.iconGradient,
                    color: styles.iconGradient == null ? styles.iconColor : null,
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x14000000),
                        blurRadius: 4,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: _SocialPlatformIcon(platform: link.platform),
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Text(
                    link.label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      height: 1.15,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PlatformStyles {
  const _PlatformStyles({
    required this.borderColor,
    required this.cardGradient,
    this.iconGradient,
    this.iconColor,
  });

  final Color borderColor;
  final Gradient cardGradient;
  final Gradient? iconGradient;
  final Color? iconColor;
}

_PlatformStyles _platformStyles(String platform) {
  switch (platform) {
    case 'instagram':
      return const _PlatformStyles(
        borderColor: Color(0xFFFBCFE8),
        cardGradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF1F2), Color(0xFFFDF4FF), Colors.white],
        ),
        iconGradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF58529), Color(0xFFDD2A7B), Color(0xFF8134AF)],
        ),
      );
    case 'facebook':
      return const _PlatformStyles(
        borderColor: Color(0xFFBFDBFE),
        cardGradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFEFF6FF), Colors.white],
        ),
        iconColor: Color(0xFF1877F2),
      );
    default:
      return const _PlatformStyles(
        borderColor: Color(0xFFBBF7D0),
        cardGradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF0FDF4), Colors.white],
        ),
        iconColor: Color(0xFF22C55E),
      );
  }
}

class _SocialPlatformIcon extends StatelessWidget {
  const _SocialPlatformIcon({required this.platform});

  final String platform;

  @override
  Widget build(BuildContext context) {
    switch (platform) {
      case 'instagram':
        return const Icon(Icons.camera_alt_outlined, size: 20, color: Colors.white);
      case 'facebook':
        return const Icon(Icons.facebook, size: 22, color: Colors.white);
      default:
        return SvgPicture.asset(
          'assets/images/whatsapp.svg',
          width: 20,
          height: 20,
          colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
        );
    }
  }
}
