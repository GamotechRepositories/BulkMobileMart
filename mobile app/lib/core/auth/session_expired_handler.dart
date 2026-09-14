import 'package:flutter_riverpod/flutter_riverpod.dart';

typedef SessionExpiredCallback = void Function({required bool promptLogin});

/// Bridges Dio 401 handling to [AuthController] without circular providers.
class SessionExpiredHandler {
  SessionExpiredCallback? _onExpired;
  bool _handling = false;

  void bind(SessionExpiredCallback onExpired) {
    _onExpired = onExpired;
  }

  void unbind() {
    _onExpired = null;
  }

  /// Clears in-memory session once per burst of auth failures.
  void notifyUnauthorized({bool promptLogin = false}) {
    if (_handling) return;
    final handler = _onExpired;
    if (handler == null) return;
    _handling = true;
    try {
      handler(promptLogin: promptLogin);
    } finally {
      Future<void>.delayed(const Duration(milliseconds: 800), () {
        _handling = false;
      });
    }
  }
}

final sessionExpiredHandlerProvider = Provider<SessionExpiredHandler>((ref) {
  return SessionExpiredHandler();
});
