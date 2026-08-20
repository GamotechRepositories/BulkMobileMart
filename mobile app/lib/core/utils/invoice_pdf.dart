import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../models/order.dart';
import '../../models/store_settings.dart';
import '../../models/user.dart';
import '../utils/invoice_calculations.dart';
import '../utils/order_number.dart';

Future<Uint8List?> _loadInvoiceLogoBytes() async {
  try {
    final dio = Dio();
    for (final url in [invoiceLogoUrl, invoiceLogoFallbackUrl]) {
      final response = await dio.get<List<int>>(
        url,
        options: Options(responseType: ResponseType.bytes),
      );
      final data = response.data;
      if (data != null && data.isNotEmpty) {
        return Uint8List.fromList(data);
      }
    }
  } catch (_) {}
  return null;
}

Future<Uint8List> generateInvoicePdf(
  Order order, {
  User? user,
  StoreSettings? storeSettings,
}) async {
  final config = mergeInvoiceConfig(storeSettings);
  final orderNo = getOrderNumber(order);
  final addr = order.deliveryAddress;
  final customerName = addr.fullName.trim().isNotEmpty
      ? addr.fullName.trim()
      : (user?.name.trim().isNotEmpty == true ? user!.name.trim() : '—');
  final phone = addr.number.trim().isNotEmpty
      ? addr.number.trim()
      : (user?.phone.trim() ?? '');
  final lineItems = buildInvoiceLineItems(order.items);
  final totals = buildInvoiceTotalsForOrder(
    order,
    lineItems,
    sellerState: config.stateName,
    customerState: addr.state,
  );
  final grandTotal = totals.grandTotal;
  final advancePayment = getInvoiceAdvancePaymentDetails(order);
  final isAttempted = order.status == 'attempted';
  final documentTitle = isAttempted ? 'ATTEMPTED ORDER' : 'INVOICE';
  final invoiceNo = isAttempted ? 'ATT-$orderNo' : 'INV-$orderNo';
  final logoBytes = await _loadInvoiceLogoBytes();
  pw.ImageProvider? logoImage;
  if (logoBytes != null) {
    logoImage = pw.MemoryImage(logoBytes);
  }

  final metaRows = [
    [isAttempted ? 'Document No' : 'Invoice No', invoiceNo],
    ['Order No', orderNo],
    ['Order Status', getInvoiceOrderStatusLabel(order.status)],
    ['Payment Mode', getInvoicePaymentModeLabel(order.paymentMethod)],
    ['Place of Supply', formatPlaceOfSupply(addr.state)],
    ['Invoice Date', formatInvoiceDate(DateTime.now())],
    ['Order Date', formatInvoiceDate(order.createdAt)],
    ['Payment Status', getInvoicePaymentStatusLabel(order.paymentStatus)],
  ];

  final bankRows = [
    ['Bank', config.bank.name],
    ['IFSC Code', config.bank.ifsc],
    ['Account Name', config.bank.accountName],
    [
      'Account No',
      config.bank.accountNumber.isEmpty ? '—' : config.bank.accountNumber,
    ],
    ['UPI ID', config.bank.upiId.isEmpty ? '—' : config.bank.upiId],
  ];

  final borderColor = PdfColor.fromInt(0xFFD1D5DB);
  final rowBorder = PdfColor.fromInt(0xFFE5E7EB);
  final sectionBg = PdfColor.fromInt(0xFFF8FAFC);
  final textColor = PdfColor.fromInt(0xFF111827);

  final doc = pw.Document();
  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(16),
      build: (context) => [
        pw.Column(
          children: [
            if (logoImage != null)
              pw.Center(
                child: pw.Image(logoImage, width: 130, height: 30, fit: pw.BoxFit.contain),
              )
            else
              pw.Center(
                child: pw.Text(
                  config.companyName,
                  style: pw.TextStyle(
                    fontSize: 14,
                    fontWeight: pw.FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ),
            pw.SizedBox(height: 4),
            pw.Text(
              config.tagline,
              textAlign: pw.TextAlign.center,
              style: pw.TextStyle(fontSize: 9, color: textColor),
            ),
            pw.SizedBox(height: 2),
            pw.Text(
              [
                'By: ${config.legalEntity}',
                'Email: ${config.email}',
                'State Code: ${config.stateCode}',
              ].join(' | '),
              textAlign: pw.TextAlign.center,
              style: pw.TextStyle(fontSize: 8, color: textColor),
            ),
          ],
        ),
        pw.SizedBox(height: 6),
        pw.Container(
          width: double.infinity,
          padding: const pw.EdgeInsets.only(top: 5),
          decoration: pw.BoxDecoration(
            border: pw.Border(top: pw.BorderSide(color: borderColor)),
          ),
          child: pw.Text(
            documentTitle,
            textAlign: pw.TextAlign.center,
            style: pw.TextStyle(
              fontSize: 11,
              fontWeight: pw.FontWeight.bold,
              color: textColor,
              letterSpacing: 1.4,
            ),
          ),
        ),
        if (isAttempted) ...[
          pw.SizedBox(height: 6),
          pw.Container(
            width: double.infinity,
            padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: pw.BoxDecoration(
              color: PdfColor.fromInt(0xFFFFF7ED),
              border: pw.Border.all(color: PdfColor.fromInt(0xFFFDBA74)),
            ),
            child: pw.Text(
              'Status: Attempted — checkout was not completed. This is not a final invoice.',
              textAlign: pw.TextAlign.center,
              style: pw.TextStyle(
                fontSize: 8,
                fontWeight: pw.FontWeight.bold,
                color: PdfColor.fromInt(0xFF9A3412),
              ),
            ),
          ),
        ],
        pw.SizedBox(height: 6),
        _pdfBlock(
          title: 'Invoice Detail',
          borderColor: borderColor,
          sectionBg: sectionBg,
          child: pw.Column(
            children: [
              for (var i = 0; i < metaRows.length; i++)
                _pdfInfoRow(
                  metaRows[i][0],
                  metaRows[i][1],
                  borderColor: rowBorder,
                  showBottom: i < metaRows.length - 1,
                  textColor: textColor,
                ),
            ],
          ),
        ),
        _pdfBlock(
          title: 'Bill To',
          borderColor: borderColor,
          sectionBg: sectionBg,
          child: pw.Padding(
            padding: const pw.EdgeInsets.all(6),
            child: pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  customerName,
                  style: pw.TextStyle(
                    fontWeight: pw.FontWeight.bold,
                    fontSize: 9,
                    color: textColor,
                  ),
                ),
                if (addr.shopName.trim().isNotEmpty)
                  pw.Text(addr.shopName, style: pw.TextStyle(fontSize: 9, color: textColor)),
                if (phone.isNotEmpty)
                  pw.Text(phone, style: pw.TextStyle(fontSize: 9, color: textColor)),
                pw.Text(
                  formatCustomerAddress(
                    fullAddress: addr.fullAddress,
                    landmark: addr.landmark,
                    city: addr.city,
                    state: addr.state,
                    pincode: addr.pincode,
                  ),
                  style: pw.TextStyle(fontSize: 9, color: textColor),
                ),
              ],
            ),
          ),
        ),
        _pdfBlock(
          title: 'Order Detail',
          borderColor: borderColor,
          sectionBg: sectionBg,
          child: pw.Column(
            children: [
              pw.Container(
                color: sectionBg,
                padding: const pw.EdgeInsets.symmetric(vertical: 4),
                child: pw.Row(
                  children: [
                    _pdfCell('Sr No', 0.07, bold: true, align: pw.TextAlign.center),
                    _pdfCell('Product Name', 0.45, bold: true),
                    _pdfCell('Qty', 0.08, bold: true, align: pw.TextAlign.center),
                    _pdfCell('Rate', 0.18, bold: true, align: pw.TextAlign.right),
                    _pdfCell('Amount', 0.22, bold: true, align: pw.TextAlign.right),
                  ],
                ),
              ),
              for (var i = 0; i < lineItems.length; i++)
                pw.Container(
                  decoration: pw.BoxDecoration(
                    border: i < lineItems.length - 1
                        ? pw.Border(bottom: pw.BorderSide(color: rowBorder))
                        : null,
                  ),
                  padding: const pw.EdgeInsets.symmetric(vertical: 4),
                  child: pw.Row(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      _pdfCell('${lineItems[i].srNo}', 0.07, align: pw.TextAlign.center),
                      _pdfCell(lineItems[i].name, 0.45),
                      _pdfCell('${lineItems[i].qty}', 0.08, align: pw.TextAlign.center),
                      _pdfCell(
                        formatInvoiceMoney(lineItems[i].rate),
                        0.18,
                        align: pw.TextAlign.right,
                      ),
                      _pdfCell(
                        formatInvoiceMoney(lineItems[i].amount),
                        0.22,
                        align: pw.TextAlign.right,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        pw.Container(
          decoration: pw.BoxDecoration(
            border: pw.Border.all(color: borderColor),
          ),
          child: pw.Column(
            children: [
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Expanded(
                    flex: 68,
                    child: pw.Padding(
                      padding: const pw.EdgeInsets.all(6),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'Bank Details:',
                            style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold,
                              fontSize: 9,
                              color: textColor,
                            ),
                          ),
                          pw.SizedBox(height: 4),
                          for (final row in bankRows)
                            pw.Padding(
                              padding: const pw.EdgeInsets.only(bottom: 2),
                              child: pw.Text(
                                '${row[0]}: ${row[1]}',
                                style: pw.TextStyle(fontSize: 8, color: textColor),
                              ),
                            ),
                          pw.SizedBox(height: 6),
                          pw.Text(
                            'This is a computer generated invoice. Reverse Charge: No',
                            style: pw.TextStyle(fontSize: 8, color: textColor),
                          ),
                          if (advancePayment.isAdvancePaid) ...[
                            pw.SizedBox(height: 6),
                            pw.Text(
                              'Remarks: ${advancePayment.remark}',
                              style: pw.TextStyle(fontSize: 8, color: textColor),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                  pw.Expanded(
                    flex: 32,
                    child: pw.Container(
                      decoration: pw.BoxDecoration(
                        border: pw.Border(left: pw.BorderSide(color: borderColor)),
                      ),
                      child: pw.Column(
                        children: [
                          _pdfSummaryRow(
                            'Sub Total',
                            formatInvoiceMoney(totals.subTotal),
                            borderColor: rowBorder,
                            textColor: textColor,
                          ),
                          if (totals.couponDiscount > 0)
                            _pdfSummaryRow(
                              order.couponCode.trim().isNotEmpty
                                  ? 'Less: Coupon (${order.couponCode.trim()})'
                                  : 'Less: Coupon',
                              '- ${formatInvoiceMoney(totals.couponDiscount)}',
                              borderColor: rowBorder,
                              textColor: textColor,
                            ),
                          _pdfSummaryRow(
                            'Shipping Charges',
                            totals.deliveryCharges == 0
                                ? 'Free'
                                : formatInvoiceMoney(totals.deliveryCharges),
                            borderColor: rowBorder,
                            textColor: textColor,
                          ),
                          _pdfSummaryRow(
                            'Total Amount',
                            formatInvoiceMoney(grandTotal),
                            borderColor: rowBorder,
                            textColor: textColor,
                            highlight: true,
                            sectionBg: sectionBg,
                          ),
                          if (advancePayment.isAdvancePaid) ...[
                            _pdfSummaryRow(
                              'Advance Paid (10%)',
                              formatInvoiceMoney(advancePayment.advancePaid),
                              borderColor: rowBorder,
                              textColor: textColor,
                            ),
                            _pdfSummaryRow(
                              'Balance Due on Delivery',
                              formatInvoiceMoney(advancePayment.remainingBalance),
                              borderColor: rowBorder,
                              textColor: textColor,
                              highlight: true,
                              sectionBg: sectionBg,
                              showBottom: false,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(6),
                decoration: pw.BoxDecoration(
                  border: pw.Border(top: pw.BorderSide(color: borderColor)),
                ),
                child: pw.Text(
                  'Amount in Words: ${amountInWords(grandTotal)}',
                  style: pw.TextStyle(fontSize: 9, color: textColor),
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  return doc.save();
}

pw.Widget _pdfBlock({
  required String title,
  required PdfColor borderColor,
  required PdfColor sectionBg,
  required pw.Widget child,
}) {
  return pw.Container(
    margin: const pw.EdgeInsets.only(bottom: 6),
    decoration: pw.BoxDecoration(
      border: pw.Border.all(color: borderColor),
    ),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.stretch,
      children: [
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(vertical: 4, horizontal: 6),
          decoration: pw.BoxDecoration(
            color: sectionBg,
            border: pw.Border(bottom: pw.BorderSide(color: borderColor)),
          ),
          child: pw.Text(
            title,
            textAlign: pw.TextAlign.center,
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
          ),
        ),
        child,
      ],
    ),
  );
}

pw.Widget _pdfInfoRow(
  String label,
  String value, {
  required PdfColor borderColor,
  required PdfColor textColor,
  bool showBottom = true,
}) {
  return pw.Container(
    decoration: pw.BoxDecoration(
      border: showBottom ? pw.Border(bottom: pw.BorderSide(color: borderColor)) : null,
    ),
    child: pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Container(
          width: 120,
          padding: const pw.EdgeInsets.all(4),
          decoration: pw.BoxDecoration(
            border: pw.Border(right: pw.BorderSide(color: borderColor)),
          ),
          child: pw.Text(
            label,
            style: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              fontSize: 8,
              color: textColor,
            ),
          ),
        ),
        pw.Expanded(
          child: pw.Padding(
            padding: const pw.EdgeInsets.all(4),
            child: pw.Text(value, style: pw.TextStyle(fontSize: 8, color: textColor)),
          ),
        ),
      ],
    ),
  );
}

pw.Widget _pdfCell(
  String text,
  double flex, {
  bool bold = false,
  pw.TextAlign align = pw.TextAlign.left,
}) {
  return pw.Expanded(
    flex: (flex * 100).round(),
    child: pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 4),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(
          fontSize: 8,
          fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
        ),
      ),
    ),
  );
}

pw.Widget _pdfSummaryRow(
  String label,
  String value, {
  required PdfColor borderColor,
  required PdfColor textColor,
  bool highlight = false,
  PdfColor? sectionBg,
  bool showBottom = true,
}) {
  return pw.Container(
    decoration: pw.BoxDecoration(
      color: highlight ? sectionBg : null,
      border: showBottom ? pw.Border(bottom: pw.BorderSide(color: borderColor)) : null,
    ),
    child: pw.Row(
      children: [
        pw.Expanded(
          flex: 58,
          child: pw.Container(
            padding: const pw.EdgeInsets.all(4),
            decoration: pw.BoxDecoration(
              border: pw.Border(right: pw.BorderSide(color: borderColor)),
            ),
            child: pw.Text(
              label,
              style: pw.TextStyle(
                fontSize: 8,
                fontWeight: pw.FontWeight.bold,
                color: textColor,
              ),
            ),
          ),
        ),
        pw.Expanded(
          flex: 42,
          child: pw.Padding(
            padding: const pw.EdgeInsets.all(4),
            child: pw.Text(
              value,
              textAlign: pw.TextAlign.right,
              style: pw.TextStyle(
                fontSize: 8,
                fontWeight: highlight ? pw.FontWeight.bold : pw.FontWeight.normal,
                color: textColor,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
