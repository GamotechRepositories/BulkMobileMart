import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/exceptions/api_exception.dart';
import '../../core/providers/app_providers.dart';
import '../../models/user.dart';
import 'auth_state.dart';

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    Future.microtask(_restoreSession);
    return const AuthState();
  }

  Future<void> _restoreSession() async {
    final storage = ref.read(authStorageProvider);
    final savedToken = storage.token;

    if (savedToken == null || savedToken.isEmpty) {
      state = const AuthState(loading: false);
      return;
    }

    try {
      final user = await ref.read(apiServiceProvider).fetchMe();
      if (user.isAdmin) {
        await storage.clear();
        state = const AuthState(loading: false);
        return;
      }

      await storage.saveSession(user: user.toJson(), token: savedToken);
      state = AuthState(user: user, token: savedToken, loading: false);
    } catch (_) {
      await storage.clear();
      state = const AuthState(loading: false);
    }
  }

  void openAuthModal([AuthModalMode mode = AuthModalMode.login]) {
    state = state.copyWith(authModal: mode);
  }

  void closeAuthModal() {
    state = state.copyWith(clearAuthModal: true);
  }

  void setAuthModal(AuthModalMode mode) {
    state = state.copyWith(authModal: mode);
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    final session = await ref.read(apiServiceProvider).login(
          email: email.trim(),
          password: password,
        );

    if (session.user.isAdmin) {
      throw ApiException('Please use the admin panel to sign in.');
    }

    await _persistSession(session);
    closeAuthModal();
  }

  Future<void> signup({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    final session = await ref.read(apiServiceProvider).signup(
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: password,
        );

    if (session.user.isAdmin) {
      throw ApiException('Please use the admin panel to sign in.');
    }

    await _persistSession(session);
    closeAuthModal();
  }

  Future<void> logout() async {
    await ref.read(authStorageProvider).clear();
    state = const AuthState(loading: false);
  }

  Future<void> _persistSession(AuthSession session) async {
    await ref.read(authStorageProvider).saveSession(
          user: session.user.toJson(),
          token: session.token,
        );
    state = AuthState(
      user: session.user,
      token: session.token,
      loading: false,
    );
  }
}

String authErrorMessage(Object error) {
  if (error is ApiException) return error.message;
  if (error is DioException && error.error is ApiException) {
    return (error.error as ApiException).message;
  }
  return 'Something went wrong. Please try again.';
}
