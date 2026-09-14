import '../../models/address.dart';
import '../../models/user.dart';

class AddressPhoneOption {
  const AddressPhoneOption({
    required this.number,
    required this.label,
  });

  final String number;
  final String label;
}

String normalizeIndianMobile(String? raw) {
  final digits = raw?.replaceAll(RegExp(r'\D'), '') ?? '';
  if (digits.length >= 10) {
    return digits.substring(digits.length - 10);
  }
  return digits;
}

/// Unique phone numbers from account + saved addresses for quick pick.
List<AddressPhoneOption> buildAddressPhoneOptions({
  required User? user,
  required List<Address> addresses,
}) {
  final seen = <String>{};
  final options = <AddressPhoneOption>[];

  void add(String? raw, String label) {
    final number = normalizeIndianMobile(raw);
    if (number.length != 10 || seen.contains(number)) return;
    seen.add(number);
    options.add(AddressPhoneOption(number: number, label: label));
  }

  add(user?.phone, 'My account');

  for (final address in addresses) {
    final shop = address.shopName.trim();
    final name = getAddressFullName(address).trim();
    final label = shop.isNotEmpty
        ? shop
        : (name.isNotEmpty ? name : 'Saved address');
    add(address.number, label);
  }

  return options;
}

String defaultPhoneForNewAddress({
  required User? user,
  required List<Address> addresses,
}) {
  final defaultAddress =
      addresses.where((a) => a.isDefault).firstOrNull ?? addresses.firstOrNull;

  final fromDefault = normalizeIndianMobile(defaultAddress?.number);
  if (fromDefault.length == 10) return fromDefault;

  final fromUser = normalizeIndianMobile(user?.phone);
  if (fromUser.length == 10) return fromUser;

  return '';
}

Map<String, String> buildNewAddressInitialValues({
  required User? user,
  required List<Address> addresses,
}) {
  final defaultAddress =
      addresses.where((a) => a.isDefault).firstOrNull ?? addresses.firstOrNull;

  return {
    'fullName': user?.name.trim().isNotEmpty == true
        ? user!.name.trim()
        : (defaultAddress?.fullName ?? ''),
    'number': defaultPhoneForNewAddress(user: user, addresses: addresses),
    'email': user?.email.trim().isNotEmpty == true
        ? user!.email.trim()
        : (defaultAddress?.email ?? ''),
    'shopNo': defaultAddress?.shopNo ?? user?.shopNo ?? '',
    'shopName': user?.shopName.trim().isNotEmpty == true
        ? user!.shopName.trim()
        : (defaultAddress?.shopName ?? ''),
    'fullAddress': '',
    'landmark': '',
    'city': '',
    'state': '',
    'pincode': '',
  };
}

String getAddressFullName(Address address) {
  return address.fullName.isNotEmpty ? address.fullName : '';
}

String formatAddressLine(Address address) {
  final parts = <String>[
    if (address.shopName.isNotEmpty) address.shopName,
    if (address.shopNo.isNotEmpty) 'Shop ${address.shopNo}',
    if (address.fullAddress.isNotEmpty) address.fullAddress,
    if (address.landmark.isNotEmpty) address.landmark,
    [address.city, address.state, address.pincode].where((p) => p.isNotEmpty).join(', '),
  ];
  return parts.where((part) => part.isNotEmpty).join(', ');
}

Map<String, String> mapAddressToForm(Address address) {
  return {
    'fullName': address.fullName,
    'number': address.number,
    'email': address.email,
    'shopNo': address.shopNo,
    'shopName': address.shopName,
    'fullAddress': address.fullAddress,
    'landmark': address.landmark,
    'city': address.city,
    'state': address.state,
    'pincode': address.pincode,
  };
}

const addressFieldLabels = <String, String>{
  'fullName': 'Full name',
  'number': 'Mobile number',
  'email': 'Email address',
  'shopNo': 'Shop number',
  'shopName': 'Shop name',
  'fullAddress': 'Full address',
  'landmark': 'Landmark',
  'city': 'City',
  'state': 'State',
  'pincode': 'Pincode',
};

/// Returns field-key → error message for every invalid/missing input.
Map<String, String> collectAddressFormFieldErrors(Map<String, String> form) {
  final errors = <String, String>{};

  if (form['fullName']?.trim().isEmpty ?? true) {
    errors['fullName'] = 'Please enter full name';
  }

  final number = form['number']?.trim() ?? '';
  if (number.isEmpty) {
    errors['number'] = 'Please enter mobile number';
  } else if (!RegExp(r'^[6789]\d{9}$').hasMatch(number)) {
    errors['number'] =
        'Enter valid 10-digit mobile number (starts with 6, 7, 8, or 9)';
  }

  final email = form['email']?.trim() ?? '';
  if (email.isEmpty) {
    errors['email'] = 'Please enter email address';
  } else if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
    errors['email'] = 'Please enter a valid email address';
  }

  if (form['shopNo']?.trim().isEmpty ?? true) {
    errors['shopNo'] = 'Please enter shop number';
  }
  if (form['shopName']?.trim().isEmpty ?? true) {
    errors['shopName'] = 'Please enter shop name';
  }
  if (form['fullAddress']?.trim().isEmpty ?? true) {
    errors['fullAddress'] = 'Please enter full delivery address';
  }
  if (form['landmark']?.trim().isEmpty ?? true) {
    errors['landmark'] = 'Please enter nearby landmark';
  }
  if (form['state']?.trim().isEmpty ?? true) {
    errors['state'] = 'Please select or enter state';
  }
  if (form['city']?.trim().isEmpty ?? true) {
    errors['city'] = 'Please select or enter city';
  }

  final pincode = form['pincode']?.trim() ?? '';
  if (pincode.isEmpty) {
    errors['pincode'] = 'Please enter pincode';
  } else if (!RegExp(r'^\d{6}$').hasMatch(pincode)) {
    errors['pincode'] = 'Pincode must be exactly 6 digits';
  }

  return errors;
}

String addressFormValidationSummary(Map<String, String> fieldErrors) {
  if (fieldErrors.isEmpty) return '';
  if (fieldErrors.length == 1) {
    return fieldErrors.values.first;
  }
  final labels = fieldErrors.keys
      .map((key) => addressFieldLabels[key] ?? key)
      .join(', ');
  return 'Please fill required fields: $labels';
}

String? validateAddressForm(Map<String, String> form) {
  final errors = collectAddressFormFieldErrors(form);
  if (errors.isEmpty) return null;
  return addressFormValidationSummary(errors);
}
