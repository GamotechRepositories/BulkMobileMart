import 'package:flutter/material.dart';

/// Sliding highlight like YouTube / Instagram loading placeholders.
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child});

  final Widget child;

  static ShimmerState? of(BuildContext context) {
    return context.findAncestorStateOfType<ShimmerState>();
  }

  @override
  State<Shimmer> createState() => ShimmerState();
}

class ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController controller;

  @override
  void initState() {
    super.initState();
    controller = AnimationController.unbounded(vsync: this)
      ..repeat(min: -0.5, max: 1.5, period: const Duration(milliseconds: 1400));
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  Gradient get gradient => LinearGradient(
        colors: const [
          Color(0xFFE8E8E8),
          Color(0xFFF5F5F5),
          Color(0xFFE8E8E8),
        ],
        stops: const [0.1, 0.3, 0.4],
        begin: const Alignment(-1.0, -0.3),
        end: const Alignment(1.0, 0.3),
        transform: _SlidingGradientTransform(controller.value),
      );

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      child: widget.child,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) => gradient.createShader(bounds),
          child: child,
        );
      },
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  const _SlidingGradientTransform(this.slidePercent);

  final double slidePercent;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * slidePercent, 0, 0);
  }
}

/// Grey block that shimmers when wrapped in [Shimmer].
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({
    super.key,
    this.width,
    this.height = 16,
    this.borderRadius = 8,
  });

  final double? width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final shimmering = Shimmer.of(context) != null;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: shimmering ? Colors.black : Colors.grey.shade200,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}
