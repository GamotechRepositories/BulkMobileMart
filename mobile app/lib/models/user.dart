class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.role = 'user',
  });

  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;

  bool get isAdmin => role == 'admin';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      role: json['role']?.toString() ?? 'user',
    );
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'role': role,
      };
}

class AuthSession {
  const AuthSession({required this.user, required this.token});

  final User user;
  final String token;
}
