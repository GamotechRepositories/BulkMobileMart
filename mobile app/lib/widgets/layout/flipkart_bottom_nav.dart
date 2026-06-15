import 'package:flutter/material.dart';

import '../../config/theme.dart';

/// Flipkart-style bottom bar — flat white strip, hairline top border, icon + label tabs.
class FlipkartBottomNav extends StatelessWidget {
  const FlipkartBottomNav({
    super.key,
    required this.currentIndex,
    required this.items,
    required this.onTap,
    this.cartBadgeCount = 0,
  });

  final int currentIndex;
  final List<FlipkartNavItem> items;
  final ValueChanged<int> onTap;
  final int cartBadgeCount;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: AppColors.navBorder, width: 0.6),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 52,
          child: Row(
            children: [
              for (var i = 0; i < items.length; i++)
                Expanded(
                  child: _FlipkartNavTab(
                    item: items[i],
                    selected: currentIndex == i,
                    badgeCount: items[i].showBadge ? cartBadgeCount : 0,
                    onTap: () => onTap(i),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class FlipkartNavItem {
  const FlipkartNavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
    this.showBadge = false,
  });

  final String label;
  final IconData icon;
  final IconData activeIcon;
  final bool showBadge;
}

class _FlipkartNavTab extends StatelessWidget {
  const _FlipkartNavTab({
    required this.item,
    required this.selected,
    required this.badgeCount,
    required this.onTap,
  });

  final FlipkartNavItem item;
  final bool selected;
  final int badgeCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.navSelected : AppColors.navUnselected;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        splashColor: AppColors.navSelected.withValues(alpha: 0.08),
        highlightColor: AppColors.navSelected.withValues(alpha: 0.04),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              height: 26,
              child: Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.center,
                children: [
                  Icon(
                    selected ? item.activeIcon : item.icon,
                    size: 23,
                    color: color,
                  ),
                  if (badgeCount > 0)
                    Positioned(
                      right: -10,
                      top: -2,
                      child: _CartBadge(count: badgeCount),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              item.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                height: 1.1,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                color: color,
                letterSpacing: 0.1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartBadge extends StatelessWidget {
  const _CartBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final label = count > 99 ? '99+' : '$count';
    final minWidth = count > 9 ? 18.0 : 16.0;

    return Container(
      constraints: BoxConstraints(minWidth: minWidth, minHeight: 16),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: AppColors.navBadge,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white, width: 1.2),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.w700,
          height: 1,
        ),
      ),
    );
  }
}
