import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/providers/app_providers.dart';
import '../../core/utils/invoice_calculations.dart';
import '../../core/utils/invoice_pdf.dart';
import '../../core/utils/order_number.dart';
import '../../features/auth/auth_controller.dart';
import '../../features/settings/store_settings_provider.dart';
import '../../models/order.dart';
import '../../models/store_settings.dart';
import '../../models/user.dart';
import '../../routes/route_paths.dart';
import '../../widgets/common/skeleton_loaders.dart';

const _border = Color(0xFFD1D5DB);
const _rowBorder = Color(0xFFE5E7EB);
const _sectionBg = Color(0xFFF8FAFC);
const _text = Color(0xFF111827);
const _pageBg = Color(0xFFECECEC);

class OrderInvoiceScreen extends ConsumerStatefulWidget {
  const OrderInvoiceScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderInvoiceScreen> createState() => _OrderInvoiceScreenState();
}

class _OrderInvoiceScreenState extends ConsumerState<OrderInvoiceScreen> {
  Order? _order;
  bool _loading = true;
  bool _downloadingPdf = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadOrder);
  }

  Future<void> _loadOrder() async {
    if (!ref.read(authControllerProvider).isLoggedIn) {
      setState(() => _loading = false);
      return;
    }

    try {
      final order =
          await ref.read(apiServiceProvider).fetchOrderById(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Order not found';
        _loading = false;
      });
    }
  }

  void _shareInvoice() {
    final order = _order;
    final user = ref.read(authControllerProvider).user;
    final storeSettings = ref.read(storeSettingsProvider).value;
    if (order == null) return;

    final snapshot = _InvoiceSnapshot.from(
      order: order,
      user: user,
      storeSettings: storeSettings,
    );

    final buffer = StringBuffer()
      ..writeln('BulkMobileMart TAX INVOICE')
      ..writeln('Invoice No: ${snapshot.invoiceNo}')
      ..writeln('Order No: ${snapshot.orderNo}')
      ..writeln('Date: ${snapshot.orderDate}')
      ..writeln('Status: ${snapshot.orderStatus}')
      ..writeln('Payment: ${snapshot.paymentStatus}')
      ..writeln()
      ..writeln('Bill To: ${snapshot.customerName}')
      ..writeln(snapshot.addressLine)
      ..writeln('GST No: ${snapshot.customerGst}')
      ..writeln()
      ..writeln('Items:');

    for (final item in snapshot.lineItems) {
      buffer.writeln(
        '${item.srNo}. ${item.name} x${item.qty} = ${formatInvoiceMoney(item.amount)}',
      );
    }

    buffer
      ..writeln()
      ..writeln('Sub Total: ${formatInvoiceMoney(snapshot.totals.subTotal)}');
    for (final row in snapshot.totals.gstBreakdown) {
      buffer.writeln('${row.label}: ${formatInvoiceMoney(row.amount)}');
    }
    buffer.writeln(
      'Shipping: ${snapshot.totals.deliveryCharges == 0 ? 'Free' : formatInvoiceMoney(snapshot.totals.deliveryCharges)}',
    );
    if (snapshot.totals.couponDiscount > 0) {
      buffer.writeln(
        'Coupon Discount${snapshot.couponCode.isNotEmpty ? ' (${snapshot.couponCode})' : ''}: -${formatInvoiceMoney(snapshot.totals.couponDiscount)}',
      );
    }
    buffer
      ..writeln('Total: ${formatInvoiceMoney(snapshot.grandTotal)}')
      ..writeln()
      ..writeln('Amount in Words: ${amountInWords(snapshot.grandTotal)}')
      ..writeln()
      ..writeln('Thank you for shopping with BulkMobileMart!');

    SharePlus.instance.share(ShareParams(text: buffer.toString()));
  }

  Future<void> _downloadPdf() async {
    final order = _order;
    if (order == null || _downloadingPdf) return;

    setState(() => _downloadingPdf = true);
    try {
      final user = ref.read(authControllerProvider).user;
      final storeSettings = ref.read(storeSettingsProvider).value;
      final bytes = await generateInvoicePdf(
        order,
        user: user,
        storeSettings: storeSettings,
      );
      final dir = await getTemporaryDirectory();
      final path = '${dir.path}/${getInvoiceFilename(order)}';
      final file = File(path);
      await file.writeAsBytes(bytes);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(path)],
          text: 'BulkMobileMart Invoice #${getOrderNumber(order)}',
        ),
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to generate PDF')),
        );
      }
    } finally {
      if (mounted) setState(() => _downloadingPdf = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final storeSettings = ref.watch(storeSettingsProvider).value;
    final isAttempted = _order?.status == 'attempted';
    final appBarTitle = isAttempted ? 'Attempted Order' : 'Tax Invoice';

    if (!auth.isLoggedIn) {
      return Scaffold(
        appBar: AppBar(title: Text(appBarTitle)),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Please login to view invoice.'),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () =>
                      ref.read(authControllerProvider.notifier).openAuthModal(),
                  child: const Text('Login / Sign Up'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: _pageBg,
      appBar: AppBar(
        title: Text(appBarTitle),
        actions: [
          if (_order != null) ...[
            IconButton(
              onPressed: _downloadingPdf ? null : _downloadPdf,
              icon: _downloadingPdf
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.picture_as_pdf_outlined),
              tooltip: 'Download PDF',
            ),
            IconButton(
              onPressed: _shareInvoice,
              icon: const Icon(Icons.share_outlined),
              tooltip: 'Share invoice',
            ),
          ],
        ],
      ),
      body: _loading
          ? const SkeletonInvoicePage()
          : _error != null || _order == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error ?? 'Order not found'),
                      TextButton(
                        onPressed: () => context.go(RoutePaths.orders),
                        child: const Text('← Back to My Orders'),
                      ),
                    ],
                  ),
                )
              : _TaxInvoiceDocument(
                  snapshot: _InvoiceSnapshot.from(
                    order: _order!,
                    user: auth.user,
                    storeSettings: storeSettings,
                  ),
                ),
    );
  }
}

class _InvoiceSnapshot {
  const _InvoiceSnapshot({
    required this.config,
    required this.orderNo,
    required this.invoiceNo,
    required this.customerName,
    required this.customerGst,
    required this.phone,
    required this.shopName,
    required this.addressLine,
    required this.orderStatus,
    required this.paymentMode,
    required this.placeOfSupply,
    required this.invoiceDate,
    required this.orderDate,
    required this.paymentStatus,
    required this.lineItems,
    required this.totals,
    required this.grandTotal,
    required this.advancePayment,
    required this.isAttempted,
    this.couponCode = '',
  });

  final InvoiceConfig config;
  final String orderNo;
  final String invoiceNo;
  final String customerName;
  final String customerGst;
  final String phone;
  final String shopName;
  final String addressLine;
  final String orderStatus;
  final String paymentMode;
  final String placeOfSupply;
  final String invoiceDate;
  final String orderDate;
  final String paymentStatus;
  final List<InvoiceLineItem> lineItems;
  final InvoiceTotals totals;
  final double grandTotal;
  final InvoiceAdvancePayment advancePayment;
  final bool isAttempted;
  final String couponCode;

  String get documentTitle =>
      isAttempted ? 'ATTEMPTED ORDER' : 'TAX INVOICE';

  factory _InvoiceSnapshot.from({
    required Order order,
    User? user,
    StoreSettings? storeSettings,
  }) {
    final config = mergeInvoiceConfig(storeSettings);
    final orderNo = getOrderNumber(order);
    final isAttempted = order.status == 'attempted';
    final addr = order.deliveryAddress;
    final lineItems = buildInvoiceLineItems(order.items);
    final totals = buildInvoiceTotals(
      lineItems: lineItems,
      deliveryCharges: order.deliveryCharges,
      couponDiscount: order.couponDiscount,
      sellerState: config.stateName,
      customerState: addr.state,
    );

    return _InvoiceSnapshot(
      config: config,
      orderNo: orderNo,
      invoiceNo: isAttempted ? 'ATT-$orderNo' : 'INV-$orderNo',
      customerName: addr.fullName.trim().isNotEmpty
          ? addr.fullName.trim()
          : (user?.name.trim().isNotEmpty == true ? user!.name.trim() : '—'),
      customerGst: (user?.gstNumber.trim().isNotEmpty == true)
          ? user!.gstNumber.trim()
          : 'URP',
      phone: addr.number.trim().isNotEmpty
          ? addr.number.trim()
          : (user?.phone.trim() ?? ''),
      shopName: addr.shopName.trim(),
      addressLine: formatCustomerAddress(
        fullAddress: addr.fullAddress,
        landmark: addr.landmark,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
      ),
      orderStatus: getInvoiceOrderStatusLabel(order.status),
      paymentMode: getInvoicePaymentModeLabel(order.paymentMethod),
      placeOfSupply: formatPlaceOfSupply(addr.state),
      invoiceDate: formatInvoiceDate(DateTime.now()),
      orderDate: formatInvoiceDate(order.createdAt),
      paymentStatus: getInvoicePaymentStatusLabel(order.paymentStatus),
      lineItems: lineItems,
      totals: totals,
      grandTotal: order.total,
      advancePayment: getInvoiceAdvancePaymentDetails(order),
      isAttempted: isAttempted,
      couponCode: order.couponCode.trim(),
    );
  }
}

class _TaxInvoiceDocument extends StatelessWidget {
  const _TaxInvoiceDocument({required this.snapshot});

  final _InvoiceSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final metaRows = [
      [snapshot.isAttempted ? 'Document No' : 'Invoice No', snapshot.invoiceNo],
      ['Order No', snapshot.orderNo],
      ['Order Status', snapshot.orderStatus],
      ['Payment Mode', snapshot.paymentMode],
      ['Place of Supply', snapshot.placeOfSupply],
      ['Invoice Date', snapshot.invoiceDate],
      ['Order Date', snapshot.orderDate],
      ['Payment Status', snapshot.paymentStatus],
    ];

    final bankRows = [
      ['Bank', snapshot.config.bank.name],
      ['IFSC Code', snapshot.config.bank.ifsc],
      ['Account Name', snapshot.config.bank.accountName],
      [
        'Account No',
        snapshot.config.bank.accountNumber.isEmpty
            ? '—'
            : snapshot.config.bank.accountNumber,
      ],
      [
        'UPI ID',
        snapshot.config.bank.upiId.isEmpty ? '—' : snapshot.config.bank.upiId,
      ],
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(6, 8, 6, 24),
      children: [
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: _border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 3,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          padding: const EdgeInsets.all(6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Header(config: snapshot.config),
              const SizedBox(height: 8),
              const Divider(height: 1, color: _border),
              Padding(
                padding: const EdgeInsets.only(top: 6, bottom: 8),
                child: Text(
                  snapshot.documentTitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 2.2,
                    color: _text,
                  ),
                ),
              ),
              if (snapshot.isAttempted) ...[
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    border: Border.all(color: const Color(0xFFFDBA74)),
                  ),
                  child: const Text(
                    'Status: Attempted — checkout was not completed. This is not a tax invoice.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF9A3412),
                      height: 1.35,
                    ),
                  ),
                ),
              ],
              _Section(
                title: 'Invoice Detail',
                child: Column(
                  children: [
                    for (var i = 0; i < metaRows.length; i++)
                      _InfoRow(
                        label: metaRows[i][0],
                        value: metaRows[i][1],
                        showBottom: i < metaRows.length - 1,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              _Section(
                title: 'Bill To',
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        snapshot.customerName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: _text,
                        ),
                      ),
                      if (snapshot.shopName.isNotEmpty)
                        Text(snapshot.shopName, style: _bodyStyle),
                      if (snapshot.phone.isNotEmpty)
                        Text(snapshot.phone, style: _bodyStyle),
                      Text(snapshot.addressLine, style: _bodyStyle),
                      Text(
                        'GST No: ${snapshot.customerGst}',
                        style: _bodyStyle.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 6),
              _Section(
                title: 'Order Detail',
                child: Column(
                  children: [
                    Container(
                      color: _sectionBg,
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: const Row(
                        children: [
                          _TableHead('Sr No', flex: 7, align: TextAlign.center),
                          _TableHead('Product Name', flex: 45),
                          _TableHead('Qty', flex: 8, align: TextAlign.center),
                          _TableHead('Rate', flex: 18, align: TextAlign.right),
                          _TableHead('Amount', flex: 22, align: TextAlign.right),
                        ],
                      ),
                    ),
                    for (var i = 0; i < snapshot.lineItems.length; i++)
                      Container(
                        decoration: BoxDecoration(
                          border: i < snapshot.lineItems.length - 1
                              ? const Border(
                                  bottom: BorderSide(color: _rowBorder),
                                )
                              : null,
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _TableCell(
                              '${snapshot.lineItems[i].srNo}',
                              flex: 7,
                              align: TextAlign.center,
                            ),
                            _TableCell(snapshot.lineItems[i].name, flex: 45),
                            _TableCell(
                              '${snapshot.lineItems[i].qty}',
                              flex: 8,
                              align: TextAlign.center,
                            ),
                            _TableCell(
                              formatInvoiceAmount(snapshot.lineItems[i].rate),
                              flex: 18,
                              align: TextAlign.right,
                            ),
                            _TableCell(
                              formatInvoiceAmount(snapshot.lineItems[i].amount),
                              flex: 22,
                              align: TextAlign.right,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(border: Border.all(color: _border)),
                child: Column(
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        border: Border(bottom: BorderSide(color: _border)),
                      ),
                      child: Text.rich(
                        TextSpan(
                          style: _bodyStyle,
                          children: [
                            const TextSpan(
                              text: 'Amount in Words: ',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                            TextSpan(text: amountInWords(snapshot.grandTotal)),
                          ],
                        ),
                      ),
                    ),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final narrow = constraints.maxWidth < 520;
                        final bank = _BankNotes(
                          bankRows: bankRows,
                          advanceRemark: snapshot.advancePayment.isAdvancePaid
                              ? snapshot.advancePayment.remark
                              : null,
                        );
                        final summary = _SummaryTable(snapshot: snapshot);
                        if (narrow) {
                          return Column(
                            children: [
                              bank,
                              Container(
                                decoration: const BoxDecoration(
                                  border: Border(
                                    top: BorderSide(color: _border),
                                  ),
                                ),
                                child: summary,
                              ),
                            ],
                          );
                        }
                        return IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Expanded(flex: 68, child: bank),
                              Expanded(
                                flex: 32,
                                child: Container(
                                  decoration: const BoxDecoration(
                                    border: Border(
                                      left: BorderSide(color: _border),
                                    ),
                                  ),
                                  child: summary,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

const _bodyStyle = TextStyle(fontSize: 11, height: 1.35, color: _text);

class _Header extends StatelessWidget {
  const _Header({required this.config});

  final InvoiceConfig config;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CachedNetworkImage(
          imageUrl: invoiceLogoUrl,
          height: 36,
          fit: BoxFit.contain,
          errorWidget: (context, url, error) => Text(
            config.companyName,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: _text,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          config.tagline,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 11, color: _text),
        ),
        const SizedBox(height: 2),
        Text(
          [
            'By: ${config.legalEntity}',
            'Email: ${config.email}',
            if (config.gstNumber.isNotEmpty) 'GST No: ${config.gstNumber}',
            'State Code: ${config.stateCode}',
          ].join(' | '),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 10, color: _text, height: 1.35),
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(border: Border.all(color: _border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
            decoration: const BoxDecoration(
              color: _sectionBg,
              border: Border(bottom: BorderSide(color: _border)),
            ),
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 11,
                color: _text,
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
    this.showBottom = true,
  });

  final String label;
  final String value;
  final bool showBottom;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: showBottom
            ? const Border(bottom: BorderSide(color: _rowBorder))
            : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                border: Border(right: BorderSide(color: _rowBorder)),
              ),
              child: Text(
                label,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                  color: _text,
                ),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Text(value, style: _bodyStyle),
            ),
          ),
        ],
      ),
    );
  }
}

class _TableHead extends StatelessWidget {
  const _TableHead(this.text, {required this.flex, this.align = TextAlign.left});

  final String text;
  final int flex;
  final TextAlign align;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: flex,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Text(
          text,
          textAlign: align,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 10,
            color: _text,
          ),
        ),
      ),
    );
  }
}

class _TableCell extends StatelessWidget {
  const _TableCell(
    this.text, {
    required this.flex,
    this.align = TextAlign.left,
  });

  final String text;
  final int flex;
  final TextAlign align;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: flex,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Text(text, textAlign: align, style: _bodyStyle),
      ),
    );
  }
}

class _BankNotes extends StatelessWidget {
  const _BankNotes({required this.bankRows, this.advanceRemark});

  final List<List<String>> bankRows;
  final String? advanceRemark;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bank Details:',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 11,
              color: _text,
            ),
          ),
          const SizedBox(height: 4),
          for (final row in bankRows)
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text.rich(
                TextSpan(
                  style: _bodyStyle,
                  children: [
                    TextSpan(
                      text: '${row[0]}: ',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    TextSpan(text: row[1]),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 8),
          const Text(
            'This is a computer generated invoice. Reverse Charge: No',
            style: TextStyle(fontSize: 10, color: _text, height: 1.35),
          ),
          if (advanceRemark != null) ...[
            const SizedBox(height: 8),
            Text.rich(
              TextSpan(
                style: _bodyStyle,
                children: [
                  const TextSpan(
                    text: 'Remarks: ',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: advanceRemark),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SummaryTable extends StatelessWidget {
  const _SummaryTable({required this.snapshot});

  final _InvoiceSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final rows = <({String label, String value, bool highlight})>[
      (
        label: 'Sub Total',
        value: formatInvoiceAmount(snapshot.totals.subTotal),
        highlight: false,
      ),
      for (final row in snapshot.totals.gstBreakdown)
        (
          label: row.label,
          value: formatInvoiceAmount(row.amount),
          highlight: false,
        ),
      (
        label: 'Shipping Charges',
        value: snapshot.totals.deliveryCharges == 0
            ? 'Free'
            : formatInvoiceAmount(snapshot.totals.deliveryCharges),
        highlight: false,
      ),
      if (snapshot.totals.couponDiscount > 0)
        (
          label: snapshot.couponCode.isNotEmpty
              ? 'Coupon Discount (${snapshot.couponCode})'
              : 'Coupon Discount',
          value: '-${formatInvoiceAmount(snapshot.totals.couponDiscount)}',
          highlight: false,
        ),
      (
        label: 'Total Amount',
        value: formatInvoiceAmount(snapshot.grandTotal),
        highlight: true,
      ),
      if (snapshot.advancePayment.isAdvancePaid) ...[
        (
          label: 'Advance Paid (10%)',
          value: formatInvoiceAmount(snapshot.advancePayment.advancePaid),
          highlight: false,
        ),
        (
          label: 'Balance Due on Delivery',
          value: formatInvoiceAmount(snapshot.advancePayment.remainingBalance),
          highlight: true,
        ),
      ],
    ];

    return Column(
      children: [
        for (var i = 0; i < rows.length; i++)
          Container(
            decoration: BoxDecoration(
              color: rows[i].highlight ? _sectionBg : null,
              border: i < rows.length - 1
                  ? const Border(bottom: BorderSide(color: _rowBorder))
                  : null,
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 58,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      border: Border(right: BorderSide(color: _border)),
                    ),
                    child: Text(
                      rows[i].label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: _text,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  flex: 42,
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Text(
                      rows[i].value,
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: rows[i].highlight
                            ? FontWeight.w700
                            : FontWeight.w500,
                        color: _text,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
