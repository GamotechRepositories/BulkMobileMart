import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../config/theme.dart';

Future<void> showProductVideoFullScreen(BuildContext context, String url) {
  return Navigator.of(context, rootNavigator: true).push<void>(
    MaterialPageRoute<void>(
      fullscreenDialog: true,
      builder: (context) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black,
          foregroundColor: Colors.white,
          leading: IconButton(
            tooltip: 'Close video',
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: const Text('Product video'),
        ),
        body: SafeArea(child: ProductVideoPlayer(url: url, fullScreen: true)),
      ),
    ),
  );
}

class ProductVideoPlayer extends StatefulWidget {
  const ProductVideoPlayer({
    super.key,
    required this.url,
    this.embedded = false,
    this.fullScreen = false,
  });

  final String url;
  final bool embedded;
  final bool fullScreen;

  @override
  State<ProductVideoPlayer> createState() => _ProductVideoPlayerState();
}

class _ProductVideoPlayerState extends State<ProductVideoPlayer>
    with WidgetsBindingObserver {
  VideoPlayerController? _controller;
  bool _failed = false;
  bool _initializing = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initController();
  }

  @override
  void didUpdateWidget(covariant ProductVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.url.trim() != widget.url.trim()) {
      _disposeController();
      _failed = false;
      _initializing = true;
      _initController();
    }
  }

  Future<void> _initController() async {
    final url = widget.url.trim();
    if (url.isEmpty) {
      if (mounted) {
        setState(() {
          _failed = true;
          _initializing = false;
        });
      }
      return;
    }

    final uri = Uri.tryParse(url);
    if (uri == null) {
      if (mounted) {
        setState(() {
          _failed = true;
          _initializing = false;
        });
      }
      return;
    }

    final controller = VideoPlayerController.networkUrl(uri);
    _controller = controller;
    try {
      await controller.initialize();
      if (!mounted || _controller != controller) return;
      if (widget.fullScreen) await controller.play();
      if (!mounted || _controller != controller) return;
      setState(() {
        _initializing = false;
        _failed = false;
      });
    } catch (_) {
      if (!mounted || _controller != controller) return;
      setState(() {
        _failed = true;
        _initializing = false;
      });
      try {
        await _controller?.dispose();
      } catch (_) {}
      _controller = null;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) _controller?.pause();
  }

  void _disposeController() {
    _controller?.dispose();
    _controller = null;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _disposeController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_failed) {
      return Container(
        height: widget.fullScreen
            ? double.infinity
            : (widget.embedded ? 280 : 200),
        alignment: Alignment.center,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: widget.embedded || widget.fullScreen
              ? Colors.black
              : AppColors.mobileSurface,
          borderRadius: BorderRadius.circular(widget.embedded ? 12 : 12),
          border: widget.embedded
              ? null
              : Border.all(color: AppColors.borderLight),
        ),
        child: Text(
          'Video preview is unavailable.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: widget.embedded || widget.fullScreen
                ? Colors.white70
                : AppColors.textSecondary,
            fontSize: 13,
          ),
        ),
      );
    }

    if (_initializing ||
        _controller == null ||
        !_controller!.value.isInitialized) {
      return Container(
        height: widget.fullScreen
            ? double.infinity
            : (widget.embedded ? 280 : 200),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: widget.embedded || widget.fullScreen
              ? Colors.black
              : AppColors.mobileSurface,
          borderRadius: BorderRadius.circular(12),
          border: widget.embedded
              ? null
              : Border.all(color: AppColors.borderLight),
        ),
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: widget.embedded || widget.fullScreen ? Colors.white : null,
        ),
      );
    }

    final controller = _controller!;

    final player = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.fullScreen)
          Expanded(
            child: Center(
              child: AspectRatio(
                aspectRatio: controller.value.aspectRatio > 0
                    ? controller.value.aspectRatio
                    : 16 / 9,
                child: VideoPlayer(controller),
              ),
            ),
          )
        else
          widget.embedded
              ? SizedBox(
                  height: 216,
                  width: double.infinity,
                  child: FittedBox(
                    fit: BoxFit.contain,
                    child: SizedBox(
                      width: controller.value.size.width,
                      height: controller.value.size.height,
                      child: VideoPlayer(controller),
                    ),
                  ),
                )
              : AspectRatio(
                  aspectRatio: controller.value.aspectRatio == 0
                      ? 16 / 9
                      : controller.value.aspectRatio,
                  child: VideoPlayer(controller),
                ),
        Container(
          color: Colors.black87,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            children: [
              ValueListenableBuilder<VideoPlayerValue>(
                valueListenable: controller,
                builder: (context, value, _) => IconButton(
                  tooltip: value.isPlaying ? 'Pause video' : 'Play video',
                  onPressed: () async {
                    if (value.isPlaying) {
                      await controller.pause();
                    } else {
                      if (value.position >= value.duration) {
                        await controller.seekTo(Duration.zero);
                      }
                      await controller.play();
                    }
                  },
                  icon: Icon(
                    value.isPlaying ? Icons.pause : Icons.play_arrow,
                    color: Colors.white,
                  ),
                ),
              ),
              Expanded(
                child: VideoProgressIndicator(
                  controller,
                  allowScrubbing: true,
                  colors: const VideoProgressColors(
                    playedColor: AppColors.primary,
                    bufferedColor: Colors.white24,
                    backgroundColor: Colors.white12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );

    if (widget.fullScreen) return player;

    if (widget.embedded) {
      return ClipRRect(borderRadius: BorderRadius.circular(12), child: player);
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      clipBehavior: Clip.antiAlias,
      child: player,
    );
  }
}
