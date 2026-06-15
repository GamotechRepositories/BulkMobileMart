class Category {
  const Category({
    required this.id,
    required this.categoryName,
    required this.categoryImage,
    this.subcategories = const [],
    this.isActive = true,
  });

  final String id;
  final String categoryName;
  final String categoryImage;
  final List<String> subcategories;
  final bool isActive;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['_id']?.toString() ?? '',
      categoryName: json['categoryName']?.toString() ?? '',
      categoryImage: json['categoryImage']?.toString() ?? '',
      subcategories: (json['subcategories'] as List<dynamic>? ?? [])
          .map((item) => item.toString())
          .toList(),
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}
