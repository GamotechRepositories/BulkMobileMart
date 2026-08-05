import '../../models/order.dart';
import '../../models/store_settings.dart';

/// Mirrors `shared/invoice/invoiceConfig.js` + calculation helpers.

const invoiceLogoUrl =
    'https://res.cloudinary.com/dsafvwkrf/image/upload/w_220,h_56,c_limit,q_auto,f_auto/v1780561447/Bulkmobilemart_logo_2-removebg-preview_wcso0k.png';

const invoiceLogoFallbackUrl =
    'https://res.cloudinary.com/dsafvwkrf/image/upload/v1780561447/Bulkmobilemart_logo_2-removebg-preview_wcso0k.png';

class InvoiceBankConfig {
  const InvoiceBankConfig({
    required this.name,
    required this.ifsc,
    required this.accountName,
    this.accountNumber = '',
    this.upiId = '',
  });

  final String name;
  final String ifsc;
  final String accountName;
  final String accountNumber;
  final String upiId;

  InvoiceBankConfig copyWith({
    String? name,
    String? ifsc,
    String? accountName,
    String? accountNumber,
    String? upiId,
  }) {
    return InvoiceBankConfig(
      name: name ?? this.name,
      ifsc: ifsc ?? this.ifsc,
      accountName: accountName ?? this.accountName,
      accountNumber: accountNumber ?? this.accountNumber,
      upiId: upiId ?? this.upiId,
    );
  }
}

class InvoiceConfig {
  const InvoiceConfig({
    this.companyName = 'BulkMobileMart',
    this.legalEntity = 'Bulk Mobile Mart',
    this.tagline = 'Your Trusted Mobile Accessories Wholesale Partner',
    this.email = 'bulkmobilemart@gmail.com',
    this.gstNumber = '',
    this.stateCode = '27',
    this.stateName = 'Maharashtra',
    this.defaultHsn = '85171200',
    this.defaultGstRate = 18,
    this.bank = const InvoiceBankConfig(
      name: 'HDFC Bank',
      ifsc: 'HDFC0000000',
      accountName: 'Bulk Mobile Mart',
    ),
  });

  final String companyName;
  final String legalEntity;
  final String tagline;
  final String email;
  final String gstNumber;
  final String stateCode;
  final String stateName;
  final String defaultHsn;
  final double defaultGstRate;
  final InvoiceBankConfig bank;

  static const defaults = InvoiceConfig();
}

const indianStateCodes = <String, String>{
  'andaman and nicobar islands': '35',
  'andhra pradesh': '37',
  'arunachal pradesh': '12',
  'assam': '18',
  'bihar': '10',
  'chandigarh': '04',
  'chhattisgarh': '22',
  'dadra and nagar haveli and daman and diu': '26',
  'delhi': '07',
  'goa': '30',
  'gujarat': '24',
  'haryana': '06',
  'himachal pradesh': '02',
  'jammu and kashmir': '01',
  'jharkhand': '20',
  'karnataka': '29',
  'kerala': '32',
  'ladakh': '38',
  'lakshadweep': '31',
  'madhya pradesh': '23',
  'maharashtra': '27',
  'manipur': '14',
  'meghalaya': '17',
  'mizoram': '15',
  'nagaland': '13',
  'odisha': '21',
  'puducherry': '34',
  'punjab': '03',
  'rajasthan': '08',
  'sikkim': '11',
  'tamil nadu': '33',
  'telangana': '36',
  'tripura': '16',
  'uttar pradesh': '09',
  'uttarakhand': '05',
  'west bengal': '19',
};

const invoiceStatusLabels = <String, String>{
  'confirm': 'Confirmed',
  'processing': 'Processing',
  'shipping': 'Shipping',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
  'return': 'Return',
  'attempted': 'Attempted',
  'pending': 'Confirmed',
  'confirmed': 'Confirmed',
  'shipped': 'Shipping',
};

double roundMoney(double value) => (value * 100).round() / 100;

String formatInvoiceAmount(num amount) {
  final value = amount.toDouble();
  final fixed = value.toStringAsFixed(2);
  final parts = fixed.split('.');
  final whole = parts[0];
  final fraction = parts[1];

  final buffer = StringBuffer();
  final negative = whole.startsWith('-');
  final digits = negative ? whole.substring(1) : whole;

  if (digits.length <= 3) {
    buffer.write(digits);
  } else {
    final last3 = digits.substring(digits.length - 3);
    var rest = digits.substring(0, digits.length - 3);
    final groups = <String>[];
    while (rest.length > 2) {
      groups.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) groups.insert(0, rest);
    buffer.write(groups.join(','));
    buffer.write(',');
    buffer.write(last3);
  }

  return '${negative ? '-' : ''}${buffer.toString()}.$fraction';
}

String formatInvoiceMoney(num amount) => 'Rs. ${formatInvoiceAmount(amount)}';

String formatInvoiceDate(DateTime? date) {
  final d = date ?? DateTime.now();
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final day = d.day.toString().padLeft(2, '0');
  return '$day-${months[d.month - 1]}-${d.year}';
}

String normalizeStateName(String state) => state.trim().toLowerCase();

String getStateCode(String state) {
  final normalized = normalizeStateName(state);
  if (normalized.isEmpty) return '';
  return indianStateCodes[normalized] ?? InvoiceConfig.defaults.stateCode;
}

String formatPlaceOfSupply(String state) {
  final code = getStateCode(state);
  final name = state.trim().isNotEmpty
      ? state.trim()
      : InvoiceConfig.defaults.stateName;
  return code.isNotEmpty ? '$code - $name' : name;
}

String formatCustomerAddress({
  required String fullAddress,
  required String landmark,
  required String city,
  required String state,
  required String pincode,
}) {
  final cityLine = [city, state, pincode]
      .where((part) => part.trim().isNotEmpty)
      .join(', ');
  final lines = [
    fullAddress.trim(),
    landmark.trim(),
    cityLine,
  ].where((line) => line.isNotEmpty).toList();
  return lines.isEmpty ? '—' : lines.join(', ');
}

class InclusiveGstSplit {
  const InclusiveGstSplit({
    required this.taxableValue,
    required this.gstAmount,
    required this.gstRate,
    required this.inclusive,
  });

  final double taxableValue;
  final double gstAmount;
  final double gstRate;
  final double inclusive;
}

InclusiveGstSplit splitInclusiveGst(
  num amount, [
  double gstRate = 18,
]) {
  final inclusive = roundMoney(amount.toDouble());
  final rate = gstRate;
  final taxableValue = roundMoney(inclusive / (1 + rate / 100));
  final gstAmount = roundMoney(inclusive - taxableValue);
  return InclusiveGstSplit(
    taxableValue: taxableValue,
    gstAmount: gstAmount,
    gstRate: rate,
    inclusive: inclusive,
  );
}

class InvoiceLineItem {
  const InvoiceLineItem({
    required this.srNo,
    required this.name,
    required this.hsn,
    required this.qty,
    required this.rate,
    required this.taxableValue,
    required this.gstRate,
    required this.gstAmount,
    required this.amount,
  });

  final int srNo;
  final String name;
  final String hsn;
  final int qty;
  final double rate;
  final double taxableValue;
  final double gstRate;
  final double gstAmount;
  final double amount;
}

List<InvoiceLineItem> buildInvoiceLineItems(
  List<OrderItem> items, [
  double gstRate = 18,
]) {
  final result = <InvoiceLineItem>[];
  for (var i = 0; i < items.length; i++) {
    final item = items[i];
    final qty = item.quantity;
    final rate = item.price;
    final inclusive = roundMoney(rate * qty);
    final split = splitInclusiveGst(inclusive, gstRate);
    result.add(
      InvoiceLineItem(
        srNo: i + 1,
        name: item.name.isNotEmpty ? item.name : 'Item',
        hsn: InvoiceConfig.defaults.defaultHsn,
        qty: qty,
        rate: rate,
        taxableValue: split.taxableValue,
        gstRate: split.gstRate,
        gstAmount: split.gstAmount,
        amount: split.inclusive,
      ),
    );
  }
  return result;
}

class InvoiceGstBreakdownRow {
  const InvoiceGstBreakdownRow({required this.label, required this.amount});

  final String label;
  final double amount;
}

class InvoiceTotals {
  const InvoiceTotals({
    required this.subTotal,
    required this.totalGst,
    required this.shippingTaxable,
    required this.shippingGst,
    required this.deliveryCharges,
    required this.gstBreakdown,
    required this.grandTotal,
    required this.intraState,
  });

  final double subTotal;
  final double totalGst;
  final double shippingTaxable;
  final double shippingGst;
  final double deliveryCharges;
  final List<InvoiceGstBreakdownRow> gstBreakdown;
  final double grandTotal;
  final bool intraState;
}

InvoiceTotals buildInvoiceTotals({
  required List<InvoiceLineItem> lineItems,
  required double deliveryCharges,
  String sellerState = 'Maharashtra',
  String customerState = '',
  double defaultGstRate = 18,
}) {
  final subTotal =
      roundMoney(lineItems.fold<double>(0, (sum, item) => sum + item.taxableValue));
  final totalGst =
      roundMoney(lineItems.fold<double>(0, (sum, item) => sum + item.gstAmount));
  final deliverySplit = splitInclusiveGst(deliveryCharges, defaultGstRate);
  final intraState = normalizeStateName(sellerState) ==
      normalizeStateName(
        customerState.trim().isEmpty ? sellerState : customerState,
      );

  final shippingTaxable = deliverySplit.taxableValue;
  final shippingGst = deliverySplit.gstAmount;
  final combinedGst = roundMoney(totalGst + shippingGst);

  final gstBreakdown = <InvoiceGstBreakdownRow>[];
  if (combinedGst > 0) {
    if (intraState) {
      gstBreakdown.add(
        InvoiceGstBreakdownRow(
          label: 'SGST ${defaultGstRate / 2}%',
          amount: roundMoney(combinedGst / 2),
        ),
      );
      gstBreakdown.add(
        InvoiceGstBreakdownRow(
          label: 'CGST ${defaultGstRate / 2}%',
          amount: roundMoney(combinedGst / 2),
        ),
      );
    } else {
      gstBreakdown.add(
        InvoiceGstBreakdownRow(
          label: 'IGST $defaultGstRate%',
          amount: combinedGst,
        ),
      );
    }
  }

  return InvoiceTotals(
    subTotal: subTotal,
    totalGst: totalGst,
    shippingTaxable: shippingTaxable,
    shippingGst: shippingGst,
    deliveryCharges: roundMoney(deliveryCharges),
    gstBreakdown: gstBreakdown,
    grandTotal: roundMoney(subTotal + combinedGst + shippingTaxable),
    intraState: intraState,
  );
}

class InvoiceAdvancePayment {
  const InvoiceAdvancePayment({
    required this.isAdvancePaid,
    required this.advancePaid,
    required this.remainingBalance,
    required this.remark,
  });

  final bool isAdvancePaid;
  final double advancePaid;
  final double remainingBalance;
  final String remark;
}

InvoiceAdvancePayment getInvoiceAdvancePaymentDetails(Order order) {
  final grandTotal = roundMoney(order.total);
  final isAdvancePaid = order.paymentStatus == 'paid_10';

  if (!isAdvancePaid) {
    return const InvoiceAdvancePayment(
      isAdvancePaid: false,
      advancePaid: 0,
      remainingBalance: 0,
      remark: '',
    );
  }

  final advancePaid = roundMoney(order.codAdvanceAmount);
  final remainingBalance =
      roundMoney((grandTotal - advancePaid).clamp(0, double.infinity));

  return InvoiceAdvancePayment(
    isAdvancePaid: true,
    advancePaid: advancePaid,
    remainingBalance: remainingBalance,
    remark:
        '10% advance amount of Rs. ${formatInvoiceAmount(advancePaid)} has been paid. Remaining balance of Rs. ${formatInvoiceAmount(remainingBalance)} is payable on delivery.',
  );
}

InvoiceConfig mergeInvoiceConfig(StoreSettings? storeSettings) {
  if (storeSettings == null) return InvoiceConfig.defaults;

  final enabled = storeSettings.enabledMerchantUpiAccounts;
  final upiId = storeSettings.merchantUpiId.trim().isNotEmpty
      ? storeSettings.merchantUpiId.trim()
      : (enabled.isNotEmpty ? enabled.first.upiId : '');
  final accountName = storeSettings.merchantUpiName.trim().isNotEmpty
      ? storeSettings.merchantUpiName.trim()
      : InvoiceConfig.defaults.bank.accountName;

  return InvoiceConfig(
    bank: InvoiceConfig.defaults.bank.copyWith(
      upiId: upiId,
      accountName: accountName,
    ),
  );
}

String getInvoiceOrderStatusLabel(String status) =>
    invoiceStatusLabels[status] ?? (status.isEmpty ? '—' : status);

String getInvoicePaymentStatusLabel(String paymentStatus) {
  switch (paymentStatus) {
    case 'paid_10':
      return '10% Paid';
    case 'paid':
      return 'Paid';
    case 'pending_verification':
      return 'Pending Verification';
    case 'refundable':
      return 'Refundable';
    default:
      return 'Unpaid';
  }
}

String getInvoicePaymentModeLabel(String paymentMethod) {
  if (paymentMethod == 'cod') return 'Cash';
  if (paymentMethod == 'online') return 'Online';
  return paymentMethod.isEmpty ? '—' : paymentMethod;
}

// --- Amount in words (Indian system) ---

const _ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const _tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

String _twoDigits(int num) {
  if (num < 20) return _ones[num];
  final ten = num ~/ 10;
  final one = num % 10;
  return '${_tens[ten]}${one > 0 ? ' ${_ones[one]}' : ''}'.trim();
}

String _threeDigits(int num) {
  if (num == 0) return '';
  if (num < 100) return _twoDigits(num);
  final hundred = num ~/ 100;
  final rest = num % 100;
  return '${_ones[hundred]} Hundred${rest > 0 ? ' ${_twoDigits(rest)}' : ''}'
      .trim();
}

String _convertIndianNumber(int num) {
  if (num == 0) return 'Zero';

  final crore = num ~/ 10000000;
  final lakh = (num % 10000000) ~/ 100000;
  final thousand = (num % 100000) ~/ 1000;
  final hundredPart = num % 1000;
  final parts = <String>[];

  if (crore > 0) parts.add('${_convertIndianNumber(crore)} Crore');
  if (lakh > 0) parts.add('${_twoDigits(lakh)} Lakh');
  if (thousand > 0) parts.add('${_twoDigits(thousand)} Thousand');
  if (hundredPart > 0) parts.add(_threeDigits(hundredPart));

  return parts.join(' ').trim();
}

String amountInWords(num amount) {
  final value = roundMoney(amount.toDouble());
  final rupees = value.floor();
  final paise = ((value - rupees) * 100).round();

  var words = '${_convertIndianNumber(rupees)} Rupees';
  if (paise > 0) {
    words += ' and ${_convertIndianNumber(paise)} Paise';
  }
  return '$words Only';
}
