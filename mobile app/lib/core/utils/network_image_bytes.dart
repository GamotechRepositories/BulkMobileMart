import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../config/env.dart';

String proxyImageUrl(String imageUrl) {
  final encoded = Uri.encodeComponent(imageUrl.trim());
  return '${Env.apiUrl}/api/proxy/image?url=$encoded';
}

/// Top-level for [compute] — dotenv is unavailable in isolates, so proxy uses
/// the production API base when a direct CDN fetch fails.
Future<Uint8List?> downloadNetworkImageBytes(String imageUrl) async {
  final url = imageUrl.trim();
  if (url.isEmpty) return null;

  final encoded = Uri.encodeComponent(url);
  final isQrService = url.contains('qrserver.com');
  final sources = <String>[
    url,
    if (!isQrService) '${Env.productionApiUrl}/api/proxy/image?url=$encoded',
  ];

  final dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      responseType: ResponseType.bytes,
      followRedirects: true,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36',
        'Accept': 'image/png,image/jpeg,image/*,*/*',
      },
      validateStatus: (status) => status != null && status >= 200 && status < 400,
    ),
  );

  for (final source in sources) {
    try {
      final response = await dio.get<List<int>>(source);
      final data = response.data;
      if (data != null && data.isNotEmpty) {
        return Uint8List.fromList(data);
      }
    } catch (_) {
      // Try next source.
    }
  }

  // Native HttpClient fallback
  try {
    final client = HttpClient();
    client.connectionTimeout = const Duration(seconds: 15);
    final request = await client.getUrl(Uri.parse(url));
    request.headers.set('User-Agent', 'Mozilla/5.0 (Linux; Android 13; Mobile)');
    request.headers.set('Accept', 'image/png,image/jpeg,image/*,*/*');
    final response = await request.close();
    if (response.statusCode >= 200 && response.statusCode < 300) {
      final bytes = await consolidateHttpClientResponseBytes(response);
      client.close();
      if (bytes.isNotEmpty) return bytes;
    }
    client.close();
  } catch (_) {}

  return null;
}
