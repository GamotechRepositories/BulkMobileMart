class OfferBanner {
  const OfferBanner({
    required this.id,
    required this.imageUrl,
    this.title = '',
    this.titleHighlight = '',
    this.subtitle = '',
    this.linkUrl = '',
    this.alt = 'BulkMobileMart offer banner',
    this.order = 0,
    this.isActive = true,
    this.device = 'mobile',
  });

  final String id;
  final String imageUrl;
  final String title;
  final String titleHighlight;
  final String subtitle;
  final String linkUrl;
  final String alt;
  final int order;
  final bool isActive;
  final String device;

  factory OfferBanner.fromJson(Map<String, dynamic> json) {
    return OfferBanner(
      id: json['_id']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      titleHighlight: json['titleHighlight']?.toString() ?? '',
      subtitle: json['subtitle']?.toString() ?? '',
      linkUrl: json['linkUrl']?.toString() ?? '',
      alt: json['alt']?.toString() ?? 'BulkMobileMart offer banner',
      order: json['order'] is num ? (json['order'] as num).toInt() : 0,
      isActive: json['isActive'] as bool? ?? true,
      device: json['device']?.toString() ?? 'mobile',
    );
  }
}
