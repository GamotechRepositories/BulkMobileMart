import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/home/home_providers.dart';

Future<void> refreshHomeData(WidgetRef ref) async {
  ref.invalidate(heroBannersProvider);
  ref.invalidate(categoriesProvider);
  ref.invalidate(brandsProvider);
  ref.invalidate(homeDealsProvider);

  await Future.wait([
    ref.read(heroBannersProvider.future),
    ref.read(categoriesProvider.future),
    ref.read(brandsProvider.future),
    ref.read(homeDealsProvider.future),
  ]);
}
