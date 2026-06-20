import 'dart:io';

import 'package:dio/dio.dart';

import '../core/exceptions/api_exception.dart';
import '../core/network/api_client.dart';
import '../core/network/api_response_parser.dart';
import '../core/utils/upload_folders.dart';
import '../models/address.dart';
import '../models/brand.dart';
import '../models/cart_item.dart';
import '../models/category.dart';
import '../models/hero_banner.dart';
import '../models/order.dart';
import '../models/product.dart';
import '../models/store_settings.dart';
import '../models/testimonial.dart';
import '../models/user.dart';

/// Mirrors `frontend/src/api/api.js` — same backend endpoints.
class ApiService {
  ApiService(this._client);

  final ApiClient _client;

  Dio get _dio => _client.dio;

  Future<Response<dynamic>> getHeroBanners({String device = 'mobile'}) =>
      _dio.get('/api/herobanners', queryParameters: {'device': device});

  Future<Response<dynamic>> getCategories() => _dio.get('/api/categories');

  Future<Response<dynamic>> getCategoryById(String id) =>
      _dio.get('/api/categories/$id');

  Future<Response<dynamic>> getBrands() => _dio.get('/api/brands');

  Future<Response<dynamic>> getTestimonials() => _dio.get('/api/testimonials');

  Future<Response<dynamic>> getStoreSettings() => _dio.get('/api/settings');

  Future<Response<dynamic>> getProducts([Map<String, dynamic>? params]) =>
      _dio.get('/api/products', queryParameters: params);

  Future<Response<dynamic>> getProductById(String id) =>
      _dio.get('/api/products/$id');

  Future<Response<dynamic>> getCart() => _dio.get('/api/cart');

  Future<Response<dynamic>> addToCartItem(Map<String, dynamic> data) =>
      _dio.post('/api/cart', data: data);

  Future<Response<dynamic>> removeFromCartItem(
    String productId, {
    String variantName = '',
    String colorName = '',
  }) =>
      _dio.delete(
        '/api/cart/$productId',
        queryParameters: {
          'variantName': variantName,
          'colorName': colorName,
        },
      );

  Future<Response<dynamic>> updateCartItemQty(
    String productId,
    int quantity, {
    String variantName = '',
    String colorName = '',
  }) =>
      _dio.put(
        '/api/cart/$productId',
        data: {
          'quantity': quantity,
          'variantName': variantName,
          'colorName': colorName,
        },
      );

  Future<Response<dynamic>> getWishlist() => _dio.get('/api/wishlist');

  Future<Response<dynamic>> toggleWishlistItem(String productId) =>
      _dio.post('/api/wishlist/toggle', data: {'productId': productId});

  Future<Response<dynamic>> removeFromWishlistItem(String productId) =>
      _dio.delete('/api/wishlist/$productId');

  Future<Response<dynamic>> signupUser(Map<String, dynamic> data) =>
      _dio.post('/api/users/signup', data: data);

  Future<Response<dynamic>> loginUser(Map<String, dynamic> data) =>
      _dio.post('/api/users/login', data: data);

  Future<Response<dynamic>> getMe() => _dio.get('/api/users/me');

  Future<Response<dynamic>> updateMe(Map<String, dynamic> data) =>
      _dio.patch('/api/users/me', data: data);

  Future<Response<dynamic>> getAddresses() => _dio.get('/api/addresses');

  Future<Response<dynamic>> addAddress(Map<String, dynamic> data) =>
      _dio.post('/api/addresses', data: _buildAddressPayload(data));

  Future<Response<dynamic>> updateAddress(
    String id,
    Map<String, dynamic> data,
  ) =>
      _dio.put('/api/addresses/$id', data: _buildAddressPayload(data));

  Future<Response<dynamic>> deleteAddress(String id) =>
      _dio.delete('/api/addresses/$id');

  Future<Response<dynamic>> placeOrder(Map<String, dynamic> data) =>
      _dio.post('/api/orders', data: data);

  Future<Response<dynamic>> createCheckoutAttempt(Map<String, dynamic> data) =>
      _dio.post('/api/orders/checkout-attempt', data: data);

  Future<Response<dynamic>> createRazorpayOrder(Map<String, dynamic> data) =>
      _dio.post('/api/payments/create-order', data: data);

  Future<Response<dynamic>> verifyRazorpayPayment(Map<String, dynamic> data) =>
      _dio.post('/api/payments/verify', data: data);

  Future<Response<dynamic>> submitUpiPaymentProof(Map<String, dynamic> data) =>
      _dio.post('/api/payments/submit-upi-proof', data: data);

  Future<Response<dynamic>> getMyOrders() => _dio.get('/api/orders');

  Future<Response<dynamic>> getOrderById(String id) =>
      _dio.get('/api/orders/$id');

  Future<Response<dynamic>> cancelOrder(String id) =>
      _dio.patch('/api/orders/$id/cancel');

  Future<Response<dynamic>> submitSupportMessage(Map<String, dynamic> data) =>
      _dio.post('/api/support', data: data);

  /// Uploads via presigned S3 URL (same flow as admin panel).
  Future<String> uploadImageFile(String filePath, String folder) async {
    final file = File(filePath);
    if (!await file.exists()) {
      throw ApiException('Image file not found');
    }

    final bytes = await file.readAsBytes();
    if (bytes.length > 5 * 1024 * 1024) {
      throw ApiException('Image must be under 5 MB');
    }

    final fileName = _fileNameFromPath(filePath);
    final mimeType = _mimeTypeFromPath(filePath);

    final presignRes = await _dio.post(
      '/api/upload/presign',
      data: {
        'folder': folder,
        'mimeType': mimeType,
        'filename': fileName,
      },
    );

    final data = ApiResponseParser.getData(presignRes.data);
    if (data is! Map<String, dynamic>) {
      throw const FormatException('Invalid presign response');
    }

    final uploadUrl = data['uploadUrl']?.toString();
    final cloudFrontUrl = data['cloudFrontUrl']?.toString();
    if (uploadUrl == null ||
        uploadUrl.isEmpty ||
        cloudFrontUrl == null ||
        cloudFrontUrl.isEmpty) {
      throw const FormatException('Presign response missing URLs');
    }

    final s3Dio = Dio(
      BaseOptions(
        sendTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    final putRes = await s3Dio.put<List<int>>(
      uploadUrl,
      data: bytes,
      options: Options(
        headers: {'Content-Type': mimeType},
        responseType: ResponseType.bytes,
        validateStatus: (status) => status != null && status < 500,
      ),
    );

    final status = putRes.statusCode ?? 0;
    if (status < 200 || status >= 300) {
      throw ApiException(
        'Failed to upload image to storage ($status)',
        statusCode: status,
      );
    }

    return cloudFrontUrl;
  }

  static String _fileNameFromPath(String path) {
    final normalized = path.replaceAll('\\', '/');
    final index = normalized.lastIndexOf('/');
    return index >= 0 ? normalized.substring(index + 1) : normalized;
  }

  static String _mimeTypeFromPath(String path) {
    final ext = path.split('.').last.toLowerCase();
    return switch (ext) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'webp' => 'image/webp',
      'gif' => 'image/gif',
      _ => 'image/jpeg',
    };
  }

  Future<List<HeroBanner>> fetchHeroBanners({String device = 'mobile'}) async {
    final response = await getHeroBanners(device: device);
    return ApiResponseParser.parseList(response.data, HeroBanner.fromJson);
  }

  Future<List<Category>> fetchCategories() async {
    final response = await getCategories();
    return ApiResponseParser.parseList(response.data, Category.fromJson);
  }

  Future<List<Brand>> fetchBrands() async {
    final response = await getBrands();
    return ApiResponseParser.parseList(response.data, Brand.fromJson);
  }

  Future<List<Testimonial>> fetchTestimonials() async {
    final response = await getTestimonials();
    return ApiResponseParser.parseList(response.data, Testimonial.fromJson);
  }

  Future<StoreSettings> fetchStoreSettings() async {
    final response = await getStoreSettings();
    return ApiResponseParser.parseObject(response.data, StoreSettings.fromJson);
  }

  Future<List<Product>> fetchProducts([Map<String, dynamic>? params]) async {
    final response = await getProducts(params);
    return ApiResponseParser.parseList(response.data, Product.fromJson);
  }

  Future<Product> fetchProductById(String id) async {
    final response = await getProductById(id);
    return ApiResponseParser.parseObject(response.data, Product.fromJson);
  }

  Future<List<CartItem>> fetchCartItems() async {
    final response = await getCart();
    final data = ApiResponseParser.getData(response.data);
    if (data is! Map<String, dynamic>) return [];

    final items = data['items'];
    if (items is! List) return [];

    return items
        .whereType<Map<String, dynamic>>()
        .where((item) => item['product'] != null)
        .where((item) {
          final product = item['product'];
          if (product is! Map<String, dynamic>) return false;
          return product['isActive'] as bool? ?? true;
        })
        .map(CartItem.fromApiItem)
        .toList();
  }

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final response = await loginUser({'email': email, 'password': password});
    final data = ApiResponseParser.getData(response.data) as Map<String, dynamic>;
    return AuthSession(
      user: User.fromJson(data['user'] as Map<String, dynamic>),
      token: data['token']?.toString() ?? '',
    );
  }

  Future<AuthSession> signup({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    final response = await signupUser({
      'name': name,
      'email': email,
      'phone': phone,
      'password': password,
    });
    final data = ApiResponseParser.getData(response.data) as Map<String, dynamic>;
    return AuthSession(
      user: User.fromJson(data['user'] as Map<String, dynamic>),
      token: data['token']?.toString() ?? '',
    );
  }

  Future<User> fetchMe() async {
    final response = await getMe();
    return ApiResponseParser.parseObject(response.data, User.fromJson);
  }

  Future<User> updateProfile(Map<String, dynamic> data) async {
    final response = await updateMe(data);
    return ApiResponseParser.parseObject(response.data, User.fromJson);
  }

  Future<List<Address>> fetchAddresses() async {
    final response = await getAddresses();
    return ApiResponseParser.parseList(response.data, Address.fromJson);
  }

  Future<Address> createAddress(Map<String, dynamic> data) async {
    final response = await addAddress(data);
    return ApiResponseParser.parseObject(response.data, Address.fromJson);
  }

  Future<Address> editAddress(String id, Map<String, dynamic> data) async {
    final response = await updateAddress(id, data);
    return ApiResponseParser.parseObject(response.data, Address.fromJson);
  }

  Future<void> removeAddress(String id) async {
    await deleteAddress(id);
  }

  Future<String> uploadPaymentProofImage(String filePath) =>
      uploadImageFile(filePath, UploadFolders.paymentProofs);

  Future<String> uploadSupportAttachment(String filePath) =>
      uploadImageFile(filePath, UploadFolders.support);

  Future<List<Order>> fetchMyOrders() async {
    final response = await getMyOrders();
    return ApiResponseParser.parseList(response.data, Order.fromJson);
  }

  Future<Order> fetchOrderById(String id) async {
    final response = await getOrderById(id);
    return ApiResponseParser.parseObject(response.data, Order.fromJson);
  }

  Future<Order> cancelOrderById(String id) async {
    final response = await cancelOrder(id);
    return ApiResponseParser.parseObject(response.data, Order.fromJson);
  }

  Future<String> submitSupportTicket(Map<String, dynamic> data) async {
    final response = await submitSupportMessage(data);
    return ApiResponseParser.getMessage(response.data) ??
        'Your support request has been submitted.';
  }

  Future<List<Product>> fetchWishlistProducts() async {
    final response = await getWishlist();
    final data = ApiResponseParser.getData(response.data);
    if (data is! Map<String, dynamic>) return [];

    final items = data['items'];
    if (items is! List) return [];

    return items
        .whereType<Map<String, dynamic>>()
        .where((item) => item['product'] != null)
        .map((item) => Product.fromJson(item['product'] as Map<String, dynamic>))
        .where((product) => product.isActive)
        .toList();
  }

  Map<String, dynamic> _buildAddressPayload(Map<String, dynamic> data) {
    final fullName =
        (data['fullName'] ?? data['name'] ?? '').toString().trim();
    final number =
        (data['number'] ?? data['phone'] ?? '').toString().trim();
    final email = (data['email'] ?? '').toString().trim();
    final shopNo = (data['shopNo'] ?? '').toString().trim();
    final shopName = (data['shopName'] ?? '').toString().trim();
    final fullAddress =
        (data['fullAddress'] ?? data['streetArea'] ?? '').toString().trim();
    final landmark = (data['landmark'] ?? '').toString().trim();
    final city = (data['city'] ?? '').toString().trim();
    final state = (data['state'] ?? '').toString().trim();
    final pincode = (data['pincode'] ?? '').toString().trim();

    return {
      'fullName': fullName,
      'number': number,
      'email': email,
      'shopNo': shopNo,
      'shopName': shopName,
      'fullAddress': fullAddress,
      'landmark': landmark,
      'city': city,
      'state': state,
      'pincode': pincode,
      'isDefault': data['isDefault'],
      'name': fullName,
      'phone': number,
      'streetArea': fullAddress,
    };
  }
}
