import 'package:flutter/material.dart';

import 'theme.dart';

/// Shared spacing, radii, and shadows for a consistent storefront UI.
class AppDecorations {
  AppDecorations._();

  static const double radiusSm = 8;
  static const double radiusMd = 12;
  static const double radiusLg = 16;
  static const double radiusXl = 20;

  /// Matches [MobileHeader] home-tab bottom curve and home hero banner top curve.
  static const double homeShellCornerRadius = 22.0;

  static BorderRadius get homeShellTopRadius => const BorderRadius.only(
        topLeft: Radius.circular(homeShellCornerRadius),
        topRight: Radius.circular(homeShellCornerRadius),
      );

  static BorderRadius get homeShellBottomRadius => const BorderRadius.only(
        bottomLeft: Radius.circular(homeShellCornerRadius),
        bottomRight: Radius.circular(homeShellCornerRadius),
      );

  static BorderRadius get homeBannerImageRadius => const BorderRadius.only(
        topLeft: Radius.circular(homeShellCornerRadius),
        topRight: Radius.circular(homeShellCornerRadius),
        bottomLeft: Radius.circular(radiusLg),
        bottomRight: Radius.circular(radiusLg),
      );

  static const EdgeInsets pagePadding =
      EdgeInsets.symmetric(horizontal: 16);

  static const Color pageBackground = Color(0xFFF4F5F7);
  static const Color cardBackground = Colors.white;
  static const Color chipBackground = Color(0xFFFFF3E8);
  static const Color trustBackground = Color(0xFFFFF6EE);

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.06),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  /// Product thumbnail depth — gradient only (no blur; safe on Mali/low-end GPUs).
  static BoxDecoration productImage3d({
    double radius = radiusSm,
  }) {
    return BoxDecoration(
      borderRadius: BorderRadius.circular(radius),
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFFFFFFF), Color(0xFFF2F2F2)],
      ),
    );
  }

  static BoxDecoration card({Color? color, double radius = radiusLg}) {
    return BoxDecoration(
      color: color ?? cardBackground,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: AppColors.borderLight.withValues(alpha: 0.9)),
      boxShadow: softShadow,
    );
  }

  static BoxDecoration pill({Color? color}) {
    return BoxDecoration(
      color: color ?? chipBackground,
      borderRadius: BorderRadius.circular(999),
    );
  }
}
