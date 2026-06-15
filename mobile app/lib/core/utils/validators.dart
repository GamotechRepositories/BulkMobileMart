class Validators {
  Validators._();

  static final RegExp _phonePattern = RegExp(r'^[6789]\d{9}$');
  static final RegExp _pincodePattern = RegExp(r'^\d{6}$');
  static final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  static bool isValidName(String value) {
    final words = value.trim().split(RegExp(r'\s+'));
    if (words.isEmpty || words.length > 2) return false;
    return words.every((word) => RegExp(r'^[A-Za-z]{2,30}$').hasMatch(word));
  }

  static bool isValidPhone(String value) => _phonePattern.hasMatch(value.trim());

  static bool isValidEmail(String value) =>
      _emailPattern.hasMatch(value.trim().toLowerCase());

  static bool isValidPincode(String value) =>
      _pincodePattern.hasMatch(value.trim());

  static bool isValidPassword(String value) => value.length >= 6;
}
