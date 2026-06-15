class Brand {
  const Brand({
    required this.id,
    required this.brandName,
    required this.brandImage,
    this.order = 0,
    this.isActive = true,
  });

  final String id;
  final String brandName;
  final String brandImage;
  final int order;
  final bool isActive;

  factory Brand.fromJson(Map<String, dynamic> json) {
    return Brand(
      id: json['_id']?.toString() ?? '',
      brandName: json['brandName']?.toString() ?? '',
      brandImage: json['brandImage']?.toString() ?? '',
      order: json['order'] is num ? (json['order'] as num).toInt() : 0,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}
