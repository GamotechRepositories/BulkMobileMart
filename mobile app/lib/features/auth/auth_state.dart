import '../../models/user.dart';

enum AuthModalMode { login, signup }

class AuthState {
  const AuthState({
    this.user,
    this.token,
    this.loading = false,
    this.authModal,
    this.redirectHomeAfterAuth = false,
  });

  final User? user;
  final String? token;
  final bool loading;
  final AuthModalMode? authModal;

  /// One-shot flag: [AppShell] switches to the home tab when true.
  final bool redirectHomeAfterAuth;

  bool get isLoggedIn => user != null && token != null;

  AuthState copyWith({
    User? user,
    String? token,
    bool? loading,
    AuthModalMode? authModal,
    bool? redirectHomeAfterAuth,
    bool clearUser = false,
    bool clearToken = false,
    bool clearAuthModal = false,
    bool clearRedirectHomeAfterAuth = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      token: clearToken ? null : (token ?? this.token),
      loading: loading ?? this.loading,
      authModal: clearAuthModal ? null : (authModal ?? this.authModal),
      redirectHomeAfterAuth: clearRedirectHomeAfterAuth
          ? false
          : (redirectHomeAfterAuth ?? this.redirectHomeAfterAuth),
    );
  }
}
